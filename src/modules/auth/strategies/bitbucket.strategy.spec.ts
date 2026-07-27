import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BitbucketStrategy, BitbucketProfilePayload } from './bitbucket.strategy';

jest.mock('axios');
jest.mock('passport-oauth2', () => ({
  Strategy: class MockOAuth2Strategy {
    _oauth2 = {
      useAuthorizationHeaderforGET: jest.fn(),
    };
  },
}));

jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (Strategy: new (...args: unknown[]) => unknown) => {
    class PassportStrategyMixin extends (Strategy as any) {}
    return PassportStrategyMixin;
  },
}));

function createConfigService(
  values: Record<string, unknown> = {},
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('BitbucketStrategy', () => {
  let strategy: BitbucketStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new BitbucketStrategy(
      createConfigService({
        'bitbucketOAuth.clientId': 'bitbucket-client-id',
        'bitbucketOAuth.clientSecret': 'bitbucket-client-secret',
        'bitbucketOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/bitbucket/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new BitbucketStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload from /user and /user/emails', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            uuid: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
            display_name: 'Jane Doe',
            username: 'janedoe',
          },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              {
                email: 'jane@example.com',
                is_primary: true,
                is_confirmed: true,
              },
            ],
          },
        });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        1,
        'https://api.bitbucket.org/2.0/user',
        {
          headers: {
            Authorization: 'Bearer access-token',
            Accept: 'application/json',
            'User-Agent': 'nestjs-backend',
          },
        },
      );
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        2,
        'https://api.bitbucket.org/2.0/user/emails',
        {
          headers: {
            Authorization: 'Bearer access-token',
            Accept: 'application/json',
            'User-Agent': 'nestjs-backend',
          },
        },
      );
      expect(payload).toEqual({
        bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies BitbucketProfilePayload);
    });

    it('falls back to username when display_name is empty', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            uuid: '{1}',
            username: 'janedoe',
          },
        })
        .mockResolvedValueOnce({
          data: {
            values: [{ email: 'a@b.com', is_primary: true, is_confirmed: true }],
          },
        });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload).toEqual(
        expect.objectContaining({
          firstName: 'janedoe',
          lastName: '',
        }),
      );
    });

    it('falls back to nickname before username when display_name is empty', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            uuid: '{1}',
            nickname: 'nick',
            username: 'janedoe',
          },
        })
        .mockResolvedValueOnce({
          data: {
            values: [{ email: 'a@b.com', is_primary: true, is_confirmed: true }],
          },
        });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload.firstName).toBe('nick');
    });

    it('uses User as firstName when name fields are empty', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { uuid: '{1}' },
        })
        .mockResolvedValueOnce({
          data: {
            values: [{ email: 'a@b.com', is_primary: true, is_confirmed: true }],
          },
        });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload).toEqual(
        expect.objectContaining({
          firstName: 'User',
          lastName: '',
        }),
      );
    });

    it('prefers primary confirmed email', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { uuid: '{1}', display_name: 'Jane' },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              { email: 'other@example.com', is_primary: false, is_confirmed: true },
              { email: 'primary@example.com', is_primary: true, is_confirmed: true },
            ],
          },
        });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload.email).toBe('primary@example.com');
    });

    it('falls back to primary email when not confirmed', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { uuid: '{1}', display_name: 'Jane' },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              { email: 'confirmed@example.com', is_primary: false, is_confirmed: true },
              { email: 'primary@example.com', is_primary: true, is_confirmed: false },
            ],
          },
        });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload.email).toBe('primary@example.com');
    });

    it('falls back to confirmed email when no primary', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { uuid: '{1}', display_name: 'Jane' },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              { email: 'other@example.com', is_primary: false, is_confirmed: false },
              { email: 'confirmed@example.com', is_primary: false, is_confirmed: true },
            ],
          },
        });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload.email).toBe('confirmed@example.com');
    });

    it('falls back to first email when none are primary or confirmed', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { uuid: '{1}', display_name: 'Jane' },
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              { email: 'first@example.com', is_primary: false, is_confirmed: false },
              { email: 'second@example.com', is_primary: false, is_confirmed: false },
            ],
          },
        });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload.email).toBe('first@example.com');
    });

    it('throws when email is missing', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { uuid: '{1}', display_name: 'Jane' },
        })
        .mockResolvedValueOnce({ data: { values: [] } });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Bitbucket account did not provide an email');
    });

    it('throws when emails values is undefined', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { uuid: '{1}', display_name: 'Jane' },
        })
        .mockResolvedValueOnce({ data: {} });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Bitbucket account did not provide an email');
    });

    it('throws when uuid is missing', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { display_name: 'Jane' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Bitbucket account did not provide a user id');
    });
  });
});
