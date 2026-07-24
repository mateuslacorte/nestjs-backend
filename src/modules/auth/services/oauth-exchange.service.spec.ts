import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CacheService } from '@common/cache/cache.service';
import { OauthExchangeService } from './oauth-exchange.service';

jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomBytes: jest.fn(),
}));

const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;

describe('OauthExchangeService', () => {
  let service: OauthExchangeService;
  let cacheService: jest.Mocked<Pick<CacheService, 'get' | 'set' | 'del'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const fixedBuffer = Buffer.alloc(32, 0xab);
  const fixedCode = fixedBuffer.toString('base64url');
  const userId = 'user-123';

  beforeEach(() => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn(),
    };

    mockRandomBytes.mockReturnValue(
      fixedBuffer as unknown as ReturnType<typeof randomBytes>,
    );

    service = new OauthExchangeService(
      cacheService as unknown as CacheService,
      configService as unknown as ConfigService,
    );
  });

  describe('createExchangeCode', () => {
    it('uses google OAuth TTL when configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return 120;
        return undefined;
      });

      const code = await service.createExchangeCode(userId);

      expect(code).toBe(fixedCode);
      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        120,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'googleOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to facebook OAuth TTL when google TTL is missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return 90;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        90,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'facebookOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to twitter OAuth TTL when google and facebook TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return 75;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        75,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'twitterOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to 60 seconds when no TTL is configured', async () => {
      configService.get.mockReturnValue(undefined);

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        60,
      );
    });

    it('generates code via crypto.randomBytes(32)', async () => {
      configService.get.mockReturnValue(undefined);

      await service.createExchangeCode(userId);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
    });

    it('returns the generated exchange code', async () => {
      configService.get.mockReturnValue(undefined);

      const code = await service.createExchangeCode(userId);

      expect(code).toBe(fixedCode);
    });
  });

  describe('consumeExchangeCode', () => {
    it('returns userId and deletes the key on success', async () => {
      cacheService.get.mockResolvedValue({ userId });

      const result = await service.consumeExchangeCode('abc-code');

      expect(result).toBe(userId);
      expect(cacheService.get).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc-code',
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc-code',
      );
    });

    it('throws UnauthorizedException when code is missing from cache', async () => {
      cacheService.get.mockResolvedValue(null);

      await expect(service.consumeExchangeCode('missing')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.consumeExchangeCode('missing')).rejects.toThrow(
        'Invalid or expired exchange code',
      );
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when payload has no userId', async () => {
      cacheService.get.mockResolvedValue({ userId: '' });

      await expect(service.consumeExchangeCode('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.consumeExchangeCode('invalid')).rejects.toThrow(
        'Invalid or expired exchange code',
      );
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when payload is undefined userId', async () => {
      cacheService.get.mockResolvedValue({});

      await expect(service.consumeExchangeCode('empty')).rejects.toThrow(
        'Invalid or expired exchange code',
      );
    });
  });
});
