import graylogConfig from './graylog.config';

describe('graylog.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GRAYLOG_ENABLED;
    delete process.env.GRAYLOG_ENDPOINT;
    delete process.env.GRAYLOG_HOST;
    delete process.env.GRAYLOG_FACILITY;
    delete process.env.GRAYLOG_TIMEOUT;
    delete process.env.APP_NAME;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults with enabled true', () => {
    expect(graylogConfig()).toEqual({
      enabled: true,
      endpoint: 'http://localhost:12201/gelf',
      host: 'backend',
      facility: 'nestjs',
      timeout: 3000,
    });
  });

  it('disables only when GRAYLOG_ENABLED is exactly false', () => {
    process.env.GRAYLOG_ENABLED = 'false';
    expect(graylogConfig().enabled).toBe(false);
  });

  it.each(['true', '0', '', 'yes'])(
    'keeps enabled true when GRAYLOG_ENABLED=%s',
    (value) => {
      process.env.GRAYLOG_ENABLED = value;
      expect(graylogConfig().enabled).toBe(true);
    },
  );

  it('falls back to APP_NAME when GRAYLOG_HOST is unset', () => {
    process.env.APP_NAME = 'my-app';
    expect(graylogConfig().host).toBe('my-app');
  });

  it('prefers GRAYLOG_HOST over APP_NAME', () => {
    process.env.GRAYLOG_HOST = 'graylog-host';
    process.env.APP_NAME = 'my-app';
    expect(graylogConfig().host).toBe('graylog-host');
  });

  it('applies custom endpoint, facility, and timeout', () => {
    process.env.GRAYLOG_ENDPOINT = 'http://gelf:12201/gelf';
    process.env.GRAYLOG_FACILITY = 'api';
    process.env.GRAYLOG_TIMEOUT = '5000';

    expect(graylogConfig()).toMatchObject({
      endpoint: 'http://gelf:12201/gelf',
      facility: 'api',
      timeout: 5000,
    });
  });
});
