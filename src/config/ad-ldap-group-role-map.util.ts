import { Role } from '@modules/auth/enums/role.enum';

const ROLE_VALUES = new Set<string>(Object.values(Role));

export interface AdGroupRoleMapping {
    /** Full DN or CN to match against memberOf (case-insensitive). */
    group: string;
    role: Role;
}

/**
 * Parse AD group → Role mappings from env.
 *
 * Format: `groupKey|role;groupKey|role`
 * - `groupKey` may be a full DN (`CN=Nest-Admins,OU=Groups,DC=example,DC=com`)
 *   or a CN / name (`Nest-Admins`)
 * - `role` must be one of: super, admin, manager, user
 *
 * Example:
 * `CN=Nest-Admins,OU=Groups,DC=ex,DC=com|admin;Nest-Managers|manager;Nest-Users|user`
 */
export function parseAdGroupRoleMap(raw?: string): AdGroupRoleMapping[] {
    if (!raw?.trim()) {
        return [];
    }

    const mappings: AdGroupRoleMapping[] = [];

    for (const segment of raw.split(';')) {
        const trimmed = segment.trim();
        if (!trimmed) {
            continue;
        }

        const separatorIndex = trimmed.lastIndexOf('|');
        if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
            continue;
        }

        const group = trimmed.slice(0, separatorIndex).trim();
        const roleToken = trimmed.slice(separatorIndex + 1).trim().toLowerCase();

        if (!group || !ROLE_VALUES.has(roleToken)) {
            continue;
        }

        mappings.push({ group, role: roleToken as Role });
    }

    return mappings;
}

/** Extract CN= value from an LDAP DN (first RDN if it is CN). */
export function extractCnFromDn(dn: string): string | null {
    const match = dn.trim().match(/^CN=([^,]+)/i);
    if (!match) {
        return null;
    }
    return match[1].replace(/\\([,+"\\<>;=#/])/g, '$1').trim();
}

function groupMatches(memberOfDn: string, configuredGroup: string): boolean {
    const haystack = memberOfDn.trim().toLowerCase();
    const needle = configuredGroup.trim().toLowerCase();

    if (!haystack || !needle) {
        return false;
    }

    if (haystack === needle) {
        return true;
    }

    // Allow configuring just the CN / name when memberOf is a full DN
    const cn = extractCnFromDn(memberOfDn)?.toLowerCase();
    return Boolean(cn && cn === needle);
}

/**
 * Resolve app roles from AD `memberOf` groups using the configured map.
 * When the map is empty, returns `defaultRoles` (create-time fallback).
 * When the map is set but no group matches, also falls back to `defaultRoles`.
 */
export function resolveAdLdapRoles(
    memberOf: string[],
    groupRoleMap: AdGroupRoleMapping[],
    defaultRoles: Role[] = [],
): Role[] {
    if (!groupRoleMap.length) {
        return uniqueRoles(defaultRoles);
    }

    const matched = new Set<Role>();
    for (const groupDn of memberOf) {
        for (const mapping of groupRoleMap) {
            if (groupMatches(groupDn, mapping.group)) {
                matched.add(mapping.role);
            }
        }
    }

    if (matched.size === 0) {
        return uniqueRoles(defaultRoles);
    }

    return uniqueRoles([...matched]);
}

function uniqueRoles(roles: Role[]): Role[] {
    const order = Object.values(Role);
    const set = new Set(roles);
    return order.filter((role) => set.has(role));
}

export function rolesEqual(a: Role[] | undefined, b: Role[]): boolean {
    const left = uniqueRoles(a ?? []);
    const right = uniqueRoles(b);
    if (left.length !== right.length) {
        return false;
    }
    return left.every((role, index) => role === right[index]);
}
