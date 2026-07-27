import { Role } from '@modules/auth/enums/role.enum';
import metamaskAuthConfig from './metamask-auth.config';

describe('metamask-auth.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.METAMASK_AUTH_ENABLED;
        delete process.env.METAMASK_DOMAIN;
        delete process.env.METAMASK_URI;
        delete process.env.METAMASK_STATEMENT;
        delete process.env.METAMASK_CHAIN_IDS;
        delete process.env.METAMASK_NONCE_TTL_SECONDS;
        delete process.env.METAMASK_OAUTH_DEFAULT_ROLES;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults', () => {
        expect(metamaskAuthConfig()).toEqual({
            enabled: false,
            domain: 'localhost',
            uri: 'http://localhost:3000',
            statement: 'Sign in to the NestJS Boilerplate',
            chainIds: [1],
            nonceTtlSeconds: 300,
            defaultRoles: [],
        });
    });

    it.each(['true', '1'])(
        'enables when METAMASK_AUTH_ENABLED=%s',
        (value) => {
            process.env.METAMASK_AUTH_ENABLED = value;
            expect(metamaskAuthConfig().enabled).toBe(true);
        },
    );

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when METAMASK_AUTH_ENABLED=%s',
        (value) => {
            process.env.METAMASK_AUTH_ENABLED = value;
            expect(metamaskAuthConfig().enabled).toBe(false);
        },
    );

    it('applies domain, uri, statement, chainIds, roles, and ttl', () => {
        process.env.METAMASK_DOMAIN = 'app.example.com';
        process.env.METAMASK_URI = 'https://app.example.com';
        process.env.METAMASK_STATEMENT = 'Sign in to Example';
        process.env.METAMASK_CHAIN_IDS = '1, 11155111 ,999';
        process.env.METAMASK_NONCE_TTL_SECONDS = '120';
        process.env.METAMASK_OAUTH_DEFAULT_ROLES = 'user,manager';

        expect(metamaskAuthConfig()).toMatchObject({
            domain: 'app.example.com',
            uri: 'https://app.example.com',
            statement: 'Sign in to Example',
            chainIds: [1, 11155111, 999],
            nonceTtlSeconds: 120,
            defaultRoles: [Role.USER, Role.MANAGER],
        });
    });

    it('falls back to chainId 1 when METAMASK_CHAIN_IDS is invalid', () => {
        process.env.METAMASK_CHAIN_IDS = 'abc,0,-1';
        expect(metamaskAuthConfig().chainIds).toEqual([1]);
    });
});
