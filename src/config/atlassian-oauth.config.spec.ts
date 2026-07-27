import { Role } from '@modules/auth/enums/role.enum';
import atlassianOAuthConfig from './atlassian-oauth.config';

describe('atlassian-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ATLASSIAN_AUTH_ENABLED;
    delete process.env.ATLASSIAN_CLIENT_ID;
    delete process.env.ATLASSIAN_CLIENT_SECRET;
    delete process.env.ATLASSIAN_CALLBACK_URL;
    delete process.env.ATLASSIAN_REDIRECT_ALLOWLIST;
    delete process.env.ATLASSIAN_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(atlassianOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/atlassian/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when ATLASSIAN_AUTH_ENABLED=%s', (value) => {
    process.env.ATLASSIAN_AUTH_ENABLED = value;
    expect(atlassianOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when ATLASSIAN_AUTH_ENABLED=%s',
    (value) => {
      process.env.ATLASSIAN_AUTH_ENABLED = value;
      expect(atlassianOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.ATLASSIAN_CLIENT_ID = 'cid';
    process.env.ATLASSIAN_CLIENT_SECRET = 'secret';
    process.env.ATLASSIAN_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.ATLASSIAN_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.ATLASSIAN_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(atlassianOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
