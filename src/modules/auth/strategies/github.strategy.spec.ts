import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-github2';
import {
  GithubStrategy,
  GithubProfilePayload,
} from './github.strategy';

jest.mock('passport-github2', () => ({
  Strategy: class MockGithubStrategy {},
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

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'gh-123',
    displayName: 'Jane Doe',
    username: 'janedoe',
    emails: [{ value: 'jane@example.com', primary: true }],
    provider: 'github',
    ...overrides,
  } as Profile;
}

describe('GithubStrategy', () => {
  let strategy: GithubStrategy;

  beforeEach(() => {
    strategy = new GithubStrategy(
      createConfigService({
        'githubOAuth.clientId': 'github-client-id',
        'githubOAuth.clientSecret': 'github-client-secret',
        'githubOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/github/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new GithubStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload on success', () => {
      const done = jest.fn();
      const profile = createProfile();

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        githubId: 'gh-123',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies GithubProfilePayload);
    });

    it('calls done with error when email is missing', () => {
      const done = jest.fn();
      const profile = createProfile({ emails: undefined });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'GitHub account did not provide an email',
        }),
        undefined,
      );
    });

    it('uses username as firstName when displayName is missing', () => {
      const done = jest.fn();
      const profile = createProfile({
        displayName: '',
        username: 'octocat',
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'octocat',
          lastName: '',
        }),
      );
    });

    it('uses User as firstName when displayName and username are missing', () => {
      const done = jest.fn();
      const profile = createProfile({
        displayName: '',
        username: '',
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'User',
          lastName: '',
        }),
      );
    });

    it('prefers primary email when multiple emails exist', () => {
      const done = jest.fn();
      const profile = createProfile({
        emails: [
          { value: 'secondary@example.com', primary: false },
          { value: 'primary@example.com', primary: true },
        ],
      } as unknown as Partial<Profile>);

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          email: 'primary@example.com',
        }),
      );
    });
  });
});
