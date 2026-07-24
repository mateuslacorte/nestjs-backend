import { Role } from '@modules/auth/enums/role.enum';
import googleOAuthConfig from './google-oauth.config';

describe('google-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_AUTH_ENABLED;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CALLBACK_URL;
    delete process.env.GOOGLE_REDIRECT_ALLOWLIST;
    delete process.env.GOOGLE_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(googleOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/google/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when GOOGLE_AUTH_ENABLED=%s', (value) => {
    process.env.GOOGLE_AUTH_ENABLED = value;
    expect(googleOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when GOOGLE_AUTH_ENABLED=%s',
    (value) => {
      process.env.GOOGLE_AUTH_ENABLED = value;
      expect(googleOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.GOOGLE_CLIENT_ID = 'cid';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.GOOGLE_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.GOOGLE_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(googleOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
