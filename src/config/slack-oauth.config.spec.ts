import { Role } from '@modules/auth/enums/role.enum';
import slackOAuthConfig from './slack-oauth.config';

describe('slack-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SLACK_AUTH_ENABLED;
    delete process.env.SLACK_CLIENT_ID;
    delete process.env.SLACK_CLIENT_SECRET;
    delete process.env.SLACK_CALLBACK_URL;
    delete process.env.SLACK_REDIRECT_ALLOWLIST;
    delete process.env.SLACK_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(slackOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/slack/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when SLACK_AUTH_ENABLED=%s', (value) => {
    process.env.SLACK_AUTH_ENABLED = value;
    expect(slackOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when SLACK_AUTH_ENABLED=%s',
    (value) => {
      process.env.SLACK_AUTH_ENABLED = value;
      expect(slackOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.SLACK_CLIENT_ID = 'cid';
    process.env.SLACK_CLIENT_SECRET = 'secret';
    process.env.SLACK_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.SLACK_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.SLACK_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(slackOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
