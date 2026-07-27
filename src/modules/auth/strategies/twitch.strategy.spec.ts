import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TwitchStrategy, TwitchProfilePayload } from './twitch.strategy';

jest.mock('axios');
jest.mock('passport-oauth2', () => ({
  Strategy: class MockOAuth2Strategy {},
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

describe('TwitchStrategy', () => {
  let strategy: TwitchStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new TwitchStrategy(
      createConfigService({
        'twitchOAuth.clientId': 'twitch-client-id',
        'twitchOAuth.clientSecret': 'twitch-client-secret',
        'twitchOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/twitch/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new TwitchStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload from Helix /users', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [
            {
              id: '141981764',
              login: 'janedoe',
              display_name: 'Jane Doe',
              email: 'jane@example.com',
            },
          ],
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/users',
        {
          headers: {
            Authorization: 'Bearer access-token',
            'Client-Id': 'twitch-client-id',
          },
        },
      );
      expect(payload).toEqual({
        twitchId: '141981764',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies TwitchProfilePayload);
    });

    it('falls back to login when display_name is empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [{ id: '1', login: 'janedoe', email: 'a@b.com' }],
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

    it('uses User as firstName when display_name and login are empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [{ id: '1', email: 'a@b.com' }],
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

    it('throws when email is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [{ id: '141981764', display_name: 'Jane' }],
        },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Twitch account did not provide an email');
    });

    it('throws when id is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [{ email: 'jane@example.com' }],
        },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Twitch account did not provide a user id');
    });

    it('throws when data array is empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: [] },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Twitch account did not provide a user id');
    });
  });
});
