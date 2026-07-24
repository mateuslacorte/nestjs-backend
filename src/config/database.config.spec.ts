import databaseConfig from './database.config';

describe('database.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const key of [
      'MONGO_URI',
      'MONGO_POOL_MAX',
      'MONGO_POOL_MIN',
      'MONGO_POOL_IDLE',
      'MONGO_POOL_TIMEOUT',
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_DB',
      'POSTGRES_SYNCHRONIZE',
      'POSTGRES_POOL_MAX',
      'POSTGRES_POOL_MIN',
      'POSTGRES_POOL_IDLE',
      'POSTGRES_POOL_TIMEOUT',
    ]) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns full defaults for mongo and postgres', () => {
    expect(databaseConfig()).toEqual({
      mongoUri: 'mongodb://localhost:27017/database',
      mongo: {
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        waitQueueTimeoutMS: 5000,
      },
      postgres: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '',
        database: 'database',
        synchronize: false,
        poolSize: 10,
        extra: {
          max: 10,
          min: 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      },
    });
  });

  it('applies env overrides and keeps poolSize in sync with extra.max', () => {
    process.env.MONGO_URI = 'mongodb://mongo:27017/app';
    process.env.MONGO_POOL_MAX = '20';
    process.env.MONGO_POOL_MIN = '1';
    process.env.MONGO_POOL_IDLE = '10000';
    process.env.MONGO_POOL_TIMEOUT = '2000';
    process.env.POSTGRES_HOST = 'pg';
    process.env.POSTGRES_PORT = '5433';
    process.env.POSTGRES_USER = 'admin';
    process.env.POSTGRES_PASSWORD = 'secret';
    process.env.POSTGRES_DB = 'appdb';
    process.env.POSTGRES_SYNCHRONIZE = 'true';
    process.env.POSTGRES_POOL_MAX = '25';
    process.env.POSTGRES_POOL_MIN = '5';
    process.env.POSTGRES_POOL_IDLE = '15000';
    process.env.POSTGRES_POOL_TIMEOUT = '3000';

    const config = databaseConfig();

    expect(config.mongoUri).toBe('mongodb://mongo:27017/app');
    expect(config.mongo).toEqual({
      maxPoolSize: 20,
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      waitQueueTimeoutMS: 2000,
    });
    expect(config.postgres.synchronize).toBe(true);
    expect(config.postgres.poolSize).toBe(25);
    expect(config.postgres.extra.max).toBe(25);
    expect(config.postgres.extra.min).toBe(5);
  });

  it.each(['false', '1', 'TRUE', ''])(
    'keeps synchronize false when POSTGRES_SYNCHRONIZE=%s',
    (value) => {
      process.env.POSTGRES_SYNCHRONIZE = value;
      expect(databaseConfig().postgres.synchronize).toBe(false);
    },
  );
});
