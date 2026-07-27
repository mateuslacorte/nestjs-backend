import { Role } from '@modules/auth/enums/role.enum';
import gitlabOAuthConfig from './gitlab-oauth.config';

describe('gitlab-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITLAB_AUTH_ENABLED;
    delete process.env.GITLAB_CLIENT_ID;
    delete process.env.GITLAB_CLIENT_SECRET;
    delete process.env.GITLAB_CALLBACK_URL;
    delete process.env.GITLAB_REDIRECT_ALLOWLIST;
    delete process.env.GITLAB_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(gitlabOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/gitlab/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when GITLAB_AUTH_ENABLED=%s', (value) => {
    process.env.GITLAB_AUTH_ENABLED = value;
    expect(gitlabOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when GITLAB_AUTH_ENABLED=%s',
    (value) => {
      process.env.GITLAB_AUTH_ENABLED = value;
      expect(gitlabOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.GITLAB_CLIENT_ID = 'cid';
    process.env.GITLAB_CLIENT_SECRET = 'secret';
    process.env.GITLAB_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.GITLAB_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.GITLAB_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(gitlabOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
