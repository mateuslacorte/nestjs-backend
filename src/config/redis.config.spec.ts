import redisConfig from './redis.config';

describe('redis.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;
    delete process.env.REDIS_TTL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults', () => {
    expect(redisConfig()).toEqual({
      host: 'localhost',
      port: 6379,
      password: '',
      db: 0,
      ttl: 3600,
    });
  });

  it('applies overrides', () => {
    process.env.REDIS_HOST = 'redis.test';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';
    process.env.REDIS_DB = '2';
    process.env.REDIS_TTL = '120';

    expect(redisConfig()).toEqual({
      host: 'redis.test',
      port: 6380,
      password: 'secret',
      db: 2,
      ttl: 120,
    });
  });
});
