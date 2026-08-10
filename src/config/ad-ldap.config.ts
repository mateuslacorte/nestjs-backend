import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';
import { parseAdGroupRoleMap } from './ad-ldap-group-role-map.util';

const DEFAULT_USER_FILTER =
    '(|(sAMAccountName={{username}})(userPrincipalName={{username}}))';

export default registerAs('adLdap', () => ({
    enabled:
        process.env.AD_LDAP_ENABLED === 'true' ||
        process.env.AD_LDAP_ENABLED === '1',
    url: process.env.AD_LDAP_URL || '',
    baseDn: process.env.AD_LDAP_BASE_DN || '',
    bindDn: process.env.AD_LDAP_BIND_DN || '',
    bindPassword: process.env.AD_LDAP_BIND_PASSWORD || '',
    userSearchFilter: process.env.AD_LDAP_USER_FILTER || DEFAULT_USER_FILTER,
    tlsRejectUnauthorized:
        process.env.AD_LDAP_TLS_REJECT_UNAUTHORIZED !== 'false' &&
        process.env.AD_LDAP_TLS_REJECT_UNAUTHORIZED !== '0',
    connectTimeoutMs: Number(process.env.AD_LDAP_CONNECT_TIMEOUT_MS) || 5000,
    /**
     * Fallback roles when AD_LDAP_GROUP_ROLE_MAP is empty, or when the map is
     * set but the user matches no configured AD group.
     */
    defaultRoles: parseOAuthDefaultRoles(process.env.AD_LDAP_DEFAULT_ROLES),
    /**
     * Map AD security groups (from memberOf / GPO-assigned groups) to app roles.
     * Format: `groupDnOrCn|role;groupDnOrCn|role`
     * Example: `CN=Nest-Admins,OU=Groups,DC=ex,DC=com|admin;Nest-Users|user`
     */
    groupRoleMap: parseAdGroupRoleMap(process.env.AD_LDAP_GROUP_ROLE_MAP),
    /**
     * When true (default), refresh local user.roles from AD groups on every
     * successful AD login (only when groupRoleMap is non-empty).
     */
    syncRolesOnLogin:
        process.env.AD_LDAP_SYNC_ROLES_ON_LOGIN !== 'false' &&
        process.env.AD_LDAP_SYNC_ROLES_ON_LOGIN !== '0',
}));
