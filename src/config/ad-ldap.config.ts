import { registerAs } from '@nestjs/config';
import { parseOAuthDefaultRoles } from './oauth-default-roles.util';

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
    /** Comma-separated roles from AD_LDAP_DEFAULT_ROLES (e.g. user,manager) */
    defaultRoles: parseOAuthDefaultRoles(process.env.AD_LDAP_DEFAULT_ROLES),
}));
