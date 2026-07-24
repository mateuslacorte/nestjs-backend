import { ConfigService } from '@nestjs/config';
import { Profile, VerifyCallback } from 'passport-google-oauth20';
import {
  GoogleStrategy,
  GoogleProfilePayload,
} from './google.strategy';

jest.mock('passport-google-oauth20', () => ({
  Strategy: class MockGoogleStrategy {},
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
    id: 'google-123',
    displayName: 'Jane Doe',
    name: {
      familyName: 'Doe',
      givenName: 'Jane',
    },
    emails: [{ value: 'jane@example.com' }],
    photos: [],
    provider: 'google',
    ...overrides,
  } as Profile;
}

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(() => {
    strategy = new GoogleStrategy(
      createConfigService({
        'googleOAuth.clientId': 'google-client-id',
        'googleOAuth.clientSecret': 'google-client-secret',
        'googleOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/google/callback',
      }),
    );
  });

  describe('validate', () => {
    it('returns profile payload on success', () => {
      const done = jest.fn() as VerifyCallback;
      const profile = createProfile();

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        googleId: 'google-123',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies GoogleProfilePayload);
    });

    it('calls done with error when email is missing', () => {
      const done = jest.fn() as VerifyCallback;
      const profile = createProfile({ emails: undefined });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Google account did not provide an email',
        }),
        undefined,
      );
    });

    it('calls done with error when emails array is empty', () => {
      const done = jest.fn() as VerifyCallback;
      const profile = createProfile({ emails: [] });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Google account did not provide an email',
        }),
        undefined,
      );
    });

    it('uses displayName as firstName fallback when givenName is missing', () => {
      const done = jest.fn() as VerifyCallback;
      const profile = createProfile({
        displayName: 'Display Only',
        name: { familyName: 'Doe' } as Profile['name'],
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'Display Only',
          lastName: 'Doe',
        }),
      );
    });

    it('uses "User" as firstName when givenName and displayName are missing', () => {
      const done = jest.fn() as VerifyCallback;
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
      const done = jest.fn() as VerifyCallback;
      const profile = createProfile({
        name: { givenName: 'Jane' } as Profile['name'],
      });

      strategy.validate('access', 'refresh', profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          firstName: 'Jane',
          lastName: '',
        }),
      );
    });
  });
});
