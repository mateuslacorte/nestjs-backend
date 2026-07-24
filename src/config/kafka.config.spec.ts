import kafkaConfig from './kafka.config';

describe('kafka.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KAFKA_CLIENT_ID;
    delete process.env.KAFKA_BROKERS;
    delete process.env.KAFKA_GROUP_ID;
    delete process.env.KAFKA_SSL;
    delete process.env.KAFKA_SASL_MECHANISM;
    delete process.env.KAFKA_SASL_USERNAME;
    delete process.env.KAFKA_SASL_PASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults including retry settings', () => {
    expect(kafkaConfig()).toEqual({
      clientId: 'my-client',
      brokers: ['localhost:9092'],
      groupId: 'my-group',
      ssl: false,
      sasl: {
        mechanism: 'plain',
        username: '',
        password: '',
      },
      retry: {
        initialRetryTime: 300,
        retries: 8,
      },
    });
  });

  it('splits KAFKA_BROKERS on commas without trimming', () => {
    process.env.KAFKA_BROKERS = 'a:9092, b:9092';
    expect(kafkaConfig().brokers).toEqual(['a:9092', ' b:9092']);
  });

  it('falls back to default brokers when KAFKA_BROKERS is empty', () => {
    process.env.KAFKA_BROKERS = '';
    expect(kafkaConfig().brokers).toEqual(['localhost:9092']);
  });

  it('applies SSL and SASL overrides', () => {
    process.env.KAFKA_CLIENT_ID = 'api';
    process.env.KAFKA_GROUP_ID = 'api-group';
    process.env.KAFKA_SSL = 'true';
    process.env.KAFKA_SASL_MECHANISM = 'scram-sha-256';
    process.env.KAFKA_SASL_USERNAME = 'user';
    process.env.KAFKA_SASL_PASSWORD = 'pass';
    process.env.KAFKA_BROKERS = 'a:9092,b:9092';

    expect(kafkaConfig()).toMatchObject({
      clientId: 'api',
      groupId: 'api-group',
      brokers: ['a:9092', 'b:9092'],
      ssl: true,
      sasl: {
        mechanism: 'scram-sha-256',
        username: 'user',
        password: 'pass',
      },
    });
  });
});
