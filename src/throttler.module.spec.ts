import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerStorage, getOptionsToken } from '@nestjs/throttler';
import { Global, Module } from '@nestjs/common';
import throttlerConfig from './config/throttler.config';

const mockStorage: ThrottlerStorage = {
  increment: jest.fn(),
};

const mockStorageCtor = jest.fn(() => mockStorage);

jest.mock('@nest-lab/throttler-storage-redis', () => ({
  ThrottlerStorageRedisService: mockStorageCtor,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ThrottlerStorageRedisService } = require('@nest-lab/throttler-storage-redis');

const mockRedis = { status: 'ready' };

@Global()
@Module({
  providers: [{ provide: 'REDIS_CLIENT', useValue: mockRedis }],
  exports: ['REDIS_CLIENT'],
})
class RedisClientTestModule {}

async function buildModule() {
  return Test.createTestingModule({
    imports: [
      RedisClientTestModule,
      ConfigModule.forRoot({ load: [throttlerConfig], isGlobal: true }),
      ThrottlerModule.forRootAsync({
        imports: [RedisClientTestModule],
        inject: [ConfigService, 'REDIS_CLIENT'],
        useFactory: (configService: ConfigService, redisClient: typeof mockRedis) => ({
          throttlers: [
            {
              ttl: configService.get<number>('throttler.ttl', 60000),
              limit: configService.get<number>('throttler.limit', 120),
            },
          ],
          storage: new ThrottlerStorageRedisService(redisClient),
        }),
      }),
    ],
  }).compile();
}

describe('ThrottlerModule wiring', () => {
  beforeEach(() => {
    mockStorageCtor.mockClear();
    delete process.env.THROTTLER_TTL;
    delete process.env.THROTTLER_LIMIT;
  });

  it('configures Redis storage with default ttl and limit', async () => {
    const moduleRef = await buildModule();
    const opts = moduleRef.get(getOptionsToken());
    expect(opts).toBeDefined();
    expect(opts.throttlers).toHaveLength(1);
    expect(opts.throttlers[0].ttl).toBe(60000);
    expect(opts.throttlers[0].limit).toBe(120);
    expect(mockStorageCtor).toHaveBeenCalledWith(mockRedis);
    expect(opts.storage).toBe(mockStorage);
  });

  it('allows overriding ttl and limit via env', async () => {
    process.env.THROTTLER_TTL = '30000';
    process.env.THROTTLER_LIMIT = '60';
    const moduleRef = await buildModule();
    const opts = moduleRef.get(getOptionsToken());
    expect(opts.throttlers[0].ttl).toBe(30000);
    expect(opts.throttlers[0].limit).toBe(60);
    expect(opts.storage).toBe(mockStorage);
  });
});
