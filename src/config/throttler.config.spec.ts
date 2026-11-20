import throttlerConfig from './throttler.config';

describe('throttler.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.THROTTLER_TTL;
    delete process.env.THROTTLER_LIMIT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults', () => {
    expect(throttlerConfig()).toEqual({ ttl: 60000, limit: 120 });
  });

  it('applies env overrides', () => {
    process.env.THROTTLER_TTL = '30000';
    process.env.THROTTLER_LIMIT = '60';
    expect(throttlerConfig()).toEqual({ ttl: 30000, limit: 60 });
  });
});
