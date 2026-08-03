import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AppleStrategy, AppleProfilePayload } from './apple.strategy';

jest.mock('jsonwebtoken');
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
  return new Promise((resolve, reject) => {
    const req = { body } as unknown as import('@common/http/app-http').AppRequest;
    strategy.validate(req, 'access', 'refresh', idToken, undefined, (err, user) => {
      if (err) reject(err);
      else resolve(user as AppleProfilePayload);
    });
  });
}

describe('AppleStrategy', () => {
  let strategy: AppleStrategy;
  const mockedJwtDecode = jwt.decode as jest.MockedFunction<typeof jwt.decode>;

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('validate', () => {
    it('returns profile payload from id_token with name from body on first login', async () => {
      mockedJwtDecode.mockReturnValue({
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
    });

    it('falls back to Apple as firstName when no name in body (subsequent login)', async () => {
      mockedJwtDecode.mockReturnValue({
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
      mockedJwtDecode.mockReturnValue({
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
      mockedJwtDecode.mockReturnValue({
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
      mockedJwtDecode.mockReturnValue({
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
      mockedJwtDecode.mockReturnValue({ email: 'user@example.com' } as jwt.JwtPayload);

      await expect(runValidate(strategy, 'bad-token')).rejects.toThrow(
        'Apple id_token did not provide a subject (sub)',
      );
    });

    it('throws when email is missing from id_token', async () => {
      mockedJwtDecode.mockReturnValue({ sub: 'apple-sub-003' } as jwt.JwtPayload);

      await expect(runValidate(strategy, 'bad-token')).rejects.toThrow(
        'Apple id_token did not provide an email',
      );
    });

    it('throws when id_token cannot be decoded (null)', async () => {
      mockedJwtDecode.mockReturnValue(null);

      await expect(runValidate(strategy, 'bad-token')).rejects.toThrow(
        'Apple id_token did not provide a subject (sub)',
      );
    });

    it('wraps non-Error throws from JSON.parse as Error', async () => {
      mockedJwtDecode.mockReturnValue({
        sub: 'apple-sub-err',
        email: 'user@privaterelay.appleid.com',
      } as jwt.JwtPayload);

      await expect(
        runValidate(strategy, 'id-token', { user: '{not-json' }),
      ).rejects.toThrow(SyntaxError);
    });

    it('wraps non-Error thrown values in Error', async () => {
      mockedJwtDecode.mockImplementation(() => {
        throw 'decode-failed';
      });

      await expect(runValidate(strategy, 'id-token')).rejects.toThrow(
        'decode-failed',
      );
    });
  });
});
