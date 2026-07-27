import { Role } from '@modules/auth/enums/role.enum';
import microsoftOAuthConfig from './microsoft-oauth.config';

describe('microsoft-oauth.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.MICROSOFT_AUTH_ENABLED;
        delete process.env.MICROSOFT_CLIENT_ID;
        delete process.env.MICROSOFT_CLIENT_SECRET;
        delete process.env.MICROSOFT_TENANT_ID;
        delete process.env.MICROSOFT_CALLBACK_URL;
        delete process.env.MICROSOFT_REDIRECT_ALLOWLIST;
        delete process.env.MICROSOFT_OAUTH_DEFAULT_ROLES;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults with common tenant URLs', () => {
        expect(microsoftOAuthConfig()).toEqual({
            enabled: false,
            clientId: '',
            clientSecret: '',
            tenantId: 'common',
            authorizationUrl:
                'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenUrl:
                'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            callbackUrl: 'http://localhost:3000/api/v1/auth/microsoft/callback',
            redirectAllowlist: [],
            defaultRoles: [],
            exchangeCodeTtlSeconds: 60,
        });
    });

    it.each(['true', '1'])(
        'enables when MICROSOFT_AUTH_ENABLED=%s',
        (value) => {
            process.env.MICROSOFT_AUTH_ENABLED = value;
            expect(microsoftOAuthConfig().enabled).toBe(true);
        },
    );

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when MICROSOFT_AUTH_ENABLED=%s',
        (value) => {
            process.env.MICROSOFT_AUTH_ENABLED = value;
            expect(microsoftOAuthConfig().enabled).toBe(false);
        },
    );

    it('applies credentials, tenant, callback, allowlist, and roles', () => {
        process.env.MICROSOFT_CLIENT_ID = 'cid';
        process.env.MICROSOFT_CLIENT_SECRET = 'secret';
        process.env.MICROSOFT_TENANT_ID = 'tenant-guid-123';
        process.env.MICROSOFT_CALLBACK_URL = 'https://app.example.com/cb';
        process.env.MICROSOFT_REDIRECT_ALLOWLIST =
            ' https://a.com , ,https://b.com ';
        process.env.MICROSOFT_OAUTH_DEFAULT_ROLES = 'user,manager';

        expect(microsoftOAuthConfig()).toMatchObject({
            clientId: 'cid',
            clientSecret: 'secret',
            tenantId: 'tenant-guid-123',
            authorizationUrl:
                'https://login.microsoftonline.com/tenant-guid-123/oauth2/v2.0/authorize',
            tokenUrl:
                'https://login.microsoftonline.com/tenant-guid-123/oauth2/v2.0/token',
            callbackUrl: 'https://app.example.com/cb',
            redirectAllowlist: ['https://a.com', 'https://b.com'],
            defaultRoles: [Role.USER, Role.MANAGER],
            exchangeCodeTtlSeconds: 60,
        });
    });
});
