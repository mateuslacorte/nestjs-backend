import jwtConfig from './jwt.config';

describe('jwt.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.APP_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRATION_TIME;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_REFRESH_EXPIRATION_TIME;
    delete process.env.JWT_JITTER_SECONDS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults', () => {
    expect(jwtConfig()).toEqual({
      secret: 'fallback-secret-key',
      expirationTime: '1h',
      refreshSecret: 'fallback-refresh-secret-key',
      refreshExpirationTime: '7d',
      jitterSeconds: 60,
    });
  });

  it('applies all JWT env overrides', () => {
    process.env.JWT_SECRET = 'access';
    process.env.JWT_EXPIRATION_TIME = '15m';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.JWT_REFRESH_EXPIRATION_TIME = '30d';
    process.env.JWT_JITTER_SECONDS = '120';

    expect(jwtConfig()).toEqual({
      secret: 'access',
      expirationTime: '15m',
      refreshSecret: 'refresh',
      refreshExpirationTime: '30d',
      jitterSeconds: 120,
    });
  });

  it('uses fallback refresh secret when refresh secret is unset in non-production', () => {
    expect(jwtConfig().refreshSecret).toBe('fallback-refresh-secret-key');
  });

  it('does not reuse JWT_SECRET as refreshSecret when refresh secret is unset', () => {
    process.env.JWT_SECRET = 'shared-secret';

    expect(jwtConfig().refreshSecret).toBe('fallback-refresh-secret-key');
    expect(jwtConfig().refreshSecret).not.toBe('shared-secret');
  });

  it('throws in production when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';

    expect(() => jwtConfig()).toThrow(
      'JWT_SECRET must be set in production (no insecure fallback)',
    );
  });

  it('throws in production when JWT_REFRESH_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'access-secret';

    expect(() => jwtConfig()).toThrow(
      'JWT_REFRESH_SECRET must be set in production (no insecure fallback)',
    );
  });

  it('parses JWT_JITTER_SECONDS=0 as 0', () => {
    process.env.JWT_JITTER_SECONDS = '0';
    expect(jwtConfig().jitterSeconds).toBe(0);
  });

  it('yields NaN for non-numeric JWT_JITTER_SECONDS', () => {
    process.env.JWT_JITTER_SECONDS = 'abc';
    expect(jwtConfig().jitterSeconds).toBeNaN();
  });
});
