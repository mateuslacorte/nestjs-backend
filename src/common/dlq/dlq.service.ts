import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Admin, Consumer, Kafka, KafkaMessage, Producer, logLevel } from 'kafkajs';

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

function h(val: Buffer | string | (Buffer | string)[] | null | undefined): string {
  if (!val) return '';
  if (Array.isArray(val)) return h(val[0]);
  return Buffer.isBuffer(val) ? val.toString() : val;
}

@Injectable()
export class DlqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DlqService.name);
  private readonly handlers = new Map<string, HandlerEntry>();

  private kafka!: Kafka;
  private producer!: Producer;
  private consumer!: Consumer;
  private admin!: Admin;
  private connected = false;

  constructor(private readonly config: ConfigService) {}

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
      this.logger.log('Kafka DLQ connected and consuming dlq.events');
    } catch (err) {
      this.logger.error('Kafka DLQ failed to connect — DLQ is inactive', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
    } catch (err) {
      this.logger.error('Error disconnecting Kafka DLQ', err);
    }
  }

  /**
   * Register the retry handler (and optional permanent-failure callback) for a handler key.
   * Call from onModuleInit of each event handler.
   */
  registerHandler(key: string, handler: DlqHandler, opts?: { onPermanentFailure?: DlqHandler }): void {
    this.handlers.set(key, { handler, onPermanentFailure: opts?.onPermanentFailure });
    this.logger.debug(`Registered DLQ handler: ${key}`);
  }

  /** Enqueue a failed payload for retry via Kafka. */
  async push(
    handlerKey: string,
    payload: unknown,
    opts?: { maxAttempts?: number; delayMs?: number },
  ): Promise<void> {
    if (!this.connected) {
      this.logger.error(`DLQ inactive — dropping entry for ${handlerKey}`);
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
    this.logger.warn(`Pushed to DLQ [${handlerKey}]`);
  }

  private async processMessage(topic: string, partition: number, message: KafkaMessage): Promise<void> {
    const handlerKey = h(message.headers?.handlerKey);
    const attempts = parseInt(h(message.headers?.attempts) || '0', 10);
    const maxAttempts = parseInt(h(message.headers?.maxAttempts) || String(DEFAULT_MAX_ATTEMPTS), 10);
    const nextRetryAt = parseInt(h(message.headers?.nextRetryAt) || '0', 10);

    // Delay enforcement: if the message isn't due yet, sleep then re-enqueue
    const now = Date.now();
    if (nextRetryAt > now) {
      const wait = Math.min(nextRetryAt - now, 30_000);
      await new Promise<void>((r) => setTimeout(r, wait));
      await this.reenqueue(handlerKey, message.value, message.headers, attempts, maxAttempts, nextRetryAt);
      await this.commit(topic, partition, message.offset);
      return;
    }

    const registration = this.handlers.get(handlerKey);
    if (!registration) {
      this.logger.error(`No DLQ handler for key: ${handlerKey} — moving to dead`);
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
      this.logger.log(`DLQ entry recovered [${handlerKey}] after ${attempts} retries`);
      await this.commit(topic, partition, message.offset);
    } catch (err) {
      const newAttempts = attempts + 1;
      const error = err instanceof Error ? err.message : String(err);

      if (newAttempts >= maxAttempts) {
        this.logger.error(`DLQ permanently failed [${handlerKey}] after ${newAttempts} attempts: ${error}`);
        await this.moveToDead(handlerKey, message.value, message.headers, error);
        try {
          await registration.onPermanentFailure?.(payload);
        } catch (cbErr) {
          this.logger.error(`DLQ onPermanentFailure callback failed for ${handlerKey}`, cbErr);
        }
      } else {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, newAttempts);
        this.logger.warn(`DLQ retry ${newAttempts}/${maxAttempts} in ${backoff}ms [${handlerKey}]`);
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
      this.logger.log(`Created Kafka topics: ${toCreate.join(', ')}`);
    }
  }
}
