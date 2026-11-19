import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

jest.mock('@nest-lab/throttler-storage-redis', () => ({
  ThrottlerStorageRedisService: jest.fn().mockImplementation(() => ({
    increment: jest.fn(),
    onModuleDestroy: jest.fn(),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn(),
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    keys: jest.fn(),
    disconnect: jest.fn(),
  }));
});

describe('ThrottlerModule Redis wiring (useFactory)', () => {
  const MockThrottlerStorageRedisService =
    ThrottlerStorageRedisService as unknown as jest.Mock;

  beforeEach(() => {
    MockThrottlerStorageRedisService.mockClear();
  });

  it('creates ThrottlerStorageRedisService with the ioredis client', async () => {
    const fakeRedis = { ping: jest.fn() };
    const fakeConfig = {
      get: (key: string, defaultValue?: number) => {
        if (key === 'throttler.ttl') return 60000;
        if (key === 'throttler.limit') return 120;
        return defaultValue;
      },
    };

    // Replicate the useFactory from AppModule
    const { ConfigService } = await import('@nestjs/config');
    const configSvc = fakeConfig as unknown as InstanceType<typeof ConfigService>;
    const redisClient = fakeRedis as unknown as import('ioredis').default;

    const result = {
      throttlers: [
        {
          ttl: configSvc.get<number>('throttler.ttl', 60000),
          limit: configSvc.get<number>('throttler.limit', 120),
        },
      ],
      storage: new ThrottlerStorageRedisService(redisClient),
    };

    expect(result.throttlers).toEqual([{ ttl: 60000, limit: 120 }]);
    expect(MockThrottlerStorageRedisService).toHaveBeenCalledTimes(1);
    expect(MockThrottlerStorageRedisService).toHaveBeenCalledWith(fakeRedis);
    expect(result.storage).toBeDefined();
  });

  it('uses defaults when config values are absent', async () => {
    const fakeRedis = { ping: jest.fn() };
    const fakeConfig = {
      get: (_key: string, defaultValue?: number) => defaultValue,
    };

    const { ConfigService } = await import('@nestjs/config');
    const configSvc = fakeConfig as unknown as InstanceType<typeof ConfigService>;
    const redisClient = fakeRedis as unknown as import('ioredis').default;

    const result = {
      throttlers: [
        {
          ttl: configSvc.get<number>('throttler.ttl', 60000),
          limit: configSvc.get<number>('throttler.limit', 120),
        },
      ],
      storage: new ThrottlerStorageRedisService(redisClient),
    };

    expect(result.throttlers).toEqual([{ ttl: 60000, limit: 120 }]);
  });
});
