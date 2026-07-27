import { Role } from '@modules/auth/enums/role.enum';
import dropboxOAuthConfig from './dropbox-oauth.config';

describe('dropbox-oauth.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.DROPBOX_AUTH_ENABLED;
        delete process.env.DROPBOX_CLIENT_ID;
        delete process.env.DROPBOX_CLIENT_SECRET;
        delete process.env.DROPBOX_CALLBACK_URL;
        delete process.env.DROPBOX_REDIRECT_ALLOWLIST;
        delete process.env.DROPBOX_OAUTH_DEFAULT_ROLES;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults', () => {
        expect(dropboxOAuthConfig()).toEqual({
            enabled: false,
            clientId: '',
            clientSecret: '',
            callbackUrl: 'http://localhost:3000/api/v1/auth/dropbox/callback',
            redirectAllowlist: [],
            defaultRoles: [],
            exchangeCodeTtlSeconds: 60,
        });
    });

    it.each(['true', '1'])(
        'enables when DROPBOX_AUTH_ENABLED=%s',
        (value) => {
            process.env.DROPBOX_AUTH_ENABLED = value;
            expect(dropboxOAuthConfig().enabled).toBe(true);
        },
    );

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when DROPBOX_AUTH_ENABLED=%s',
        (value) => {
            process.env.DROPBOX_AUTH_ENABLED = value;
            expect(dropboxOAuthConfig().enabled).toBe(false);
        },
    );

    it('applies credentials, callback, allowlist, and roles', () => {
        process.env.DROPBOX_CLIENT_ID = 'cid';
        process.env.DROPBOX_CLIENT_SECRET = 'secret';
        process.env.DROPBOX_CALLBACK_URL = 'https://app.example.com/cb';
        process.env.DROPBOX_REDIRECT_ALLOWLIST =
            ' https://a.com , ,https://b.com ';
        process.env.DROPBOX_OAUTH_DEFAULT_ROLES = 'user,manager';

        expect(dropboxOAuthConfig()).toMatchObject({
            clientId: 'cid',
            clientSecret: 'secret',
            callbackUrl: 'https://app.example.com/cb',
            redirectAllowlist: ['https://a.com', 'https://b.com'],
            defaultRoles: [Role.USER, Role.MANAGER],
            exchangeCodeTtlSeconds: 60,
        });
    });
});
