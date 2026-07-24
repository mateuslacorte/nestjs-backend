import { Role } from '@modules/auth/enums/role.enum';
import twitterOAuthConfig from './twitter-oauth.config';

describe('twitter-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TWITTER_AUTH_ENABLED;
    delete process.env.TWITTER_CLIENT_ID;
    delete process.env.TWITTER_CLIENT_SECRET;
    delete process.env.TWITTER_CALLBACK_URL;
    delete process.env.TWITTER_REDIRECT_ALLOWLIST;
    delete process.env.TWITTER_OAUTH_DEFAULT_ROLES;
    delete process.env.TWITTER_CLIENT_TYPE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(twitterOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/twitter/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
      clientType: 'confidential',
    });
  });

  it.each(['true', '1'])('enables when TWITTER_AUTH_ENABLED=%s', (value) => {
    process.env.TWITTER_AUTH_ENABLED = value;
    expect(twitterOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when TWITTER_AUTH_ENABLED=%s',
    (value) => {
      process.env.TWITTER_AUTH_ENABLED = value;
      expect(twitterOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, roles, and clientType', () => {
    process.env.TWITTER_CLIENT_ID = 'client-id';
    process.env.TWITTER_CLIENT_SECRET = 'client-secret';
    process.env.TWITTER_CALLBACK_URL = 'https://app.example.com/twitter';
    process.env.TWITTER_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.TWITTER_OAUTH_DEFAULT_ROLES = 'user,admin';
    process.env.TWITTER_CLIENT_TYPE = 'public';

    expect(twitterOAuthConfig()).toMatchObject({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      callbackUrl: 'https://app.example.com/twitter',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.ADMIN],
      exchangeCodeTtlSeconds: 60,
      clientType: 'public',
    });
  });
});
