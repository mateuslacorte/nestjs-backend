import { Role } from '@modules/auth/enums/role.enum';
import patreonOAuthConfig from './patreon-oauth.config';

describe('patreon-oauth.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.PATREON_AUTH_ENABLED;
        delete process.env.PATREON_CLIENT_ID;
        delete process.env.PATREON_CLIENT_SECRET;
        delete process.env.PATREON_CALLBACK_URL;
        delete process.env.PATREON_REDIRECT_ALLOWLIST;
        delete process.env.PATREON_OAUTH_DEFAULT_ROLES;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults', () => {
        expect(patreonOAuthConfig()).toEqual({
            enabled: false,
            clientId: '',
            clientSecret: '',
            callbackUrl: 'http://localhost:3000/api/v1/auth/patreon/callback',
            redirectAllowlist: [],
            defaultRoles: [],
            exchangeCodeTtlSeconds: 60,
        });
    });

    it.each(['true', '1'])(
        'enables when PATREON_AUTH_ENABLED=%s',
        (value) => {
            process.env.PATREON_AUTH_ENABLED = value;
            expect(patreonOAuthConfig().enabled).toBe(true);
        },
    );

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when PATREON_AUTH_ENABLED=%s',
        (value) => {
            process.env.PATREON_AUTH_ENABLED = value;
            expect(patreonOAuthConfig().enabled).toBe(false);
        },
    );

    it('applies credentials, callback, allowlist, and roles', () => {
        process.env.PATREON_CLIENT_ID = 'cid';
        process.env.PATREON_CLIENT_SECRET = 'secret';
        process.env.PATREON_CALLBACK_URL = 'https://app.example.com/cb';
        process.env.PATREON_REDIRECT_ALLOWLIST =
            ' https://a.com , ,https://b.com ';
        process.env.PATREON_OAUTH_DEFAULT_ROLES = 'user,manager';

        expect(patreonOAuthConfig()).toMatchObject({
            clientId: 'cid',
            clientSecret: 'secret',
            callbackUrl: 'https://app.example.com/cb',
            redirectAllowlist: ['https://a.com', 'https://b.com'],
            defaultRoles: [Role.USER, Role.MANAGER],
            exchangeCodeTtlSeconds: 60,
        });
    });
});
