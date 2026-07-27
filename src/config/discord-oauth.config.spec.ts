import { Role } from '@modules/auth/enums/role.enum';
import discordOAuthConfig from './discord-oauth.config';

describe('discord-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DISCORD_AUTH_ENABLED;
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_CLIENT_SECRET;
    delete process.env.DISCORD_CALLBACK_URL;
    delete process.env.DISCORD_REDIRECT_ALLOWLIST;
    delete process.env.DISCORD_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(discordOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/discord/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when DISCORD_AUTH_ENABLED=%s', (value) => {
    process.env.DISCORD_AUTH_ENABLED = value;
    expect(discordOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when DISCORD_AUTH_ENABLED=%s',
    (value) => {
      process.env.DISCORD_AUTH_ENABLED = value;
      expect(discordOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.DISCORD_CLIENT_ID = 'cid';
    process.env.DISCORD_CLIENT_SECRET = 'secret';
    process.env.DISCORD_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.DISCORD_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.DISCORD_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(discordOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
