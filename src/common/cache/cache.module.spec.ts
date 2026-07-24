import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { CacheModule } from './cache.module';
import { CacheService } from './cache.service';
import { MongooseCacheInterceptor } from './interceptors/mongoose-cache.interceptor';
import { TypeOrmCacheInterceptor } from './interceptors/typeorm-cache.interceptor';

const mockRedisInstance = {
  ping: jest.fn(),
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  keys: jest.fn(),
  disconnect: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation((options: Record<string, unknown>) => {
    (mockRedisInstance as { __options?: unknown }).__options = options;
    return mockRedisInstance;
  });
});

const MockRedis = Redis as unknown as jest.Mock;

describe('CacheModule', () => {
  it('provides CacheService and cache interceptors', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              redis: {
                host: 'redis.test',
                port: 6380,
                password: 'secret',
                db: 2,
                ttl: 1800,
                username: 'cache-user',
              },
            }),
          ],
        }),
        CacheModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string, defaultValue?: unknown) => {
          if (key === 'redis') {
            return {
              host: 'redis.test',
              port: 6380,
              password: 'secret',
              db: 2,
              ttl: 1800,
              username: 'cache-user',
            };
          }
          if (key === 'redis.ttl') {
            return 1800;
          }
          return defaultValue;
        },
      })
      .compile();

    expect(moduleRef.get(CacheService)).toBeInstanceOf(CacheService);
    expect(moduleRef.get(TypeOrmCacheInterceptor)).toBeInstanceOf(
      TypeOrmCacheInterceptor,
    );
    expect(moduleRef.get(MongooseCacheInterceptor)).toBeInstanceOf(
      MongooseCacheInterceptor,
    );

    expect(MockRedis).toHaveBeenCalled();
    const redisOptions = MockRedis.mock.calls[0][0] as {
      host: string;
      port: number;
      db: number;
      username: string;
      password: string;
      retryStrategy: (times: number) => number;
    };
    expect(redisOptions.host).toBe('redis.test');
    expect(redisOptions.port).toBe(6380);
    expect(redisOptions.db).toBe(2);
    expect(redisOptions.username).toBe('cache-user');
    expect(redisOptions.password).toBe('secret');
    expect(redisOptions.retryStrategy(10)).toBe(500);
    expect(redisOptions.retryStrategy(100)).toBe(2000);

    await moduleRef.close();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('passes password as undefined when redis password is falsy', async () => {
    MockRedis.mockClear();
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              redis: {
                host: 'redis.test',
                port: 6379,
                password: '',
                db: 0,
                ttl: 3600,
              },
            }),
          ],
        }),
        CacheModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string, defaultValue?: unknown) => {
          if (key === 'redis') {
            return {
              host: 'redis.test',
              port: 6379,
              password: '',
              db: 0,
              ttl: 3600,
            };
          }
          if (key === 'redis.ttl') {
            return 3600;
          }
          return defaultValue;
        },
      })
      .compile();

    const redisOptions = MockRedis.mock.calls[0][0] as {
      password: string | undefined;
    };
    expect(redisOptions.password).toBeUndefined();

    await moduleRef.close();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
