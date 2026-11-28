import { Injectable, OnApplicationShutdown, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Admin, Consumer, Kafka, KafkaMessage, Producer, logLevel } from 'kafkajs';
import { Counter, register } from '@prometheus-io/client';

export type DlqHandler = (payload: unknown) => Promise<void>;

interface HandlerEntry {
  handler: DlqHandler;
  onPermanentFailure?: DlqHandler;
}

export const DLQ_TOPIC_EVENTS = 'dlq.events';
export const DLQ_TOPIC_DEAD = 'dlq.dead';

const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 10_000;
const CONSUMER_GROUP = 'nestjs-dlq';
const DLQ_METRIC_NAME = 'dlq_message_outcomes_total';

function h(val: Buffer | string | (Buffer | string)[] | null | undefined): string {
  if (!val) return '';
  if (Array.isArray(val)) return h(val[0]);
  return Buffer.isBuffer(val) ? val.toString() : val;
}

@Injectable()
export class DlqService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private readonly handlers = new Map<string, HandlerEntry>();
  private readonly outcomesCounter: Counter<string>;

  private kafka!: Kafka;
  private producer!: Producer;
  private consumer!: Consumer;
  private admin!: Admin;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    const existing = register.getSingleMetric(DLQ_METRIC_NAME);
    this.outcomesCounter = existing
      ? (existing as unknown as Counter<string>)
      : new Counter({
          name: DLQ_METRIC_NAME,
          help: 'DLQ message outcomes (pushed, retry, recovered, dead)',
          labelNames: ['handler', 'outcome'],
        });
  }

  async onModuleInit(): Promise<void> {
    const brokers: string[] = this.config.get<string[]>('kafka.brokers') ?? ['localhost:9092'];
    const clientId: string = this.config.get<string>('kafka.clientId') ?? 'nestjs-backend';

    this.kafka = new Kafka({
      clientId: `${clientId}-dlq`,
      brokers,
      logLevel: logLevel.WARN,
    });

    this.admin = this.kafka.admin();
    this.producer = this.kafka.producer({ allowAutoTopicCreation: false });
    this.consumer = this.kafka.consumer({ groupId: CONSUMER_GROUP });

    try {
      await this.admin.connect();
      await this.ensureTopics();
      await this.admin.disconnect();

      await this.producer.connect();
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: DLQ_TOPIC_EVENTS, fromBeginning: false });
      await this.consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          await this.processMessage(topic, partition, message);
        },
      });

      this.connected = true;
      console.log('Kafka DLQ connected and consuming dlq.events');
    } catch (err) {
      console.error('Kafka DLQ failed to connect — DLQ is inactive', err);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.disconnectKafka();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnectKafka();
  }

  private async disconnectKafka(): Promise<void> {
    if (!this.connected) return;
    this.connected = false;
    try {
      await this.consumer.stop();
      await this.consumer.disconnect();
      await this.producer.disconnect();
    } catch (err) {
      console.error('Error disconnecting Kafka DLQ', err);
    }
  }

  /**
   * Register the retry handler (and optional permanent-failure callback) for a handler key.
   * Call from onModuleInit of each event handler.
   */
  registerHandler(key: string, handler: DlqHandler, opts?: { onPermanentFailure?: DlqHandler }): void {
    this.handlers.set(key, { handler, onPermanentFailure: opts?.onPermanentFailure });
    console.debug(`Registered DLQ handler: ${key}`);
  }

  /** Enqueue a failed payload for retry via Kafka. */
  async push(
    handlerKey: string,
    payload: unknown,
    opts?: { maxAttempts?: number; delayMs?: number },
  ): Promise<void> {
    if (!this.connected) {
      console.error(`DLQ inactive — dropping entry for ${handlerKey}`);
      return;
    }
    await this.producer.send({
      topic: DLQ_TOPIC_EVENTS,
      messages: [
        {
          key: handlerKey,
          value: JSON.stringify(payload),
          headers: {
            handlerKey,
            attempts: '0',
            maxAttempts: String(opts?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS),
            nextRetryAt: String(Date.now() + (opts?.delayMs ?? BASE_BACKOFF_MS)),
            createdAt: String(Date.now()),
          },
        },
      ],
    });
    console.warn(`Pushed to DLQ [${handlerKey}]`);
    this.outcomesCounter.inc({ handler: handlerKey, outcome: 'pushed' });
  }

  private async processMessage(topic: string, partition: number, message: KafkaMessage): Promise<void> {
    const handlerKey = h(message.headers?.handlerKey);
    const attempts = parseInt(h(message.headers?.attempts) || '0', 10);
    const maxAttempts = parseInt(h(message.headers?.maxAttempts) || String(DEFAULT_MAX_ATTEMPTS), 10);
    const nextRetryAt = parseInt(h(message.headers?.nextRetryAt) || '0', 10);

    // Message not yet due: re-enqueue with same nextRetryAt and move on immediately.
    // Never sleep here — sleeping inside eachMessage blocks the entire Kafka partition.
    const now = Date.now();
    if (nextRetryAt > now) {
      await this.reenqueue(handlerKey, message.value, message.headers, attempts, maxAttempts, nextRetryAt);
      await this.commit(topic, partition, message.offset);
      return;
    }

    const registration = this.handlers.get(handlerKey);
    if (!registration) {
      console.error(`No DLQ handler for key: ${handlerKey} — moving to dead`);
      await this.moveToDead(handlerKey, message.value, message.headers, 'No handler registered');
      await this.commit(topic, partition, message.offset);
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(message.value?.toString() ?? 'null');
    } catch {
      await this.moveToDead(handlerKey, message.value, message.headers, 'Unparseable payload');
      await this.commit(topic, partition, message.offset);
      return;
    }

    try {
      await registration.handler(payload);
      console.log(`DLQ entry recovered [${handlerKey}] after ${attempts} retries`);
      this.outcomesCounter.inc({ handler: handlerKey, outcome: 'recovered' });
      await this.commit(topic, partition, message.offset);
    } catch (err) {
      const newAttempts = attempts + 1;
      const error = err instanceof Error ? err.message : String(err);

      if (newAttempts >= maxAttempts) {
        console.error(`DLQ permanently failed [${handlerKey}] after ${newAttempts} attempts: ${error}`);
        await this.moveToDead(handlerKey, message.value, message.headers, error);
        this.outcomesCounter.inc({ handler: handlerKey, outcome: 'dead' });
        try {
          await registration.onPermanentFailure?.(payload);
        } catch (cbErr) {
          console.error(`DLQ onPermanentFailure callback failed for ${handlerKey}`, cbErr);
        }
      } else {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, newAttempts);
        console.warn(`DLQ retry ${newAttempts}/${maxAttempts} in ${backoff}ms [${handlerKey}]`);
        this.outcomesCounter.inc({ handler: handlerKey, outcome: 'retry' });
        await this.reenqueue(handlerKey, message.value, message.headers, newAttempts, maxAttempts, Date.now() + backoff);
      }
      await this.commit(topic, partition, message.offset);
    }
  }

  private async reenqueue(
    handlerKey: string,
    value: Buffer | null | undefined,
    headers: KafkaMessage['headers'],
    attempts: number,
    maxAttempts: number,
    nextRetryAt: number,
  ): Promise<void> {
    await this.producer.send({
      topic: DLQ_TOPIC_EVENTS,
      messages: [
        {
          key: handlerKey,
          value: value ?? '',
          headers: {
            ...(headers ?? {}),
            attempts: String(attempts),
            maxAttempts: String(maxAttempts),
            nextRetryAt: String(nextRetryAt),
          },
        },
      ],
    });
  }

  private async moveToDead(
    handlerKey: string,
    value: Buffer | null | undefined,
    headers: KafkaMessage['headers'],
    reason: string,
  ): Promise<void> {
    await this.producer.send({
      topic: DLQ_TOPIC_DEAD,
      messages: [
        {
          key: handlerKey,
          value: value ?? '',
          headers: {
            ...(headers ?? {}),
            deadReason: reason,
            deadAt: String(Date.now()),
          },
        },
      ],
    });
  }

  private async commit(topic: string, partition: number, offset: string): Promise<void> {
    await this.consumer.commitOffsets([
      { topic, partition, offset: (parseInt(offset, 10) + 1).toString() },
    ]);
  }

  private async ensureTopics(): Promise<void> {
    const existing = await this.admin.listTopics();
    const toCreate = [DLQ_TOPIC_EVENTS, DLQ_TOPIC_DEAD].filter((t) => !existing.includes(t));
    if (toCreate.length) {
      await this.admin.createTopics({
        topics: toCreate.map((topic) => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1,
        })),
      });
      console.log(`Created Kafka topics: ${toCreate.join(', ')}`);
    }
  }
}
