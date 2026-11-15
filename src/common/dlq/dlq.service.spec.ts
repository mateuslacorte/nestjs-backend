import { DlqService } from './dlq.service';
import { ConfigService } from '@nestjs/config';

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

describe('DlqService — onApplicationShutdown', () => {
  let service: DlqService;
  let consumer: ReturnType<typeof makeConsumer>;
  let producer: ReturnType<typeof makeProducer>;
  let admin: ReturnType<typeof makeAdmin>;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'kafka.brokers') return ['localhost:9092'];
      if (key === 'kafka.clientId') return 'test-client';
      return undefined;
    }),
  } as unknown as ConfigService;

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
