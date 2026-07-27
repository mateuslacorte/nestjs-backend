import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  AtlassianStrategy,
  AtlassianProfilePayload,
} from './atlassian.strategy';

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

describe('AtlassianStrategy', () => {
  let strategy: AtlassianStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new AtlassianStrategy(
      createConfigService({
        'atlassianOAuth.clientId': 'atlassian-client-id',
        'atlassianOAuth.clientSecret': 'atlassian-client-secret',
        'atlassianOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/atlassian/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new AtlassianStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('authorizationParams', () => {
    it('returns Atlassian 3LO audience and prompt', () => {
      expect(strategy.authorizationParams()).toEqual({
        audience: 'api.atlassian.com',
        prompt: 'consent',
      });
    });
  });

  describe('validate', () => {
    it('returns profile payload from /me', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          account_id: 'aa-bb-cc',
          email: 'mia@example.com',
          name: 'Mia Krystof',
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.atlassian.com/me',
        {
          headers: {
            Authorization: 'Bearer access-token',
            Accept: 'application/json',
          },
        },
      );
      expect(payload).toEqual({
        atlassianId: 'aa-bb-cc',
        email: 'mia@example.com',
        firstName: 'Mia',
        lastName: 'Krystof',
      } satisfies AtlassianProfilePayload);
    });

    it('falls back to nickname when name is empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          account_id: 'aa-1',
          email: 'a@b.com',
          nickname: 'mkrystof',
        },
      });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload).toEqual(
        expect.objectContaining({
          firstName: 'mkrystof',
          lastName: '',
        }),
      );
    });

    it('uses User as firstName when name and nickname are empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { account_id: 'aa-1', email: 'a@b.com' },
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
        data: { account_id: 'aa-bb-cc', name: 'Mia' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Atlassian account did not provide an email');
    });

    it('throws when account_id is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { email: 'mia@example.com' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Atlassian account did not provide a user id');
    });
  });
});
