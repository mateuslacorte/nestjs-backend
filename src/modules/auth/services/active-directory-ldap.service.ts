import {
    Injectable,
    UnauthorizedException,
    ServiceUnavailableException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'ldapts';
import { ActiveDirectoryProfilePayload } from '../interfaces/active-directory-profile.interface';

/** Escape special characters in LDAP filter values (RFC 4515). */
export function escapeLdapFilterValue(value: string): string {
    return value.replace(/[\0*()\\]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\${hex}`;
    });
}

function normalizeObjectGuid(raw: unknown): string | null {
    if (raw == null) {
        return null;
    }
    if (Buffer.isBuffer(raw)) {
        return raw.toString('hex');
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (/^[0-9a-f]{32}$/i.test(trimmed.replace(/-/g, ''))) {
            return trimmed.replace(/-/g, '').toLowerCase();
        }
        return trimmed;
    }
    return null;
}

function getAttribute(
    entry: Record<string, unknown>,
    name: string,
): string | undefined {
    const values = getAttributeValues(entry, name);
    return values[0];
}

function getAttributeValues(
    entry: Record<string, unknown>,
    name: string,
): string[] {
    const value = entry[name];
    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }
    if (Array.isArray(value)) {
        return value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

function splitDisplayName(displayName: string): {
    firstName: string;
    lastName: string;
} {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
}

@Injectable()
export class ActiveDirectoryLdapService {
    constructor(private readonly configService: ConfigService) {}

    assertEnabled(): void {
        if (!this.configService.get<boolean>('adLdap.enabled')) {
            throw new ServiceUnavailableException(
                'Active Directory authentication is disabled',
            );
        }
    }

    async authenticate(
        username: string,
        password: string,
    ): Promise<ActiveDirectoryProfilePayload> {
        this.assertEnabled();

        const url = this.configService.get<string>('adLdap.url') ?? '';
        const baseDn = this.configService.get<string>('adLdap.baseDn') ?? '';
        const bindDn = this.configService.get<string>('adLdap.bindDn') ?? '';
        const bindPassword =
            this.configService.get<string>('adLdap.bindPassword') ?? '';
        const userSearchFilter =
            this.configService.get<string>('adLdap.userSearchFilter') ?? '';
        const tlsRejectUnauthorized =
            this.configService.get<boolean>('adLdap.tlsRejectUnauthorized') ??
            true;
        const connectTimeoutMs =
            this.configService.get<number>('adLdap.connectTimeoutMs') ?? 5000;

        if (!url || !baseDn || !bindDn || !bindPassword) {
            throw new ServiceUnavailableException(
                'Active Directory LDAP is not fully configured',
            );
        }

        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            throw new BadRequestException('Username is required');
        }

        const escapedUsername = escapeLdapFilterValue(trimmedUsername);
        const filter = userSearchFilter.replace(
            /\{\{username\}\}/g,
            escapedUsername,
        );

        const isLdaps = url.toLowerCase().startsWith('ldaps://');
        const client = new Client({
            url,
            timeout: connectTimeoutMs,
            connectTimeout: connectTimeoutMs,
            tlsOptions: isLdaps
                ? { rejectUnauthorized: tlsRejectUnauthorized }
                : undefined,
        });

        try {
            await client.bind(bindDn, bindPassword);

            const { searchEntries } = await client.search(baseDn, {
                scope: 'sub',
                filter,
                attributes: [
                    'dn',
                    'objectGUID',
                    'mail',
                    'userPrincipalName',
                    'givenName',
                    'sn',
                    'displayName',
                    'sAMAccountName',
                    'memberOf',
                ],
            });

            if (!searchEntries.length) {
                throw new UnauthorizedException('Invalid credentials');
            }

            const entry = searchEntries[0] as Record<string, unknown>;
            const userDn = getAttribute(entry, 'dn') ?? String(entry.dn ?? '');
            if (!userDn) {
                throw new UnauthorizedException('Invalid credentials');
            }

            await client.bind(userDn, password);

            const activeDirectoryId = normalizeObjectGuid(entry.objectGUID);
            if (!activeDirectoryId) {
                throw new UnauthorizedException('Invalid credentials');
            }

            const email =
                getAttribute(entry, 'mail') ??
                getAttribute(entry, 'userPrincipalName');
            if (!email) {
                throw new UnauthorizedException('Invalid credentials');
            }

            let firstName = getAttribute(entry, 'givenName') ?? '';
            let lastName = getAttribute(entry, 'sn') ?? '';

            if (!firstName && !lastName) {
                const displayName = getAttribute(entry, 'displayName');
                if (displayName) {
                    const split = splitDisplayName(displayName);
                    firstName = split.firstName;
                    lastName = split.lastName;
                }
            }

            if (!firstName) {
                firstName = 'ActiveDirectory';
            }

            return {
                activeDirectoryId,
                email,
                firstName,
                lastName,
                samAccountName: getAttribute(entry, 'sAMAccountName'),
                groups: getAttributeValues(entry, 'memberOf'),
            };
        } catch (error) {
            if (
                error instanceof UnauthorizedException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }

            const message =
                error instanceof Error ? error.message : String(error);
            if (
                message.includes('Invalid Credentials') ||
                message.includes('data 52e') ||
                message.includes('data 525') ||
                message.includes('data 532') ||
                message.includes('data 533') ||
                message.includes('data 701') ||
                message.includes('data 773')
            ) {
                throw new UnauthorizedException('Invalid credentials');
            }

            throw new ServiceUnavailableException(
                'Active Directory server is unavailable',
            );
        } finally {
            try {
                await client.unbind();
            } catch {
                // ignore unbind errors
            }
        }
    }
}
