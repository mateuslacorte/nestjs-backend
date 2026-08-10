import { Role } from '@modules/auth/enums/role.enum';
import {
    extractCnFromDn,
    parseAdGroupRoleMap,
    resolveAdLdapRoles,
    rolesEqual,
} from './ad-ldap-group-role-map.util';

describe('parseAdGroupRoleMap', () => {
    it('returns empty array for empty/undefined input', () => {
        expect(parseAdGroupRoleMap()).toEqual([]);
        expect(parseAdGroupRoleMap('')).toEqual([]);
        expect(parseAdGroupRoleMap('   ')).toEqual([]);
    });

    it('parses DN and CN mappings', () => {
        expect(
            parseAdGroupRoleMap(
                'CN=Nest-Admins,OU=Groups,DC=ex,DC=com|admin;Nest-Managers|manager;Nest-Users|user',
            ),
        ).toEqual([
            {
                group: 'CN=Nest-Admins,OU=Groups,DC=ex,DC=com',
                role: Role.ADMIN,
            },
            { group: 'Nest-Managers', role: Role.MANAGER },
            { group: 'Nest-Users', role: Role.USER },
        ]);
    });

    it('ignores invalid segments and roles', () => {
        expect(
            parseAdGroupRoleMap(
                'Nest-Admins|;|admin;Bad|owner;Good|super;;  ',
            ),
        ).toEqual([{ group: 'Good', role: Role.SUPER }]);
    });
});

describe('extractCnFromDn', () => {
    it('extracts CN from DN', () => {
        expect(extractCnFromDn('CN=Nest-Admins,OU=Groups,DC=ex,DC=com')).toBe(
            'Nest-Admins',
        );
    });

    it('returns null when DN has no CN RDN', () => {
        expect(extractCnFromDn('OU=Groups,DC=ex,DC=com')).toBeNull();
    });
});

describe('resolveAdLdapRoles', () => {
    const map = parseAdGroupRoleMap(
        'CN=Nest-Admins,OU=Groups,DC=ex,DC=com|admin;Nest-Managers|manager;Nest-Users|user',
    );

    it('returns defaultRoles when map is empty', () => {
        expect(resolveAdLdapRoles(['CN=X'], [], [Role.USER])).toEqual([
            Role.USER,
        ]);
    });

    it('maps memberOf DNs by full DN and by CN', () => {
        expect(
            resolveAdLdapRoles(
                [
                    'CN=Nest-Admins,OU=Groups,DC=ex,DC=com',
                    'CN=Nest-Managers,OU=Groups,DC=ex,DC=com',
                ],
                map,
                [Role.USER],
            ),
        ).toEqual([Role.ADMIN, Role.MANAGER]);
    });

    it('falls back to defaultRoles when no group matches', () => {
        expect(
            resolveAdLdapRoles(
                ['CN=Unmapped,OU=Groups,DC=ex,DC=com'],
                map,
                [Role.USER],
            ),
        ).toEqual([Role.USER]);
    });

    it('dedupes and orders roles by Role enum order', () => {
        expect(
            resolveAdLdapRoles(
                [
                    'CN=Nest-Users,OU=Groups,DC=ex,DC=com',
                    'CN=Nest-Admins,OU=Groups,DC=ex,DC=com',
                    'CN=Nest-Users,OU=Groups,DC=ex,DC=com',
                ],
                map,
                [],
            ),
        ).toEqual([Role.ADMIN, Role.USER]);
    });

    it('ignores blank memberOf entries and blank configured groups', () => {
        expect(
            resolveAdLdapRoles(
                ['', '   ', 'CN=Nest-Admins,OU=Groups,DC=ex,DC=com'],
                [...map, { group: '   ', role: Role.SUPER }],
                [Role.USER],
            ),
        ).toEqual([Role.ADMIN]);
    });

    it('defaults defaultRoles to [] when the third argument is omitted', () => {
        expect(
            resolveAdLdapRoles(
                ['CN=Nest-Admins,OU=Groups,DC=ex,DC=com'],
                map,
            ),
        ).toEqual([Role.ADMIN]);
    });
});

describe('rolesEqual', () => {
    it('compares role sets ignoring order/duplicates', () => {
        expect(rolesEqual([Role.USER, Role.ADMIN], [Role.ADMIN, Role.USER])).toBe(
            true,
        );
        expect(rolesEqual([Role.USER], [Role.ADMIN])).toBe(false);
        expect(rolesEqual(undefined, [])).toBe(true);
    });
});
