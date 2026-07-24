import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-facebook';
import {
  FacebookStrategy,
  FacebookProfilePayload,
} from './facebook.strategy';

jest.mock('passport-facebook', () => ({
  Strategy: class MockFacebookStrategy {},
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
    id: 'facebook-456',
    displayName: 'John Smith',
    name: {
      familyName: 'Smith',
      givenName: 'John',
    },
    emails: [{ value: 'john@example.com' }],
    photos: [],
    provider: 'facebook',
    ...overrides,
  } as Profile;
}

describe('FacebookStrategy', () => {
  let strategy: FacebookStrategy;

  beforeEach(() => {
    strategy = new FacebookStrategy(
      createConfigService({
        'facebookOAuth.appId': 'facebook-app-id',
        'facebookOAuth.appSecret': 'facebook-app-secret',
        'facebookOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/facebook/callback',
      }),
    );
  });

  describe('validate', () => {
    it('returns profile payload on success', () => {
      const done = jest.fn();
      const profile = createProfile();

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        facebookId: 'facebook-456',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Smith',
      } satisfies FacebookProfilePayload);
    });

    it('calls done with error when email is missing', () => {
      const done = jest.fn();
      const profile = createProfile({ emails: undefined });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Facebook account did not provide an email',
        }),
        undefined,
      );
    });

    it('calls done with error when emails array is empty', () => {
      const done = jest.fn();
      const profile = createProfile({ emails: [] });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Facebook account did not provide an email',
        }),
        undefined,
      );
    });

    it('uses displayName as firstName fallback when givenName is missing', () => {
      const done = jest.fn();
      const profile = createProfile({
        displayName: 'Display Only',
        name: { familyName: 'Smith' } as Profile['name'],
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'Display Only',
          lastName: 'Smith',
        }),
      );
    });

    it('uses "User" as firstName when givenName and displayName are missing', () => {
      const done = jest.fn();
      const profile = createProfile({
        displayName: '',
        name: undefined,
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'User',
        }),
      );
    });

    it('uses empty string for lastName when familyName is missing', () => {
      const done = jest.fn();
      const profile = createProfile({
        name: { givenName: 'John' } as Profile['name'],
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'John',
          lastName: '',
        }),
      );
    });
  });
});
