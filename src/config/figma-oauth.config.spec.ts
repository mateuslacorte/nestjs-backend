import { Role } from '@modules/auth/enums/role.enum';
import figmaOAuthConfig from './figma-oauth.config';

describe('figma-oauth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FIGMA_AUTH_ENABLED;
    delete process.env.FIGMA_CLIENT_ID;
    delete process.env.FIGMA_CLIENT_SECRET;
    delete process.env.FIGMA_CALLBACK_URL;
    delete process.env.FIGMA_REDIRECT_ALLOWLIST;
    delete process.env.FIGMA_OAUTH_DEFAULT_ROLES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns disabled defaults', () => {
    expect(figmaOAuthConfig()).toEqual({
      enabled: false,
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/v1/auth/figma/callback',
      redirectAllowlist: [],
      defaultRoles: [],
      exchangeCodeTtlSeconds: 60,
    });
  });

  it.each(['true', '1'])('enables when FIGMA_AUTH_ENABLED=%s', (value) => {
    process.env.FIGMA_AUTH_ENABLED = value;
    expect(figmaOAuthConfig().enabled).toBe(true);
  });

  it.each(['yes', 'TRUE', 'false', ''])(
    'does not enable when FIGMA_AUTH_ENABLED=%s',
    (value) => {
      process.env.FIGMA_AUTH_ENABLED = value;
      expect(figmaOAuthConfig().enabled).toBe(false);
    },
  );

  it('applies credentials, callback, allowlist, and roles', () => {
    process.env.FIGMA_CLIENT_ID = 'cid';
    process.env.FIGMA_CLIENT_SECRET = 'secret';
    process.env.FIGMA_CALLBACK_URL = 'https://app.example.com/cb';
    process.env.FIGMA_REDIRECT_ALLOWLIST =
      ' https://a.com , ,https://b.com ';
    process.env.FIGMA_OAUTH_DEFAULT_ROLES = 'user,manager';

    expect(figmaOAuthConfig()).toMatchObject({
      clientId: 'cid',
      clientSecret: 'secret',
      callbackUrl: 'https://app.example.com/cb',
      redirectAllowlist: ['https://a.com', 'https://b.com'],
      defaultRoles: [Role.USER, Role.MANAGER],
      exchangeCodeTtlSeconds: 60,
    });
  });
});
