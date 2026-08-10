import { ConfigService } from '@nestjs/config';
import { AuthService } from '@modules/auth/auth.service';
import { JwtStrategy } from './jwt.strategy';

let capturedStrategyOptions: Record<string, unknown> | undefined;

jest.mock('passport-jwt', () => ({
  Strategy: jest.fn().mockImplementation(function (
    this: unknown,
    options: Record<string, unknown>,
  ) {
    capturedStrategyOptions = options;
  }),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn(() => 'mock-jwt-extractor'),
  },
}));

jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (Strategy: new (...args: unknown[]) => unknown) => {
    class PassportStrategyMixin extends (Strategy as any) {}
    return PassportStrategyMixin;
  },
}));

describe('JwtStrategy', () => {
  let authService: jest.Mocked<Pick<AuthService, 'validateUserById'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    capturedStrategyOptions = undefined;
    authService = {
      validateUserById: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };
  });

  function createStrategy(secret?: string): JwtStrategy {
    configService.get.mockImplementation((key: string) => {
      if (key === 'jwt.secret') return secret;
      return undefined;
    });
    return new JwtStrategy(
      configService as unknown as ConfigService,
      authService as unknown as AuthService,
    );
  }

  describe('constructor', () => {
    it('uses jwt.secret from config when defined', () => {
      createStrategy('configured-secret');

      expect(capturedStrategyOptions?.secretOrKey).toBe('configured-secret');
      expect(capturedStrategyOptions?.ignoreExpiration).toBe(false);
      expect(capturedStrategyOptions?.jwtFromRequest).toBe('mock-jwt-extractor');
    });

    it('throws when jwt.secret is missing', () => {
      expect(() => createStrategy(undefined)).toThrow(
        'jwt.secret must be configured',
      );
    });
  });

  describe('validate', () => {
    it('returns the sanitized user when validateUserById succeeds', async () => {
      const strategy = createStrategy('secret');
      const user = {
        id: 'user-1',
        username: 'jane',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'user@example.com',
        password: 'hash',
        isActive: true,
        roles: [],
        googleId: 'google-1',
        activeDirectoryId: 'ad-1',
      };
      authService.validateUserById.mockResolvedValue(user as never);

      const result = await strategy.validate({ id: 'user-1' });

      expect(result).toEqual({
        id: 'user-1',
        username: 'jane',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'user@example.com',
        isActive: true,
        roles: [],
      });
      expect(result).not.toHaveProperty('googleId');
      expect(result).not.toHaveProperty('activeDirectoryId');
      expect(authService.validateUserById).toHaveBeenCalledWith('user-1');
    });

    it('throws Error with Unauthorized message when user is not found', async () => {
      const strategy = createStrategy('secret');
      authService.validateUserById.mockResolvedValue(null);

      await expect(strategy.validate({ id: 'missing' })).rejects.toThrow(
        'Unauthorized',
      );
      expect(authService.validateUserById).toHaveBeenCalledWith('missing');
    });
  });
});
