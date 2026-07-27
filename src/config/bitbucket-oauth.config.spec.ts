import { Role } from '@modules/auth/enums/role.enum';
import bitbucketOAuthConfig from './bitbucket-oauth.config';

describe('bitbucket-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BITBUCKET_AUTH_ENABLED;
    delete process.env.BITBUCKET_CLIENT_ID;
    delete process.env.BITBUCKET_CLIENT_SECRET;
    delete process.env.BITBUCKET_CALLBACK_URL;
    delete process.env.BITBUCKET_REDIRECT_ALLOWLIST;
    delete process.env.BITBUCKET_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(bitbucketOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/bitbucket/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when BITBUCKET_AUTH_ENABLED=%s', (value) => {
    process.env.BITBUCKET_AUTH_ENABLED = value;
    expect(bitbucketOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when BITBUCKET_AUTH_ENABLED=%s',
    (value) => {
      process.env.BITBUCKET_AUTH_ENABLED = value;
      expect(bitbucketOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.BITBUCKET_CLIENT_ID = 'cid';
    process.env.BITBUCKET_CLIENT_SECRET = 'secret';
    process.env.BITBUCKET_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.BITBUCKET_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.BITBUCKET_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(bitbucketOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
