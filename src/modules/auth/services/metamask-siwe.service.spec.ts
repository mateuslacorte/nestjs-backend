import {
    BadRequestException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyMessage } from 'viem';
import {
    generateSiweNonce,
    parseSiweMessage,
    validateSiweMessage,
} from 'viem/siwe';
import { CacheService } from '@common/cache/cache.service';
import { MetamaskSiweService } from './metamask-siwe.service';

jest.mock('viem', () => ({
    verifyMessage: jest.fn(),
}));

jest.mock('viem/siwe', () => ({
    generateSiweNonce: jest.fn(),
    parseSiweMessage: jest.fn(),
    validateSiweMessage: jest.fn(),
}));

describe('MetamaskSiweService', () => {
    let service: MetamaskSiweService;
    let configService: { get: jest.Mock };
    let cacheService: { set: jest.Mock; get: jest.Mock; del: jest.Mock };

    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

    beforeEach(() => {
        jest.clearAllMocks();
        configService = {
            get: jest.fn((key: string) => {
                const map: Record<string, unknown> = {
                    'metamaskAuth.enabled': true,
                    'metamaskAuth.domain': 'localhost',
                    'metamaskAuth.uri': 'http://localhost:3000',
                    'metamaskAuth.chainIds': [1],
                    'metamaskAuth.nonceTtlSeconds': 300,
                };
                return map[key];
            }),
        };
        cacheService = {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
        };
        service = new MetamaskSiweService(
            configService as unknown as ConfigService,
            cacheService as unknown as CacheService,
        );
    });

    describe('createNonce', () => {
        it('throws when MetaMask auth is disabled', async () => {
            configService.get.mockImplementation((key: string) =>
                key === 'metamaskAuth.enabled' ? false : undefined,
            );

            await expect(service.createNonce()).rejects.toThrow(
                ServiceUnavailableException,
            );
        });

        it('stores nonce in cache and returns it', async () => {
            (generateSiweNonce as jest.Mock).mockReturnValue('nonce-abc');

            const result = await service.createNonce();

            expect(result).toEqual({ nonce: 'nonce-abc', expiresIn: 300 });
            expect(cacheService.set).toHaveBeenCalledWith(
                'auth:metamask:nonce:nonce-abc',
                { issued: true },
                300,
            );
        });

        it('defaults nonce TTL to 300 when nonceTtlSeconds is undefined', async () => {
            configService.get.mockImplementation((key: string) => {
                if (key === 'metamaskAuth.enabled') return true;
                if (key === 'metamaskAuth.nonceTtlSeconds') return undefined;
                return undefined;
            });
            (generateSiweNonce as jest.Mock).mockReturnValue('nonce-ttl');

            const result = await service.createNonce();

            expect(result).toEqual({ nonce: 'nonce-ttl', expiresIn: 300 });
            expect(cacheService.set).toHaveBeenCalledWith(
                'auth:metamask:nonce:nonce-ttl',
                { issued: true },
                300,
            );
        });
    });

    describe('verifyAndGetProfile', () => {
        const message = 'siwe-message';
        const signature = '0xsig';

        beforeEach(() => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                address,
                nonce: 'nonce-1',
                version: '1',
                domain: 'localhost',
                uri: 'http://localhost:3000',
                chainId: 1,
            });
            (validateSiweMessage as jest.Mock).mockReturnValue(true);
            cacheService.get.mockResolvedValue({ issued: true });
            (verifyMessage as jest.Mock).mockResolvedValue(true);
        });

        it('returns lowercase metamaskId and synthetic email', async () => {
            const profile = await service.verifyAndGetProfile(
                message,
                signature,
            );

            expect(profile).toEqual({
                metamaskId: address.toLowerCase(),
                email: `${address.toLowerCase()}@users.noreply.metamask.local`,
            });
            expect(cacheService.del).toHaveBeenCalledWith(
                'auth:metamask:nonce:nonce-1',
            );
        });

        it('throws ServiceUnavailableException when MetaMask auth is disabled', async () => {
            configService.get.mockImplementation((key: string) =>
                key === 'metamaskAuth.enabled' ? false : undefined,
            );

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(ServiceUnavailableException);
        });

        it('throws BadRequestException when parseSiweMessage throws', async () => {
            (parseSiweMessage as jest.Mock).mockImplementation(() => {
                throw new Error('parse failed');
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(BadRequestException);
        });

        it('throws BadRequestException when address is missing', async () => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                nonce: 'nonce-1',
                version: '1',
                domain: 'localhost',
                uri: 'http://localhost:3000',
                chainId: 1,
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(BadRequestException);
        });

        it('throws BadRequestException when nonce is missing', async () => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                address,
                version: '1',
                domain: 'localhost',
                uri: 'http://localhost:3000',
                chainId: 1,
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(BadRequestException);
        });

        it('uses default domain/uri/chainIds when config values are undefined', async () => {
            configService.get.mockImplementation((key: string) => {
                if (key === 'metamaskAuth.enabled') return true;
                return undefined;
            });

            const profile = await service.verifyAndGetProfile(
                message,
                signature,
            );

            expect(profile.metamaskId).toBe(address.toLowerCase());
            expect(validateSiweMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: 'localhost',
                }),
            );
        });

        it('throws on domain mismatch', async () => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                address,
                nonce: 'nonce-1',
                version: '1',
                domain: 'evil.com',
                uri: 'http://localhost:3000',
                chainId: 1,
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws on URI mismatch', async () => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                address,
                nonce: 'nonce-1',
                version: '1',
                domain: 'localhost',
                uri: 'https://evil.com',
                chainId: 1,
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws on disallowed chainId', async () => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                address,
                nonce: 'nonce-1',
                version: '1',
                domain: 'localhost',
                uri: 'http://localhost:3000',
                chainId: 56,
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws when chainId is not a number', async () => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                address,
                nonce: 'nonce-1',
                version: '1',
                domain: 'localhost',
                uri: 'http://localhost:3000',
                chainId: '1',
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws when validateSiweMessage returns false', async () => {
            (validateSiweMessage as jest.Mock).mockReturnValue(false);

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws when nonce is missing from cache', async () => {
            cacheService.get.mockResolvedValue(null);

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws when cache has issued false', async () => {
            cacheService.get.mockResolvedValue({ issued: false });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws when signature is invalid', async () => {
            (verifyMessage as jest.Mock).mockResolvedValue(false);

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws UnauthorizedException when verifyMessage throws', async () => {
            (verifyMessage as jest.Mock).mockRejectedValue(
                new Error('verify failed'),
            );

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws BadRequestException when version is not 1', async () => {
            (parseSiweMessage as jest.Mock).mockReturnValue({
                address,
                nonce: 'nonce-1',
                version: '2',
                domain: 'localhost',
                uri: 'http://localhost:3000',
                chainId: 1,
            });

            await expect(
                service.verifyAndGetProfile(message, signature),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
