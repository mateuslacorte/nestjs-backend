import { Role } from '@modules/auth/enums/role.enum';
import adLdapConfig from './ad-ldap.config';

describe('ad-ldap.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.AD_LDAP_ENABLED;
        delete process.env.AD_LDAP_URL;
        delete process.env.AD_LDAP_BASE_DN;
        delete process.env.AD_LDAP_BIND_DN;
        delete process.env.AD_LDAP_BIND_PASSWORD;
        delete process.env.AD_LDAP_USER_FILTER;
        delete process.env.AD_LDAP_TLS_REJECT_UNAUTHORIZED;
        delete process.env.AD_LDAP_CONNECT_TIMEOUT_MS;
        delete process.env.AD_LDAP_DEFAULT_ROLES;
        delete process.env.AD_LDAP_GROUP_ROLE_MAP;
        delete process.env.AD_LDAP_SYNC_ROLES_ON_LOGIN;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns disabled defaults', () => {
        expect(adLdapConfig()).toEqual({
            enabled: false,
            url: '',
            baseDn: '',
            bindDn: '',
            bindPassword: '',
            userSearchFilter:
                '(|(sAMAccountName={{username}})(userPrincipalName={{username}}))',
            tlsRejectUnauthorized: true,
            connectTimeoutMs: 5000,
            defaultRoles: [],
            groupRoleMap: [],
            syncRolesOnLogin: true,
        });
    });

    it.each(['true', '1'])('enables when AD_LDAP_ENABLED=%s', (value) => {
        process.env.AD_LDAP_ENABLED = value;
        expect(adLdapConfig().enabled).toBe(true);
    });

    it.each(['yes', 'TRUE', 'false', ''])(
        'does not enable when AD_LDAP_ENABLED=%s',
        (value) => {
            process.env.AD_LDAP_ENABLED = value;
            expect(adLdapConfig().enabled).toBe(false);
        },
    );

    it('applies LDAP settings and roles', () => {
        process.env.AD_LDAP_URL = 'ldaps://dc.example.com:636';
        process.env.AD_LDAP_BASE_DN = 'DC=example,DC=com';
        process.env.AD_LDAP_BIND_DN = 'CN=svc,CN=Users,DC=example,DC=com';
        process.env.AD_LDAP_BIND_PASSWORD = 'secret';
        process.env.AD_LDAP_USER_FILTER = '(sAMAccountName={{username}})';
        process.env.AD_LDAP_TLS_REJECT_UNAUTHORIZED = 'false';
        process.env.AD_LDAP_CONNECT_TIMEOUT_MS = '8000';
        process.env.AD_LDAP_DEFAULT_ROLES = 'user,manager';
        process.env.AD_LDAP_GROUP_ROLE_MAP =
            'CN=Nest-Admins,OU=Groups,DC=example,DC=com|admin;Nest-Users|user';
        process.env.AD_LDAP_SYNC_ROLES_ON_LOGIN = 'false';

        expect(adLdapConfig()).toMatchObject({
            url: 'ldaps://dc.example.com:636',
            baseDn: 'DC=example,DC=com',
            bindDn: 'CN=svc,CN=Users,DC=example,DC=com',
            bindPassword: 'secret',
            userSearchFilter: '(sAMAccountName={{username}})',
            tlsRejectUnauthorized: false,
            connectTimeoutMs: 8000,
            defaultRoles: [Role.USER, Role.MANAGER],
            groupRoleMap: [
                {
                    group: 'CN=Nest-Admins,OU=Groups,DC=example,DC=com',
                    role: Role.ADMIN,
                },
                { group: 'Nest-Users', role: Role.USER },
            ],
            syncRolesOnLogin: false,
        });
    });
});
