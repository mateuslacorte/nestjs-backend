import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SlackStrategy, SlackProfilePayload } from './slack.strategy';

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

describe('SlackStrategy', () => {
  let strategy: SlackStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new SlackStrategy(
      createConfigService({
        'slackOAuth.clientId': 'slack-client-id',
        'slackOAuth.clientSecret': 'slack-client-secret',
        'slackOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/slack/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new SlackStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload from openid.connect.userInfo', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          ok: true,
          sub: 'U0R7JM',
          email: 'jane@example.com',
          given_name: 'Jane',
          family_name: 'Doe',
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://slack.com/api/openid.connect.userInfo',
        {
          headers: { Authorization: 'Bearer access-token' },
        },
      );
      expect(payload).toEqual({
        slackId: 'U0R7JM',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies SlackProfilePayload);
    });

    it('falls back to name split when given_name is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          sub: 'U1',
          email: 'a@b.com',
          name: 'Jane Doe',
        },
      });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload).toEqual(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      );
    });

    it('uses User as firstName when name fields are empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { sub: 'U1', email: 'a@b.com' },
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
        data: { sub: 'U0R7JM', given_name: 'Jane' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Slack account did not provide an email');
    });

    it('throws when sub is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { email: 'jane@example.com' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Slack account did not provide a user id');
    });
  });
});
