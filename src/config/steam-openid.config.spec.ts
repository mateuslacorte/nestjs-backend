import { Role } from '@modules/auth/enums/role.enum';
import steamOpenIdConfig from './steam-openid.config';

describe('steam-openid.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STEAM_AUTH_ENABLED;
    delete process.env.STEAM_API_KEY;
    delete process.env.STEAM_CALLBACK_URL;
    delete process.env.STEAM_REALM;
    delete process.env.STEAM_REDIRECT_ALLOWLIST;
    delete process.env.STEAM_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(steamOpenIdConfig()).toEqual({
      enabled: false,
      apiKey: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/steam/callback',
      realm: 'http://localhost:3000/',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when STEAM_AUTH_ENABLED=%s', (value) => {
    process.env.STEAM_AUTH_ENABLED = value;
    expect(steamOpenIdConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when STEAM_AUTH_ENABLED=%s',
    (value) => {
      process.env.STEAM_AUTH_ENABLED = value;
      expect(steamOpenIdConfig().enabled).toBe(false);
    },
  );

  it('applies api key, callback, realm, allowlist, and roles', () => {
    process.env.STEAM_API_KEY = 'steam-key';
    process.env.STEAM_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.STEAM_REALM = 'https://app.example.com/';
    process.env.STEAM_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.STEAM_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(steamOpenIdConfig()).toMatchObject({
      apiKey: 'steam-key',
      callbackUrl: 'https://app.example.com/cb',
      realm: 'https://app.example.com/',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
