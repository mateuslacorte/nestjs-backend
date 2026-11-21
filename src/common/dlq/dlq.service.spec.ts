import { DlqService } from './dlq.service';
import { ConfigService } from '@nestjs/config';
import { KafkaMessage } from 'kafkajs';

function makeConsumer() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    commitOffsets: jest.fn().mockResolvedValue(undefined),
  };
}

function makeProducer() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };
}

function makeAdmin() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    listTopics: jest.fn().mockResolvedValue([]),
    createTopics: jest.fn().mockResolvedValue(undefined),
  };
}

function makeKafka(consumer: ReturnType<typeof makeConsumer>, producer: ReturnType<typeof makeProducer>, admin: ReturnType<typeof makeAdmin>) {
  return {
    consumer: jest.fn().mockReturnValue(consumer),
    producer: jest.fn().mockReturnValue(producer),
    admin: jest.fn().mockReturnValue(admin),
  };
}

jest.mock('kafkajs', () => {
  const actual = jest.requireActual<typeof import('kafkajs')>('kafkajs');
  return {
    ...actual,
    Kafka: jest.fn(),
  };
});

import { Kafka } from 'kafkajs';

const configService = {
  get: jest.fn((key: string) => {
    if (key === 'kafka.brokers') return ['localhost:9092'];
    if (key === 'kafka.clientId') return 'test-client';
    return undefined;
  }),
} as unknown as ConfigService;

function makeMsg(
  headers: Record<string, string>,
  value = '{}',
  offset = '0',
): KafkaMessage {
  return {
    key: Buffer.from('test'),
    value: Buffer.from(value),
    timestamp: String(Date.now()),
    attributes: 0,
    offset,
    headers,
  };
}

// ─── lifecycle ────────────────────────────────────────────────────────────────

describe('DlqService — onApplicationShutdown', () => {
  let service: DlqService;
  let consumer: ReturnType<typeof makeConsumer>;
  let producer: ReturnType<typeof makeProducer>;
  let admin: ReturnType<typeof makeAdmin>;

  beforeEach(async () => {
    consumer = makeConsumer();
    producer = makeProducer();
    admin = makeAdmin();
    (Kafka as jest.MockedClass<typeof Kafka>).mockImplementation(
      () => makeKafka(consumer, producer, admin) as unknown as InstanceType<typeof Kafka>,
    );

    service = new DlqService(configService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls consumer.stop(), consumer.disconnect(), producer.disconnect() on shutdown', async () => {
    await service.onApplicationShutdown();

    expect(consumer.stop).toHaveBeenCalledTimes(1);
    expect(consumer.disconnect).toHaveBeenCalledTimes(1);
    expect(producer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('consumer.stop() is called before consumer.disconnect()', async () => {
    const callOrder: string[] = [];
    consumer.stop.mockImplementation(async () => { callOrder.push('stop'); });
    consumer.disconnect.mockImplementation(async () => { callOrder.push('disconnect'); });

    await service.onApplicationShutdown();

    expect(callOrder).toEqual(['stop', 'disconnect']);
  });

  it('is idempotent — second call is a no-op', async () => {
    await service.onApplicationShutdown();
    await service.onApplicationShutdown();

    expect(consumer.stop).toHaveBeenCalledTimes(1);
    expect(producer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy after onApplicationShutdown is a no-op', async () => {
    await service.onApplicationShutdown();
    await service.onModuleDestroy();

    expect(consumer.stop).toHaveBeenCalledTimes(1);
  });

  it('does nothing when not connected', async () => {
    service = new DlqService(configService);
    // skip onModuleInit — service.connected stays false
    await service.onApplicationShutdown();

    expect(consumer.stop).not.toHaveBeenCalled();
  });
});

// ─── push ─────────────────────────────────────────────────────────────────────

describe('DlqService — push', () => {
  let service: DlqService;
  let consumer: ReturnType<typeof makeConsumer>;
  let producer: ReturnType<typeof makeProducer>;
  let admin: ReturnType<typeof makeAdmin>;

  beforeEach(async () => {
    consumer = makeConsumer();
    producer = makeProducer();
    admin = makeAdmin();
    (Kafka as jest.MockedClass<typeof Kafka>).mockImplementation(
      () => makeKafka(consumer, producer, admin) as unknown as InstanceType<typeof Kafka>,
    );
    service = new DlqService(configService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('sends the payload to dlq.events when connected', async () => {
    await service.push('my-handler', { foo: 'bar' });

    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'dlq.events' }),
    );
  });

  it('increments outcomesCounter with outcome=pushed', async () => {
    const incSpy = jest.spyOn(service['outcomesCounter'], 'inc');
    await service.push('my-handler', {});
    expect(incSpy).toHaveBeenCalledWith({ handler: 'my-handler', outcome: 'pushed' });
  });

  it('encodes handlerKey and attempts=0 in headers', async () => {
    await service.push('my-handler', { foo: 'bar' });

    const call = producer.send.mock.calls[0][0] as { messages: { headers: Record<string, string> }[] };
    expect(call.messages[0].headers.handlerKey).toBe('my-handler');
    expect(call.messages[0].headers.attempts).toBe('0');
  });

  it('uses provided maxAttempts and delayMs', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    await service.push('my-handler', {}, { maxAttempts: 5, delayMs: 2000 });

    const call = producer.send.mock.calls[0][0] as { messages: { headers: Record<string, string> }[] };
    expect(call.messages[0].headers.maxAttempts).toBe('5');
    expect(call.messages[0].headers.nextRetryAt).toBe('3000');
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('drops silently when not connected', async () => {
    service = new DlqService(configService);
    // not initialised → connected = false
    const logSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await service.push('my-handler', {});

    expect(producer.send).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });
});

// ─── processMessage ───────────────────────────────────────────────────────────

describe('DlqService — processMessage', () => {
  let service: DlqService;
  let consumer: ReturnType<typeof makeConsumer>;
  let producer: ReturnType<typeof makeProducer>;
  let admin: ReturnType<typeof makeAdmin>;
  let eachMessage: (ctx: { topic: string; partition: number; message: KafkaMessage }) => Promise<void>;

  beforeEach(async () => {
    consumer = makeConsumer();
    producer = makeProducer();
    admin = makeAdmin();
    (Kafka as jest.MockedClass<typeof Kafka>).mockImplementation(
      () => makeKafka(consumer, producer, admin) as unknown as InstanceType<typeof Kafka>,
    );
    // Capture eachMessage callback when consumer.run is called
    consumer.run.mockImplementation(async ({ eachMessage: fn }: { eachMessage: typeof eachMessage }) => {
      eachMessage = fn;
    });
    service = new DlqService(configService);
    await service.onModuleInit();
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('re-enqueues immediately without sleeping when nextRetryAt is in the future', async () => {
    const nextRetryAt = Date.now() + 20_000; // 20s in the future
    const msg = makeMsg({
      handlerKey: 'my-handler',
      attempts: '0',
      maxAttempts: '3',
      nextRetryAt: String(nextRetryAt),
      createdAt: String(Date.now()),
    });

    // If the sleep were still present (up to 20s), Jest's 5s default timeout
    // would kill this test — so this also acts as a regression guard.
    await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });

    // re-enqueues to dlq.events with the same nextRetryAt
    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'dlq.events' }),
    );
    const sentHeaders = (producer.send.mock.calls[0][0] as { messages: { headers: Record<string, string> }[] })
      .messages[0].headers;
    expect(sentHeaders.nextRetryAt).toBe(String(nextRetryAt));
    // commits the original offset immediately
    expect(consumer.commitOffsets).toHaveBeenCalledWith([
      { topic: 'dlq.events', partition: 0, offset: '1' },
    ]);
  });

  it('calls registered handler when message is due and commits on success', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    service.registerHandler('my-handler', handler);

    const msg = makeMsg({
      handlerKey: 'my-handler',
      attempts: '1',
      maxAttempts: '3',
      nextRetryAt: String(Date.now() - 1000), // already due
    });

    await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });

    expect(handler).toHaveBeenCalledWith({ });
    expect(consumer.commitOffsets).toHaveBeenCalled();
    // should NOT send to dead letter
    const deadSends = producer.send.mock.calls.filter(
      ([{ topic }]: [{ topic: string }]) => topic === 'dlq.dead',
    );
    expect(deadSends).toHaveLength(0);
  });

  it('moves to dlq.dead when no handler is registered', async () => {
    const msg = makeMsg({
      handlerKey: 'unknown-handler',
      attempts: '0',
      maxAttempts: '3',
      nextRetryAt: String(Date.now() - 1000),
    });

    await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });

    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'dlq.dead' }),
    );
    expect(consumer.commitOffsets).toHaveBeenCalled();
  });

  it('moves to dlq.dead when payload is not valid JSON', async () => {
    const msg = makeMsg(
      {
        handlerKey: 'my-handler',
        attempts: '0',
        maxAttempts: '3',
        nextRetryAt: String(Date.now() - 1000),
      },
      'not-json',
    );
    service.registerHandler('my-handler', jest.fn());

    await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });

    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'dlq.dead' }),
    );
    expect(consumer.commitOffsets).toHaveBeenCalled();
  });

  it('re-enqueues with exponential backoff when handler fails and retries remain', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('temporary failure'));
    service.registerHandler('my-handler', handler);

    const msg = makeMsg({
      handlerKey: 'my-handler',
      attempts: '0',
      maxAttempts: '3',
      nextRetryAt: String(Date.now() - 1000),
    });

    await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });

    // Should re-enqueue (not dead)
    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'dlq.events' }),
    );
    const sentHeaders = (producer.send.mock.calls[0][0] as { messages: { headers: Record<string, string> }[] })
      .messages[0].headers;
    expect(sentHeaders.attempts).toBe('1');
    expect(consumer.commitOffsets).toHaveBeenCalled();
  });

  it('moves to dlq.dead and calls onPermanentFailure when max attempts reached', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('permanent failure'));
    const onPermanentFailure = jest.fn().mockResolvedValue(undefined);
    service.registerHandler('my-handler', handler, { onPermanentFailure });

    const msg = makeMsg({
      handlerKey: 'my-handler',
      attempts: '2',
      maxAttempts: '3',
      nextRetryAt: String(Date.now() - 1000),
    });

    await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });

    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'dlq.dead' }),
    );
    expect(onPermanentFailure).toHaveBeenCalled();
    expect(consumer.commitOffsets).toHaveBeenCalled();
  });

  it('commits even if onPermanentFailure callback throws', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('fail'));
    const onPermanentFailure = jest.fn().mockRejectedValue(new Error('callback fail'));
    service.registerHandler('my-handler', handler, { onPermanentFailure });

    const msg = makeMsg({
      handlerKey: 'my-handler',
      attempts: '2',
      maxAttempts: '3',
      nextRetryAt: String(Date.now() - 1000),
    });

    await expect(
      eachMessage({ topic: 'dlq.events', partition: 0, message: msg }),
    ).resolves.not.toThrow();

    expect(consumer.commitOffsets).toHaveBeenCalled();
  });

  describe('Prometheus metrics via outcomesCounter', () => {
    let incSpy: jest.SpyInstance;

    beforeEach(() => {
      incSpy = jest.spyOn(service['outcomesCounter'], 'inc');
    });

    it('increments outcome=recovered when handler succeeds', async () => {
      service.registerHandler('my-handler', jest.fn().mockResolvedValue(undefined));
      const msg = makeMsg({
        handlerKey: 'my-handler',
        attempts: '1',
        maxAttempts: '3',
        nextRetryAt: String(Date.now() - 1000),
      });
      await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });
      expect(incSpy).toHaveBeenCalledWith({ handler: 'my-handler', outcome: 'recovered' });
    });

    it('increments outcome=retry when handler fails and retries remain', async () => {
      service.registerHandler('my-handler', jest.fn().mockRejectedValue(new Error('temporary')));
      const msg = makeMsg({
        handlerKey: 'my-handler',
        attempts: '0',
        maxAttempts: '3',
        nextRetryAt: String(Date.now() - 1000),
      });
      await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });
      expect(incSpy).toHaveBeenCalledWith({ handler: 'my-handler', outcome: 'retry' });
    });

    it('increments outcome=dead when max attempts reached', async () => {
      service.registerHandler('my-handler', jest.fn().mockRejectedValue(new Error('permanent')));
      const msg = makeMsg({
        handlerKey: 'my-handler',
        attempts: '2',
        maxAttempts: '3',
        nextRetryAt: String(Date.now() - 1000),
      });
      await eachMessage({ topic: 'dlq.events', partition: 0, message: msg });
      expect(incSpy).toHaveBeenCalledWith({ handler: 'my-handler', outcome: 'dead' });
    });
  });
});
