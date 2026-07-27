import { Role } from '@modules/auth/enums/role.enum';
import githubOAuthConfig from './github-oauth.config';

describe('github-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_AUTH_ENABLED;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GITHUB_CALLBACK_URL;
    delete process.env.GITHUB_REDIRECT_ALLOWLIST;
    delete process.env.GITHUB_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(githubOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/github/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when GITHUB_AUTH_ENABLED=%s', (value) => {
    process.env.GITHUB_AUTH_ENABLED = value;
    expect(githubOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when GITHUB_AUTH_ENABLED=%s',
    (value) => {
      process.env.GITHUB_AUTH_ENABLED = value;
      expect(githubOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.GITHUB_CLIENT_ID = 'cid';
    process.env.GITHUB_CLIENT_SECRET = 'secret';
    process.env.GITHUB_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.GITHUB_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.GITHUB_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(githubOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
