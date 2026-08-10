import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AppleStrategy, AppleProfilePayload } from './apple.strategy';

jest.mock('jsonwebtoken');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createPublicKey: jest.fn(() => 'mock-public-key'),
}));
jest.mock('passport-apple', () => {
  const MockAppleStrategy = class {
    name = 'apple';
  };
  return { default: MockAppleStrategy, __esModule: true };
});
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (_Strategy: unknown) => {
    return class PassportStrategyMixin {};
  },
}));

const mockedCreatePublicKey = createPublicKey as jest.MockedFunction<
  typeof createPublicKey
>;

function createConfigService(
  values: Record<string, unknown> = {},
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function runValidate(
  strategy: AppleStrategy,
  idToken: string,
  body: Record<string, unknown> = {},
): Promise<AppleProfilePayload> {
  const req = { body } as unknown as import('@common/http/app-http').AppRequest;
  return strategy.validate(req, 'access', 'refresh', idToken, undefined);
}

describe('AppleStrategy', () => {
  let strategy: AppleStrategy;
  const mockedJwtDecode = jwt.decode as jest.Mock;
  const mockedJwtVerify = jwt.verify as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [{ kid: 'test-kid', kty: 'RSA', n: 'n', e: 'AQAB' }],
      }),
    }) as jest.Mock;

    mockedJwtDecode.mockReturnValue({
      header: { kid: 'test-kid', alg: 'RS256' },
      payload: {},
    } as jwt.Jwt);
    mockedCreatePublicKey.mockReturnValue('mock-public-key' as never);

    strategy = new AppleStrategy(
      createConfigService({
        'appleOAuth.clientId': 'com.example.service',
        'appleOAuth.teamId': 'TEAM1234',
        'appleOAuth.keyId': 'ABCDEFGHIJ',
        'appleOAuth.privateKey': '-----BEGIN EC PRIVATE KEY-----\nKEY\n-----END EC PRIVATE KEY-----',
        'appleOAuth.callbackUrl': 'http://localhost:3000/api/v1/auth/apple/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new AppleStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('authorizationParams', () => {
    it('returns only Apple-safe query params (no Nest session/property leak)', () => {
      expect(
        strategy.authorizationParams({
          state: 'abc123',
          session: false,
          property: 'user',
        }),
      ).toEqual({
        response_mode: 'form_post',
        state: 'abc123',
      });
    });

    it('omits state when not provided', () => {
      expect(strategy.authorizationParams({})).toEqual({
        response_mode: 'form_post',
      });
    });

    it('omits state when state is an empty string', () => {
      expect(strategy.authorizationParams({ state: '' })).toEqual({
        response_mode: 'form_post',
      });
    });
  });

  describe('validate', () => {
    it('returns profile payload from id_token with name from body on first login', async () => {
      mockedJwtVerify.mockReturnValue({
        sub: 'apple-sub-001',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      const payload = await runValidate(strategy, 'id-token-str', {
        user: JSON.stringify({ name: { firstName: 'Jane', lastName: 'Doe' } }),
      });

      expect(payload).toEqual({
        appleId: 'apple-sub-001',
        email: 'user@privaterelay.appleid.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies AppleProfilePayload);
      expect(mockedJwtVerify).toHaveBeenCalledWith(
        'id-token-str',
        'mock-public-key',
        expect.objectContaining({
          algorithms: ['RS256'],
          audience: 'com.example.service',
          issuer: 'https://appleid.apple.com',
        }),
      );
    });

    it('reuses cached Apple JWKS within TTL', async () => {
      mockedJwtVerify.mockReturnValue({
        sub: 'apple-sub-cache',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      await runValidate(strategy, 'id-token-1');
      await runValidate(strategy, 'id-token-2');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to Apple as firstName when no name in body (subsequent login)', async () => {
      mockedJwtVerify.mockReturnValue({
        sub: 'apple-sub-002',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      const payload = await runValidate(strategy, 'id-token', {});

      expect(payload).toMatchObject({
        appleId: 'apple-sub-002',
        firstName: 'Apple',
        lastName: '',
      });
    });

    it('uses Apple as firstName when body firstName is whitespace only', async () => {
      mockedJwtVerify.mockReturnValue({
        sub: 'apple-sub-ws',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      const payload = await runValidate(strategy, 'id-token', {
        user: JSON.stringify({ name: { firstName: '   ', lastName: 'Doe' } }),
      });

      expect(payload).toMatchObject({
        firstName: 'Apple',
        lastName: 'Doe',
      });
    });

    it('uses empty lastName when body lastName is missing or whitespace', async () => {
      mockedJwtVerify.mockReturnValue({
        sub: 'apple-sub-nolast',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      const withoutLast = await runValidate(strategy, 'id-token', {
        user: JSON.stringify({ name: { firstName: 'Jane' } }),
      });
      expect(withoutLast).toMatchObject({
        firstName: 'Jane',
        lastName: '',
      });

      const whitespaceLast = await runValidate(strategy, 'id-token', {
        user: { name: { firstName: 'Jane', lastName: '   ' } },
      });
      expect(whitespaceLast).toMatchObject({
        firstName: 'Jane',
        lastName: '',
      });
    });

    it('accepts user body as object (not JSON string)', async () => {
      mockedJwtVerify.mockReturnValue({
        sub: 'apple-sub-obj',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      const payload = await runValidate(strategy, 'id-token', {
        user: { name: { firstName: 'Object', lastName: 'User' } },
      });

      expect(payload).toEqual({
        appleId: 'apple-sub-obj',
        email: 'user@privaterelay.appleid.com',
        firstName: 'Object',
        lastName: 'User',
      });
    });

    it('throws when sub is missing from id_token', async () => {
      mockedJwtVerify.mockReturnValue({ email: 'user@example.com' } as jwt.JwtPayload);

      await expect(runValidate(strategy, 'bad-token')).rejects.toThrow(
        'Apple id_token did not provide a subject (sub)',
      );
    });

    it('throws when email is missing from id_token', async () => {
      mockedJwtVerify.mockReturnValue({ sub: 'apple-sub-003' } as jwt.JwtPayload);

      await expect(runValidate(strategy, 'bad-token')).rejects.toThrow(
        'Apple id_token did not provide an email',
      );
    });

    it('throws when id_token cannot be verified (verify throws)', async () => {
      mockedJwtVerify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(runValidate(strategy, 'bad-token')).rejects.toThrow(
        'invalid token',
      );
    });

    it('throws when Apple JWKS fetch fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as jest.Mock;

      await expect(runValidate(strategy, 'id-token')).rejects.toThrow(
        'Failed to fetch Apple JWKS: HTTP 503',
      );
    });

    it('throws when id_token header is missing kid', async () => {
      mockedJwtDecode.mockReturnValue({
        header: { alg: 'RS256' },
        payload: {},
      } as jwt.Jwt);

      await expect(runValidate(strategy, 'id-token')).rejects.toThrow(
        'Apple id_token header missing kid',
      );
    });

    it('throws when id_token decode returns a raw string', async () => {
      mockedJwtDecode.mockReturnValue('not-a-jwt-object');

      await expect(runValidate(strategy, 'id-token')).rejects.toThrow(
        'Apple id_token header missing kid',
      );
    });

    it('throws when kid is not present in Apple JWKS', async () => {
      mockedJwtDecode.mockReturnValue({
        header: { kid: 'unknown-kid', alg: 'RS256' },
        payload: {},
      } as jwt.Jwt);

      await expect(runValidate(strategy, 'id-token')).rejects.toThrow(
        'Apple id_token kid not found in JWKS: unknown-kid',
      );
    });

    it('throws SyntaxError when user body JSON is invalid', async () => {
      mockedJwtVerify.mockReturnValue({
        sub: 'apple-sub-err',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      await expect(
        runValidate(strategy, 'id-token', { user: '{not-json' }),
      ).rejects.toThrow(SyntaxError);
    });
  });
});
