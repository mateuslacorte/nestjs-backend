import { ConfigService } from '@nestjs/config';
import { Profile } from '@superfaceai/passport-twitter-oauth2';
import {
  TwitterStrategy,
  TwitterProfilePayload,
} from './twitter.strategy';

jest.mock('@superfaceai/passport-twitter-oauth2', () => ({
  Strategy: class MockTwitterStrategy {},
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

function createProfile(
  overrides: Partial<Profile> & { _json?: { confirmed_email?: string | null } } = {},
): Profile & { _json?: { confirmed_email?: string | null } } {
  return {
    id: 'twitter-789',
    username: 'janedoe',
    displayName: 'Jane Doe',
    profileUrl: 'https://x.com/janedoe',
    emails: undefined,
    photos: [],
    provider: 'twitter',
    _json: { confirmed_email: 'jane@example.com' },
    ...overrides,
  } as Profile & { _json?: { confirmed_email?: string | null } };
}

describe('TwitterStrategy', () => {
  let strategy: TwitterStrategy;

  beforeEach(() => {
    strategy = new TwitterStrategy(
      createConfigService({
        'twitterOAuth.clientId': 'twitter-client-id',
        'twitterOAuth.clientSecret': 'twitter-client-secret',
        'twitterOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/twitter/callback',
        'twitterOAuth.clientType': 'confidential',
      }),
    );
  });

  describe('validate', () => {
    it('returns profile payload from confirmed_email', () => {
      const done = jest.fn();
      const profile = createProfile();

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        twitterId: 'twitter-789',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies TwitterProfilePayload);
    });

    it('prefers profile.emails when present', () => {
      const done = jest.fn();
      const profile = createProfile({
        emails: [{ value: 'from-emails@example.com' }],
        _json: { confirmed_email: 'from-json@example.com' },
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ email: 'from-emails@example.com' }),
      );
    });

    it('calls done with error when email is missing', () => {
      const done = jest.fn();
      const profile = createProfile({
        emails: undefined,
        _json: {},
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Twitter account did not provide an email',
        }),
        undefined,
      );
    });

    it('splits displayName into firstName and lastName', () => {
      const done = jest.fn();
      const profile = createProfile({
        displayName: 'Ada Lovelace Byron',
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'Ada',
          lastName: 'Lovelace Byron',
        }),
      );
    });

    it('uses username as firstName when displayName is empty', () => {
      const done = jest.fn();
      const profile = createProfile({
        displayName: '',
        username: 'onlyuser',
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'onlyuser',
          lastName: '',
        }),
      );
    });

    it('uses "User" as firstName when displayName and username are missing', () => {
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
        }),
      );
    });
  });
});
