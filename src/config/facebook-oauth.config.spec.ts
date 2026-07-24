import { Role } from '@modules/auth/enums/role.enum';
import facebookOAuthConfig from './facebook-oauth.config';

describe('facebook-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FACEBOOK_AUTH_ENABLED;
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.FACEBOOK_CALLBACK_URL;
    delete process.env.FACEBOOK_REDIRECT_ALLOWLIST;
    delete process.env.FACEBOOK_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(facebookOAuthConfig()).toEqual({
      enabled: false,
      appId: '',
      appSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/facebook/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when FACEBOOK_AUTH_ENABLED=%s', (value) => {
    process.env.FACEBOOK_AUTH_ENABLED = value;
    expect(facebookOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when FACEBOOK_AUTH_ENABLED=%s',
    (value) => {
      process.env.FACEBOOK_AUTH_ENABLED = value;
      expect(facebookOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.FACEBOOK_APP_ID = 'app-id';
    process.env.FACEBOOK_APP_SECRET = 'app-secret';
    process.env.FACEBOOK_CALLBACK_URL = 'https://app.example.com/fb';
    process.env.FACEBOOK_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.FACEBOOK_OAUTH_DEFAULT_ROLES = 'user,admin';

    expect(facebookOAuthConfig()).toMatchObject({
      appId: 'app-id',
      appSecret: 'app-secret',
      callbackUrl: 'https://app.example.com/fb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.ADMIN],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
