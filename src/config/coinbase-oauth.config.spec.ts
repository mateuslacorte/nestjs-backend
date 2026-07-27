import { Role } from '@modules/auth/enums/role.enum';
import coinbaseOAuthConfig from './coinbase-oauth.config';

describe('coinbase-oauth.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.COINBASE_AUTH_ENABLED;
        delete process.env.COINBASE_CLIENT_ID;
        delete process.env.COINBASE_CLIENT_SECRET;
        delete process.env.COINBASE_CALLBACK_URL;
        delete process.env.COINBASE_REDIRECT_ALLOWLIST;
        delete process.env.COINBASE_OAUTH_DEFAULT_ROLES;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults', () => {
        expect(coinbaseOAuthConfig()).toEqual({
            enabled: false,
            clientId: '',
            clientSecret: '',
            callbackUrl: 'http://localhost:3000/api/v1/auth/coinbase/callback',
            redirectAllowlist: [],
            defaultRoles: [],
            exchangeCodeTtlSeconds: 60,
        });
    });

    it.each(['true', '1'])(
        'enables when COINBASE_AUTH_ENABLED=%s',
        (value) => {
            process.env.COINBASE_AUTH_ENABLED = value;
            expect(coinbaseOAuthConfig().enabled).toBe(true);
        },
    );

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when COINBASE_AUTH_ENABLED=%s',
        (value) => {
            process.env.COINBASE_AUTH_ENABLED = value;
            expect(coinbaseOAuthConfig().enabled).toBe(false);
        },
    );

    it('applies credentials, callback, allowlist, and roles', () => {
        process.env.COINBASE_CLIENT_ID = 'cid';
        process.env.COINBASE_CLIENT_SECRET = 'secret';
        process.env.COINBASE_CALLBACK_URL = 'https://app.example.com/cb';
        process.env.COINBASE_REDIRECT_ALLOWLIST =
            ' https://a.com , ,https://b.com ';
        process.env.COINBASE_OAUTH_DEFAULT_ROLES = 'user,manager';

        expect(coinbaseOAuthConfig()).toMatchObject({
            clientId: 'cid',
            clientSecret: 'secret',
            callbackUrl: 'https://app.example.com/cb',
            redirectAllowlist: ['https://a.com', 'https://b.com'],
            defaultRoles: [Role.USER, Role.MANAGER],
            exchangeCodeTtlSeconds: 60,
        });
    });
});
