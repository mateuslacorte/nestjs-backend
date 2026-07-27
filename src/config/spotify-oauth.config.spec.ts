import { Role } from '@modules/auth/enums/role.enum';
import spotifyOAuthConfig from './spotify-oauth.config';

describe('spotify-oauth.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.SPOTIFY_AUTH_ENABLED;
        delete process.env.SPOTIFY_CLIENT_ID;
        delete process.env.SPOTIFY_CLIENT_SECRET;
        delete process.env.SPOTIFY_CALLBACK_URL;
        delete process.env.SPOTIFY_REDIRECT_ALLOWLIST;
        delete process.env.SPOTIFY_OAUTH_DEFAULT_ROLES;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults', () => {
        expect(spotifyOAuthConfig()).toEqual({
            enabled: false,
            clientId: '',
            clientSecret: '',
            callbackUrl: 'http://localhost:3000/api/v1/auth/spotify/callback',
            redirectAllowlist: [],
            defaultRoles: [],
            exchangeCodeTtlSeconds: 60,
        });
    });

    it.each(['true', '1'])(
        'enables when SPOTIFY_AUTH_ENABLED=%s',
        (value) => {
            process.env.SPOTIFY_AUTH_ENABLED = value;
            expect(spotifyOAuthConfig().enabled).toBe(true);
        },
    );

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when SPOTIFY_AUTH_ENABLED=%s',
        (value) => {
            process.env.SPOTIFY_AUTH_ENABLED = value;
            expect(spotifyOAuthConfig().enabled).toBe(false);
        },
    );

    it('applies credentials, callback, allowlist, and roles', () => {
        process.env.SPOTIFY_CLIENT_ID = 'cid';
        process.env.SPOTIFY_CLIENT_SECRET = 'secret';
        process.env.SPOTIFY_CALLBACK_URL = 'https://app.example.com/cb';
        process.env.SPOTIFY_REDIRECT_ALLOWLIST =
            ' https://a.com , ,https://b.com ';
        process.env.SPOTIFY_OAUTH_DEFAULT_ROLES = 'user,manager';

        expect(spotifyOAuthConfig()).toMatchObject({
            clientId: 'cid',
            clientSecret: 'secret',
            callbackUrl: 'https://app.example.com/cb',
            redirectAllowlist: ['https://a.com', 'https://b.com'],
            defaultRoles: [Role.USER, Role.MANAGER],
            exchangeCodeTtlSeconds: 60,
        });
    });
});

