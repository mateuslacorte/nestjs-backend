import { Role } from '@modules/auth/enums/role.enum';
import linkedinOAuthConfig from './linkedin-oauth.config';

describe('linkedin-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.LINKEDIN_AUTH_ENABLED;
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
    delete process.env.LINKEDIN_CALLBACK_URL;
    delete process.env.LINKEDIN_REDIRECT_ALLOWLIST;
    delete process.env.LINKEDIN_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(linkedinOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/linkedin/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when LINKEDIN_AUTH_ENABLED=%s', (value) => {
    process.env.LINKEDIN_AUTH_ENABLED = value;
    expect(linkedinOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when LINKEDIN_AUTH_ENABLED=%s',
    (value) => {
      process.env.LINKEDIN_AUTH_ENABLED = value;
      expect(linkedinOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.LINKEDIN_CLIENT_ID = 'cid';
    process.env.LINKEDIN_CLIENT_SECRET = 'secret';
    process.env.LINKEDIN_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.LINKEDIN_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.LINKEDIN_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(linkedinOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
