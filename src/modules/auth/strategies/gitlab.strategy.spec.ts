import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GitlabStrategy, GitlabProfilePayload } from './gitlab.strategy';

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

describe('GitlabStrategy', () => {
  let strategy: GitlabStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new GitlabStrategy(
      createConfigService({
        'gitlabOAuth.clientId': 'gitlab-client-id',
        'gitlabOAuth.clientSecret': 'gitlab-client-secret',
        'gitlabOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/gitlab/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new GitlabStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload from /api/v4/user', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 12345,
          email: 'jane@example.com',
          name: 'Jane Doe',
          username: 'janedoe',
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/user',
        {
          headers: { Authorization: 'Bearer access-token' },
        },
      );
      expect(payload).toEqual({
        gitlabId: '12345',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies GitlabProfilePayload);
    });

    it('falls back to username when name is empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 1,
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

    it('uses User as firstName when name and username are empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { id: 1, email: 'a@b.com' },
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
        data: { id: 12345, name: 'Jane' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('GitLab account did not provide an email');
    });

    it('throws when id is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { email: 'jane@example.com' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('GitLab account did not provide a user id');
    });
  });
});
