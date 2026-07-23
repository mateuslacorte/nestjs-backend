import { Role } from '@modules/auth/enums/role.enum';

const ROLE_VALUES = new Set<string>(Object.values(Role));

/**
 * Parse comma-separated Role values from env (e.g. "user" or "user,manager").
 * Invalid tokens are ignored. Empty/unset → [].
 */
export function parseOAuthDefaultRoles(raw?: string): Role[] {
    if (!raw?.trim()) {
        return [];
    }

    return raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is Role => ROLE_VALUES.has(s));
}
