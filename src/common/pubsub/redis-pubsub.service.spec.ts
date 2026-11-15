import { RedisPubSubService } from './redis-pubsub.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    subscribe: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(1),
  }));
  return { default: mockRedis, __esModule: true };
});

function makePublisher(): jest.Mocked<Pick<Redis, 'quit' | 'publish'>> {
  return {
    quit: jest.fn().mockResolvedValue('OK' as any),
    publish: jest.fn().mockResolvedValue(1 as any),
  } as unknown as jest.Mocked<Pick<Redis, 'quit' | 'publish'>>;
}

const configService = {
  get: jest.fn().mockReturnValue({
    host: 'localhost',
    port: 6379,
    username: undefined,
    password: undefined,
    db: 0,
  }),
} as unknown as ConfigService;

describe('RedisPubSubService — onApplicationShutdown', () => {
  let service: RedisPubSubService;
  let publisher: ReturnType<typeof makePublisher>;
  let subscriberQuit: jest.Mock;

  beforeEach(() => {
    publisher = makePublisher();
    service = new RedisPubSubService(publisher as unknown as Redis, configService);
    service.onModuleInit();
    // grab the subscriber the service created
    subscriberQuit = (service as any).subscriber.quit;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls subscriber.quit() and publisher.quit() on shutdown', async () => {
    await service.onApplicationShutdown();

    expect(subscriberQuit).toHaveBeenCalledTimes(1);
    expect(publisher.quit).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — second call is a no-op', async () => {
    await service.onApplicationShutdown();
    await service.onApplicationShutdown();

    expect(subscriberQuit).toHaveBeenCalledTimes(1);
    expect(publisher.quit).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy after onApplicationShutdown is a no-op', async () => {
    await service.onApplicationShutdown();
    await service.onModuleDestroy();

    expect(subscriberQuit).toHaveBeenCalledTimes(1);
    expect(publisher.quit).toHaveBeenCalledTimes(1);
  });
});
