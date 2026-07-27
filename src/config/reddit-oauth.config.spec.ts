import { Role } from '@modules/auth/enums/role.enum';
import redditOAuthConfig from './reddit-oauth.config';

describe('reddit-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDDIT_AUTH_ENABLED;
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
    delete process.env.REDDIT_CALLBACK_URL;
    delete process.env.REDDIT_REDIRECT_ALLOWLIST;
    delete process.env.REDDIT_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(redditOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/reddit/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when REDDIT_AUTH_ENABLED=%s', (value) => {
    process.env.REDDIT_AUTH_ENABLED = value;
    expect(redditOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when REDDIT_AUTH_ENABLED=%s',
    (value) => {
      process.env.REDDIT_AUTH_ENABLED = value;
      expect(redditOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.REDDIT_CLIENT_ID = 'cid';
    process.env.REDDIT_CLIENT_SECRET = 'secret';
    process.env.REDDIT_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.REDDIT_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.REDDIT_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(redditOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
