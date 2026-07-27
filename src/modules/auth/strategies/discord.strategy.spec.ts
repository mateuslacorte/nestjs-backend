import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DiscordStrategy, DiscordProfilePayload } from './discord.strategy';

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

describe('DiscordStrategy', () => {
  let strategy: DiscordStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new DiscordStrategy(
      createConfigService({
        'discordOAuth.clientId': 'discord-client-id',
        'discordOAuth.clientSecret': 'discord-client-secret',
        'discordOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/discord/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new DiscordStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload from /users/@me', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: '123456789012345678',
          email: 'jane@example.com',
          global_name: 'Jane Doe',
          username: 'janedoe',
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://discord.com/api/users/@me',
        {
          headers: { Authorization: 'Bearer access-token' },
        },
      );
      expect(payload).toEqual({
        discordId: '123456789012345678',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies DiscordProfilePayload);
    });

    it('falls back to username when global_name is empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: '1',
          email: 'a@b.com',
          username: 'janedoe',
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

    it('uses User as firstName when global_name and username are empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { id: '1', email: 'a@b.com' },
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
        data: { id: '123', global_name: 'Jane' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Discord account did not provide an email');
    });

    it('throws when id is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { email: 'jane@example.com' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Discord account did not provide a user id');
    });
  });
});
