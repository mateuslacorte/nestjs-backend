import { Role } from '@modules/auth/enums/role.enum';
import appleOAuthConfig from './apple-oauth.config';

describe('apple-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.APPLE_AUTH_ENABLED;
    delete process.env.APPLE_CLIENT_ID;
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;
    delete process.env.APPLE_CALLBACK_URL;
    delete process.env.APPLE_REDIRECT_ALLOWLIST;
    delete process.env.APPLE_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(appleOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      teamId: '',
      keyId: '',
      privateKey: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/apple/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when APPLE_AUTH_ENABLED=%s', (value) => {
    process.env.APPLE_AUTH_ENABLED = value;
    expect(appleOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when APPLE_AUTH_ENABLED=%s',
    (value) => {
      process.env.APPLE_AUTH_ENABLED = value;
      expect(appleOAuthConfig().enabled).toBe(false);
    },
  );

  it('expands \\n in APPLE_PRIVATE_KEY to real newlines', () => {
    process.env.APPLE_PRIVATE_KEY = '-----BEGIN EC PRIVATE KEY-----\\nMHQC\\n-----END EC PRIVATE KEY-----';
    const config = appleOAuthConfig();
    expect(config.privateKey).toBe('-----BEGIN EC PRIVATE KEY-----\nMHQC\n-----END EC PRIVATE KEY-----');
    expect(config.privateKey).not.toContain('\\n');
  });

  it('applies all Apple-specific fields, allowlist, and roles', () => {
    process.env.APPLE_CLIENT_ID = 'com.example.service';
    process.env.APPLE_TEAM_ID = 'TEAM1234';
    process.env.APPLE_KEY_ID = 'ABCDEFGHIJ';
    process.env.APPLE_PRIVATE_KEY = '-----BEGIN EC PRIVATE KEY-----\\nKEY\\n-----END EC PRIVATE KEY-----';
    process.env.APPLE_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.APPLE_REDIRECT_ALLOWLIST = ' https://a.com , ,https://b.com ';
    process.env.APPLE_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(appleOAuthConfig()).toMatchObject({
      clientId: 'com.example.service',
      teamId: 'TEAM1234',
      keyId: 'ABCDEFGHIJ',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
