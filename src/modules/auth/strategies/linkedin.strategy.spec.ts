import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  LinkedinStrategy,
  LinkedinProfilePayload,
} from './linkedin.strategy';

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

describe('LinkedinStrategy', () => {
  let strategy: LinkedinStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new LinkedinStrategy(
      createConfigService({
        'linkedinOAuth.clientId': 'linkedin-client-id',
        'linkedinOAuth.clientSecret': 'linkedin-client-secret',
        'linkedinOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/linkedin/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new LinkedinStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload from /v2/userinfo', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          sub: 'li-123',
          email: 'jane@example.com',
          given_name: 'Jane',
          family_name: 'Doe',
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: { Authorization: 'Bearer access-token' },
        },
      );
      expect(payload).toEqual({
        linkedinId: 'li-123',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies LinkedinProfilePayload);
    });

    it('falls back to name split when given_name is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          sub: 'li-1',
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
        data: { sub: 'li-1', email: 'a@b.com' },
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
        data: { sub: 'li-123', given_name: 'Jane' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('LinkedIn account did not provide an email');
    });

    it('throws when sub is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { email: 'jane@example.com' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('LinkedIn account did not provide a user id');
    });
  });
});
