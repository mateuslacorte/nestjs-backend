import { Role } from '@modules/auth/enums/role.enum';
import amazonOAuthConfig from './amazon-oauth.config';

describe('amazon-oauth.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.AMAZON_AUTH_ENABLED;
        delete process.env.AMAZON_CLIENT_ID;
        delete process.env.AMAZON_CLIENT_SECRET;
        delete process.env.AMAZON_CALLBACK_URL;
        delete process.env.AMAZON_REDIRECT_ALLOWLIST;
        delete process.env.AMAZON_OAUTH_DEFAULT_ROLES;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults', () => {
        expect(amazonOAuthConfig()).toEqual({
            enabled: false,
            clientId: '',
            clientSecret: '',
            callbackUrl: 'http://localhost:3000/api/v1/auth/amazon/callback',
            redirectAllowlist: [],
            defaultRoles: [],
            exchangeCodeTtlSeconds: 60,
        });
    });

    it.each(['true', '1'])(
        'enables when AMAZON_AUTH_ENABLED=%s',
        (value) => {
            process.env.AMAZON_AUTH_ENABLED = value;
            expect(amazonOAuthConfig().enabled).toBe(true);
        },
    );

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when AMAZON_AUTH_ENABLED=%s',
        (value) => {
            process.env.AMAZON_AUTH_ENABLED = value;
            expect(amazonOAuthConfig().enabled).toBe(false);
        },
    );

    it('applies credentials, callback, allowlist, and roles', () => {
        process.env.AMAZON_CLIENT_ID = 'cid';
        process.env.AMAZON_CLIENT_SECRET = 'secret';
        process.env.AMAZON_CALLBACK_URL = 'https://app.example.com/cb';
        process.env.AMAZON_REDIRECT_ALLOWLIST =
            ' https://a.com , ,https://b.com ';
        process.env.AMAZON_OAUTH_DEFAULT_ROLES = 'user,manager';

        expect(amazonOAuthConfig()).toMatchObject({
            clientId: 'cid',
            clientSecret: 'secret',
            callbackUrl: 'https://app.example.com/cb',
            redirectAllowlist: ['https://a.com', 'https://b.com'],
            defaultRoles: [Role.USER, Role.MANAGER],
            exchangeCodeTtlSeconds: 60,
        });
    });
});
