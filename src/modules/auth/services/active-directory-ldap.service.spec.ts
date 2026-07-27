import {
    UnauthorizedException,
    ServiceUnavailableException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'ldapts';
import {
    ActiveDirectoryLdapService,
    escapeLdapFilterValue,
} from './active-directory-ldap.service';

const mockBind = jest.fn();
const mockSearch = jest.fn();
const mockUnbind = jest.fn();

jest.mock('ldapts', () => ({
    Client: jest.fn().mockImplementation(() => ({
        bind: mockBind,
        search: mockSearch,
        unbind: mockUnbind,
    })),
}));

const MockClient = Client as unknown as jest.Mock;

describe('escapeLdapFilterValue', () => {
    it('escapes LDAP filter special characters', () => {
        expect(escapeLdapFilterValue('user*test')).toBe('user\\2atest');
        expect(escapeLdapFilterValue('(admin)')).toBe('\\28admin\\29');
        expect(escapeLdapFilterValue('a\\b\0c')).toBe('a\\5cb\\00c');
    });
});

describe('ActiveDirectoryLdapService', () => {
    let service: ActiveDirectoryLdapService;
    let configService: { get: jest.Mock };

    const objectGuid = Buffer.from('a1b2c3d4e5f6789012345678abcdef01', 'hex');

    const defaultConfig: Record<string, unknown> = {
        'adLdap.enabled': true,
        'adLdap.url': 'ldap://dc.example.com:389',
        'adLdap.baseDn': 'DC=example,DC=com',
        'adLdap.bindDn': 'CN=svc,DC=example,DC=com',
        'adLdap.bindPassword': 'svc-pass',
        'adLdap.userSearchFilter':
            '(|(sAMAccountName={{username}})(userPrincipalName={{username}}))',
        'adLdap.tlsRejectUnauthorized': true,
        'adLdap.connectTimeoutMs': 5000,
    };

    beforeEach(() => {
        mockBind.mockReset();
        mockSearch.mockReset();
        mockUnbind.mockReset();
        MockClient.mockClear();

        configService = {
            get: jest.fn((key: string) => defaultConfig[key]),
        };

        service = new ActiveDirectoryLdapService(
            configService as unknown as ConfigService,
        );
    });

    it('throws 503 when disabled', async () => {
        configService.get.mockImplementation((key: string) =>
            key === 'adLdap.enabled' ? false : undefined,
        );

        await expect(
            service.authenticate('jdoe', 'pass'),
        ).rejects.toThrow(ServiceUnavailableException);
        expect(() => service.assertEnabled()).toThrow(
            ServiceUnavailableException,
        );
    });

    it('throws 503 when not fully configured', async () => {
        configService.get.mockImplementation((key: string) => {
            if (key === 'adLdap.enabled') return true;
            if (key === 'adLdap.url') return '';
            return undefined;
        });

        await expect(
            service.authenticate('jdoe', 'pass'),
        ).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws 503 when required config values are nullish', async () => {
        configService.get.mockImplementation((key: string) => {
            if (key === 'adLdap.enabled') return true;
            return null;
        });

        await expect(
            service.authenticate('jdoe', 'pass'),
        ).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws BadRequestException when username is blank', async () => {
        await expect(service.authenticate('   ', 'pass')).rejects.toThrow(
            BadRequestException,
        );
    });

    it('passes TLS options for ldaps URLs and uses config defaults', async () => {
        configService.get.mockImplementation((key: string) => {
            if (key === 'adLdap.url') return 'ldaps://dc.example.com:636';
            if (key === 'adLdap.tlsRejectUnauthorized') return false;
            if (key === 'adLdap.connectTimeoutMs') return undefined;
            if (key === 'adLdap.userSearchFilter') return undefined;
            return defaultConfig[key];
        });

        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=John Doe,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    mail: 'jdoe@example.com',
                    givenName: 'John',
                    sn: 'Doe',
                },
            ],
        });

        await service.authenticate('jdoe', 'pass');

        expect(MockClient).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'ldaps://dc.example.com:636',
                timeout: 5000,
                connectTimeout: 5000,
                tlsOptions: { rejectUnauthorized: false },
            }),
        );
    });

    it('omits tlsOptions for non-ldaps URLs', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=John Doe,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    mail: 'jdoe@example.com',
                    givenName: 'John',
                    sn: 'Doe',
                },
            ],
        });

        await service.authenticate('jdoe', 'pass');

        expect(MockClient).toHaveBeenCalledWith(
            expect.objectContaining({
                tlsOptions: undefined,
            }),
        );
    });

    it('returns profile on successful bind and search', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=John Doe,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    mail: 'jdoe@example.com',
                    givenName: 'John',
                    sn: 'Doe',
                    sAMAccountName: 'jdoe',
                },
            ],
        });

        const profile = await service.authenticate('jdoe', 'pass');

        expect(mockBind).toHaveBeenCalledTimes(2);
        expect(mockBind).toHaveBeenNthCalledWith(
            1,
            'CN=svc,DC=example,DC=com',
            'svc-pass',
        );
        expect(mockBind).toHaveBeenNthCalledWith(
            2,
            'CN=John Doe,CN=Users,DC=example,DC=com',
            'pass',
        );
        expect(profile).toEqual({
            activeDirectoryId: 'a1b2c3d4e5f6789012345678abcdef01',
            email: 'jdoe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            samAccountName: 'jdoe',
        });
    });

    it('normalizes string objectGUID and reads array attributes', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: ['CN=Array User,CN=Users,DC=example,DC=com'],
                    objectGUID: 'A1B2C3D4-E5F6-7890-1234-5678ABCDEF01',
                    mail: ['array@example.com', 'other@example.com'],
                    givenName: ['Array'],
                    sn: ['User'],
                    sAMAccountName: ['arruser'],
                },
            ],
        });

        const profile = await service.authenticate('arruser', 'pass');

        expect(profile.activeDirectoryId).toBe(
            'a1b2c3d4e5f6789012345678abcdef01',
        );
        expect(profile.email).toBe('array@example.com');
        expect(profile.firstName).toBe('Array');
        expect(profile.lastName).toBe('User');
        expect(profile.samAccountName).toBe('arruser');
    });

    it('keeps non-hex string objectGUID as trimmed value', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=Odd Guid,CN=Users,DC=example,DC=com',
                    objectGUID: '  custom-guid-value  ',
                    mail: 'odd@example.com',
                    givenName: 'Odd',
                    sn: 'Guid',
                },
            ],
        });

        const profile = await service.authenticate('odd', 'pass');

        expect(profile.activeDirectoryId).toBe('custom-guid-value');
    });

    it('ignores non-string array attribute values', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=Mixed,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    mail: [42],
                    userPrincipalName: 'mixed@example.com',
                    givenName: [null],
                    sn: [''],
                    displayName: 'Only Display',
                },
            ],
        });

        const profile = await service.authenticate('mixed', 'pass');

        expect(profile.email).toBe('mixed@example.com');
        expect(profile.firstName).toBe('Only');
        expect(profile.lastName).toBe('Display');
    });

    it('throws 401 when user is not found', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({ searchEntries: [] });

        await expect(service.authenticate('missing', 'pass')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('throws 401 when entry has no dn', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    objectGUID: objectGuid,
                    mail: 'nodn@example.com',
                },
            ],
        });

        await expect(service.authenticate('nodn', 'pass')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('throws 401 when objectGUID is missing', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=No Guid,CN=Users,DC=example,DC=com',
                    mail: 'noguid@example.com',
                    givenName: 'No',
                    sn: 'Guid',
                },
            ],
        });

        await expect(service.authenticate('noguid', 'pass')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('throws 401 when objectGUID is an unsupported type', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=Bad Guid,CN=Users,DC=example,DC=com',
                    objectGUID: 12345,
                    mail: 'badguid@example.com',
                },
            ],
        });

        await expect(service.authenticate('badguid', 'pass')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('throws 401 when mail and userPrincipalName are missing', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=No Mail,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    givenName: 'No',
                    sn: 'Mail',
                },
            ],
        });

        await expect(service.authenticate('nomail', 'pass')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('maps displayName when givenName/sn missing', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=Jane Smith,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    userPrincipalName: 'jane@example.com',
                    displayName: 'Jane Smith',
                },
            ],
        });

        const profile = await service.authenticate('jane', 'pass');

        expect(profile.firstName).toBe('Jane');
        expect(profile.lastName).toBe('Smith');
        expect(profile.email).toBe('jane@example.com');
    });

    it('maps single-word displayName and defaults firstName', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=Single,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    mail: 'single@example.com',
                    displayName: 'Madonna',
                },
            ],
        });

        const profile = await service.authenticate('single', 'pass');

        expect(profile.firstName).toBe('Madonna');
        expect(profile.lastName).toBe('');
    });

    it('defaults firstName to ActiveDirectory when no name attributes', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=NoName,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    mail: 'noname@example.com',
                },
            ],
        });

        const profile = await service.authenticate('noname', 'pass');

        expect(profile.firstName).toBe('ActiveDirectory');
        expect(profile.lastName).toBe('');
    });

    it('throws 401 on invalid credentials from LDAP bind', async () => {
        mockBind.mockRejectedValueOnce(new Error('Invalid Credentials'));

        await expect(service.authenticate('jdoe', 'wrong')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it.each([
        'data 52e',
        'data 525',
        'data 532',
        'data 533',
        'data 701',
        'data 773',
    ])('throws 401 for LDAP bind error containing %s', async (code) => {
        mockBind.mockRejectedValueOnce(new Error(`LDAP error ${code}`));

        await expect(service.authenticate('jdoe', 'wrong')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('throws 503 on connection errors', async () => {
        mockBind.mockRejectedValueOnce(new Error('connection timeout'));

        await expect(service.authenticate('jdoe', 'pass')).rejects.toThrow(
            ServiceUnavailableException,
        );
    });

    it('throws 503 for non-Error rejections', async () => {
        mockBind.mockRejectedValueOnce('boom');

        await expect(service.authenticate('jdoe', 'pass')).rejects.toThrow(
            ServiceUnavailableException,
        );
    });

    it('ignores unbind failures after success', async () => {
        mockBind.mockResolvedValue(undefined);
        mockSearch.mockResolvedValue({
            searchEntries: [
                {
                    dn: 'CN=John Doe,CN=Users,DC=example,DC=com',
                    objectGUID: objectGuid,
                    mail: 'jdoe@example.com',
                    givenName: 'John',
                    sn: 'Doe',
                },
            ],
        });
        mockUnbind.mockRejectedValueOnce(new Error('unbind failed'));

        await expect(service.authenticate('jdoe', 'pass')).resolves.toEqual(
            expect.objectContaining({ email: 'jdoe@example.com' }),
        );
    });
});
