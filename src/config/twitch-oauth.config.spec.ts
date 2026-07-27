import { Role } from '@modules/auth/enums/role.enum';
import twitchOAuthConfig from './twitch-oauth.config';

describe('twitch-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TWITCH_AUTH_ENABLED;
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.TWITCH_CLIENT_SECRET;
    delete process.env.TWITCH_CALLBACK_URL;
    delete process.env.TWITCH_REDIRECT_ALLOWLIST;
    delete process.env.TWITCH_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(twitchOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/twitch/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when TWITCH_AUTH_ENABLED=%s', (value) => {
    process.env.TWITCH_AUTH_ENABLED = value;
    expect(twitchOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when TWITCH_AUTH_ENABLED=%s',
    (value) => {
      process.env.TWITCH_AUTH_ENABLED = value;
      expect(twitchOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.TWITCH_CLIENT_ID = 'cid';
    process.env.TWITCH_CLIENT_SECRET = 'secret';
    process.env.TWITCH_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.TWITCH_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.TWITCH_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(twitchOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
