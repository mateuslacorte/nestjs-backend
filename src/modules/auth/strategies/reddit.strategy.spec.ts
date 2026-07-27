import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RedditStrategy, RedditProfilePayload } from './reddit.strategy';

jest.mock('axios');
jest.mock('passport-oauth2', () => ({
  Strategy: class MockOAuth2Strategy {
    _oauth2 = {
      useAuthorizationHeaderforGET: jest.fn(),
      setAuthMethod: jest.fn(),
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

describe('RedditStrategy', () => {
  let strategy: RedditStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new RedditStrategy(
      createConfigService({
        'redditOAuth.clientId': 'reddit-client-id',
        'redditOAuth.clientSecret': 'reddit-client-secret',
        'redditOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/reddit/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new RedditStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('authorizationParams', () => {
    it('requests temporary duration', () => {
      expect(strategy.authorizationParams()).toEqual({ duration: 'temporary' });
    });
  });

  describe('validate', () => {
    it('returns profile payload from /api/v1/me with synthetic email', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 'abc123',
          name: 'janedoe',
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://oauth.reddit.com/api/v1/me',
        {
          headers: {
            Authorization: 'Bearer access-token',
            'User-Agent': 'nestjs-backend/1.0',
          },
        },
      );
      expect(payload).toEqual({
        redditId: 'abc123',
        email: 'abc123@users.noreply.reddit.com',
        firstName: 'janedoe',
        lastName: '',
      } satisfies RedditProfilePayload);
    });

    it('uses Reddit as firstName when name is empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { id: 'xyz' },
      });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload).toEqual(
        expect.objectContaining({
          firstName: 'Reddit',
          lastName: '',
        }),
      );
    });

    it('throws when id is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { name: 'janedoe' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Reddit account did not provide a user id');
    });
  });
});
