import jwtConfig from './jwt.config';

describe('jwt.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
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

  it('uses JWT_SECRET as refreshSecret when refresh secret is unset', () => {
    process.env.JWT_SECRET = 'shared-secret';

    expect(jwtConfig().refreshSecret).toBe('shared-secret');
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
