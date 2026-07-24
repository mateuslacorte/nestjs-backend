jest.mock('@common/crypto/password.util', () => ({
  verifyPassword: jest.fn(),
}));

const mockRandomBytes = jest.fn((size: number) => Buffer.alloc(size, 0xab));

jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomBytes: (...args: [number]) => mockRandomBytes(...args),
  };
});

import { verifyPassword } from '@common/crypto/password.util';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { OauthExchangeService } from './services/oauth-exchange.service';
import { Role } from './enums/role.enum';
import { IUser } from '../users/interfaces/user.interface';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { GoogleProfilePayload } from './strategies/google.strategy';
import { FacebookProfilePayload } from './strategies/facebook.strategy';
import { TwitterProfilePayload } from './strategies/twitter.strategy';

function createUser(overrides: Partial<IUser> = {}): IUser {
  return {
    id: 'user-1',
    username: 'janesmith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: 'hashed-password',
    isActive: true,
    roles: [Role.USER],
    ...overrides,
  };
}

function encodeOAuthState(redirect: string): string {
  return Buffer.from(JSON.stringify({ r: redirect }), 'utf8').toString(
    'base64url',
  );
}

const defaultConfig: Record<string, unknown> = {
  'jwt.secret': 'jwt-secret',
  'jwt.refreshSecret': 'jwt-refresh-secret',
  'jwt.expirationTime': '1h',
  'jwt.refreshExpirationTime': '7d',
  'jwt.jitterSeconds': 0,
  'googleOAuth.enabled': true,
  'googleOAuth.redirectAllowlist': [
    'https://app.example/cb',
    'https://app.example/',
  ],
  'googleOAuth.defaultRoles': [Role.USER],
  'facebookOAuth.enabled': true,
  'facebookOAuth.redirectAllowlist': [
    'https://app.example/cb',
    'https://app.example/',
  ],
  'facebookOAuth.defaultRoles': [Role.USER],
  'twitterOAuth.enabled': true,
  'twitterOAuth.redirectAllowlist': [
    'https://app.example/cb',
    'https://app.example/',
  ],
  'twitterOAuth.defaultRoles': [Role.USER],
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
    findByUsername: jest.Mock;
    findByGoogleId: jest.Mock;
    findByFacebookId: jest.Mock;
    findByTwitterId: jest.Mock;
    findByEmailVerificationToken: jest.Mock;
    findByPasswordToken: jest.Mock;
    update: jest.Mock;
    updateResetToken: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };
  let emailService: {
    sendEmailConfirmation: jest.Mock;
    sendPasswordReset: jest.Mock;
  };
  let oauthExchangeService: {
    createExchangeCode: jest.Mock;
    consumeExchangeCode: jest.Mock;
  };

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByGoogleId: jest.fn(),
      findByFacebookId: jest.fn(),
      findByTwitterId: jest.fn(),
      findByEmailVerificationToken: jest.fn(),
      findByPasswordToken: jest.fn(),
      update: jest.fn(),
      updateResetToken: jest.fn(),
      updatePassword: jest.fn(),
    };

    jwtService = {
      sign: jest.fn((payload, options?: { secret?: string }) => {
        if (options?.secret === 'jwt-refresh-secret') {
          return 'refresh-token';
        }
        return 'access-token';
      }),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => defaultConfig[key]),
    };

    emailService = {
      sendEmailConfirmation: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    oauthExchangeService = {
      createExchangeCode: jest.fn().mockResolvedValue('exchange-code-123'),
      consumeExchangeCode: jest.fn(),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      emailService as unknown as EmailService,
      oauthExchangeService as unknown as OauthExchangeService,
    );

    mockRandomBytes.mockImplementation((size: number) =>
      Buffer.alloc(size, 0xab),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      password: 'Str0ng!P@ssw0rd',
      confirmPassword: 'Str0ng!P@ssw0rd',
    };

    it('throws 400 when passwords do not match', async () => {
      await expect(
        service.register({ ...registerDto, confirmPassword: 'Mismatch!' }),
      ).rejects.toThrow(new BadRequestException('Passwords do not match'));
    });

    it('throws 409 when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(createUser());

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('A user with this email already exists'),
      );
    });

    it('creates inactive user, sends verification, returns tokens and message', async () => {
      const newUser = createUser({ isActive: false, roles: [], password: 'hash' });
      usersService.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newUser);
      usersService.create.mockResolvedValue(newUser);
      usersService.update.mockResolvedValue(newUser);

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
        isActive: false,
        roles: [],
      });
      expect(usersService.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: expect.any(Date),
        }),
      );
      expect(emailService.sendEmailConfirmation).toHaveBeenCalledWith(
        'jane@example.com',
        expect.any(String),
      );
      expect(result).toEqual(
        expect.objectContaining({
          user: expect.not.objectContaining({ password: expect.anything() }),
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          message:
            'Registration successful. Please check your email to confirm your account.',
        }),
      );
    });
  });

  describe('createEmailVerificationToken', () => {
    it('throws 404 when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.createEmailVerificationToken('missing@example.com'),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });

    it('generates token and updates user', async () => {
      const user = createUser();
      usersService.findByEmail.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      const token = await service.createEmailVerificationToken(user.email);

      expect(token).toMatch(/^\d{6}$/);
      expect(mockRandomBytes).toHaveBeenCalledWith(4);
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        emailVerificationToken: token,
        emailVerificationExpires: expect.any(Date),
      });
    });
  });

  describe('sendEmailVerification', () => {
    it('delegates to EmailService.sendEmailConfirmation', async () => {
      await service.sendEmailVerification('jane@example.com', '123456');

      expect(emailService.sendEmailConfirmation).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
    });
  });

  describe('verifyEmail', () => {
    it('throws 404 when user is not found by token', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        new NotFoundException('Invalid verification token'),
      );
    });

    it('throws 400 when verification fields are missing', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(
        createUser({
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined,
        }),
      );

      await expect(service.verifyEmail('tok')).rejects.toThrow(
        new BadRequestException('Invalid or expired verification token'),
      );
    });

    it('throws 400 when token is expired', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(
        createUser({
          emailVerificationToken: '123456',
          emailVerificationExpires: new Date('2020-01-01'),
        }),
      );

      await expect(service.verifyEmail('123456')).rejects.toThrow(
        new BadRequestException('Verification token has expired'),
      );
    });

    it('throws 400 when token does not match', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(
        createUser({
          emailVerificationToken: '111111',
          emailVerificationExpires: new Date(Date.now() + 86400000),
        }),
      );

      await expect(service.verifyEmail('222222')).rejects.toThrow(
        new BadRequestException('Invalid verification token'),
      );
    });

    it('activates user and clears verification fields on success', async () => {
      const user = createUser({
        isActive: false,
        emailVerificationToken: '123456',
        emailVerificationExpires: new Date(Date.now() + 86400000),
      });
      usersService.findByEmailVerificationToken.mockResolvedValue(user);
      usersService.update.mockResolvedValue({ ...user, isActive: true });

      await expect(service.verifyEmail('123456')).resolves.toBe(true);
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
        emailVerificationToken: '',
        emailVerificationExpires: undefined,
      });
    });
  });

  describe('validateUser', () => {
    it('returns null when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('missing@example.com', 'pass'),
      ).resolves.toBeNull();
    });

    it('returns null when user has no password', async () => {
      usersService.findByEmail.mockResolvedValue(createUser({ password: null }));

      await expect(
        service.validateUser('jane@example.com', 'pass'),
      ).resolves.toBeNull();
    });

    it('returns null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('jane@example.com', 'wrong'),
      ).resolves.toBeNull();
    });

    it('throws when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(
        createUser({ isActive: false }),
      );
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateUser('jane@example.com', 'pass'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Please verify your email before logging in',
        ),
      );
    });

    it('returns user without password on success', async () => {
      usersService.findByEmail.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('jane@example.com', 'pass');

      expect(result).toEqual(expect.not.objectContaining({ password: expect.anything() }));
      expect(result?.email).toBe('jane@example.com');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'jane@example.com',
      password: 'Str0ng!P@ssw0rd',
    };

    it('throws 401 for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('returns sanitized user and tokens on success', async () => {
      usersService.findByEmail.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: expect.not.objectContaining({ password: expect.anything() }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('validateUserById', () => {
    it('delegates to UsersService.findById', async () => {
      const user = createUser();
      usersService.findById.mockResolvedValue(user);

      await expect(service.validateUserById('user-1')).resolves.toBe(user);
      expect(usersService.findById).toHaveBeenCalledWith('user-1');
    });
  });

  describe('refreshToken', () => {
    it('returns new tokens on success', async () => {
      const user = createUser();
      jwtService.verify.mockReturnValue({ id: 'user-1' });
      usersService.findById.mockResolvedValue(user);

      const result = await service.refreshToken({ refreshToken: 'valid-refresh' });

      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh', {
        secret: 'jwt-refresh-secret',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('wraps verification errors as 401 Invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refreshToken({ refreshToken: 'bad' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('wraps user-not-found as 401 Invalid refresh token', async () => {
      jwtService.verify.mockReturnValue({ id: 'missing' });
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'valid-refresh' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });
  });

  describe('createPasswordResetToken', () => {
    it('throws 404 when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.createPasswordResetToken('missing@example.com'),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });

    it('generates token and updates reset fields', async () => {
      const user = createUser();
      usersService.findByEmail.mockResolvedValue(user);
      usersService.updateResetToken.mockResolvedValue(user);

      const token = await service.createPasswordResetToken(user.email);

      expect(token).toMatch(/^\d{6}$/);
      expect(mockRandomBytes).toHaveBeenCalledWith(4);
      expect(usersService.updateResetToken).toHaveBeenCalledWith('user-1', {
        passwordResetToken: token,
        passwordResetExpires: expect.any(Date),
      });
    });
  });

  describe('resetPassword', () => {
    const resetDto = {
      token: '123456',
      password: 'NewP@ssw0rd1',
      confirmPassword: 'NewP@ssw0rd1',
    };

    it('throws 400 when passwords do not match', async () => {
      await expect(
        service.resetPassword({ ...resetDto, confirmPassword: 'other' }),
      ).rejects.toThrow(new BadRequestException('Passwords do not match'));
    });

    it('throws 404 when user is not found', async () => {
      usersService.findByPasswordToken.mockResolvedValue(null);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });

    it('throws 400 when reset fields are missing', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: undefined,
          passwordResetExpires: undefined,
        }),
      );

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException('Invalid or expired reset token'),
      );
    });

    it('throws 400 when reset token is expired', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: '123456',
          passwordResetExpires: new Date('2020-01-01'),
        }),
      );

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException('Reset token has expired'),
      );
    });

    it('throws 400 when token does not match', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: '111111',
          passwordResetExpires: new Date(Date.now() + 3600000),
        }),
      );

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException('Invalid reset token'),
      );
    });

    it('updates password and clears reset token on success', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: '123456',
          passwordResetExpires: new Date(Date.now() + 3600000),
        }),
      );
      usersService.updatePassword.mockResolvedValue(createUser());

      await expect(service.resetPassword(resetDto)).resolves.toBe(true);
      expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', {
        password: 'NewP@ssw0rd1',
        passwordResetToken: '',
        passwordResetExpires: undefined,
      });
    });
  });

  describe('sendResetTokenEmail', () => {
    it('delegates to EmailService.sendPasswordReset and returns token', async () => {
      const result = await service.sendResetTokenEmail(
        'jane@example.com',
        '123456',
      );

      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
      expect(result).toBe('123456');
    });
  });

  describe('changePassword', () => {
    const changeDto = {
      currentPassword: 'OldP@ssw0rd1',
      newPassword: 'NewP@ssw0rd1',
      confirmNewPassword: 'NewP@ssw0rd1',
    };

    it('throws 400 when new passwords do not match', async () => {
      await expect(
        service.changePassword('user-1', {
          ...changeDto,
          confirmNewPassword: 'Mismatch!',
        }),
      ).rejects.toThrow(
        new BadRequestException('New password and confirmation do not match'),
      );
    });

    it('throws 400 when new password equals current password', async () => {
      await expect(
        service.changePassword('user-1', {
          ...changeDto,
          newPassword: changeDto.currentPassword,
          confirmNewPassword: changeDto.currentPassword,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'New password must be different from the current password',
        ),
      );
    });

    it('throws 404 when user is not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', changeDto),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });

    it('throws 400 for social-only accounts without local password', async () => {
      usersService.findById.mockResolvedValue(createUser({ password: null }));

      await expect(
        service.changePassword('user-1', changeDto),
      ).rejects.toThrow(
        new BadRequestException(
          'This account uses social login and has no local password',
        ),
      );
    });

    it('throws 400 when current password is incorrect', async () => {
      usersService.findById.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', changeDto),
      ).rejects.toThrow(
        new BadRequestException('Current password is incorrect'),
      );
    });

    it('updates password on success', async () => {
      usersService.findById.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      usersService.updatePassword.mockResolvedValue(createUser());

      await expect(
        service.changePassword('user-1', changeDto),
      ).resolves.toEqual({ message: 'Password changed successfully' });
      expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', {
        password: 'NewP@ssw0rd1',
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });
    });
  });

  describe('issueTokensForUser', () => {
    it('returns access and refresh tokens', async () => {
      const result = await service.issueTokensForUser(createUser());

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('completeGoogleOAuth', () => {
    const profile: GoogleProfilePayload = {
      googleId: 'google-1',
      email: 'google@example.com',
      firstName: 'Go',
      lastName: 'Ogler',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Google auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeGoogleOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Google authentication is disabled'),
      );
    });

    it('throws 400 when state is missing', async () => {
      await expect(service.completeGoogleOAuth(profile)).rejects.toThrow(
        new BadRequestException('Missing OAuth state'),
      );
    });

    it('throws 400 when state is invalid', async () => {
      await expect(
        service.completeGoogleOAuth(profile, 'not-valid-base64url!!!'),
      ).rejects.toThrow(new BadRequestException('Invalid OAuth state'));
    });

    it('throws 400 when redirect is not allowlisted', async () => {
      const badState = encodeOAuthState('https://evil.example/cb');

      await expect(
        service.completeGoogleOAuth(profile, badState),
      ).rejects.toThrow(new BadRequestException('Redirect URL is not allowed'));
    });

    it('returns existing user by google id and builds redirect with ?', async () => {
      const existing = createUser({ googleId: 'google-1' });
      usersService.findByGoogleId.mockResolvedValue(existing);

      const result = await service.completeGoogleOAuth(profile, state);

      expect(oauthExchangeService.createExchangeCode).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive user found by google id', async () => {
      const inactive = createUser({ googleId: 'google-1', isActive: false });
      const reactivated = createUser({ googleId: 'google-1', isActive: true });
      usersService.findByGoogleId.mockResolvedValue(inactive);
      usersService.update.mockResolvedValue(reactivated);

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links google id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        googleId: profile.googleId,
      });

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        googleId: 'google-1',
        isActive: true,
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(
        createUser({
          email: profile.email,
          lastName: '-',
          googleId: 'google-1',
        }),
      );

      await service.completeGoogleOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          googleId: 'google-1',
          isActive: true,
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=bar');
      usersService.findByGoogleId.mockResolvedValue(createUser());

      const result = await service.completeGoogleOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=bar&code=exchange-code-123',
      );
    });

    it('retries username on collision when creating new user', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername
        .mockResolvedValueOnce(createUser({ username: 'google' }))
        .mockResolvedValueOnce(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.findByUsername).toHaveBeenCalledTimes(2);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^google[a-f0-9]{4}$/),
        }),
      );
    });
  });

  describe('completeFacebookOAuth', () => {
    const profile: FacebookProfilePayload = {
      facebookId: 'fb-1',
      email: 'fb@example.com',
      firstName: 'Face',
      lastName: 'Book',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Facebook auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'facebookOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeFacebookOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Facebook authentication is disabled'),
      );
    });

    it('returns redirect URL for existing facebook user', async () => {
      usersService.findByFacebookId.mockResolvedValue(
        createUser({ facebookId: 'fb-1' }),
      );

      const result = await service.completeFacebookOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive facebook user', async () => {
      usersService.findByFacebookId.mockResolvedValue(
        createUser({ facebookId: 'fb-1', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeFacebookOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links facebook id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByFacebookId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        facebookId: profile.facebookId,
      });

      await service.completeFacebookOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        facebookId: 'fb-1',
        isActive: true,
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      usersService.findByFacebookId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeFacebookOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ lastName: '-' }),
      );
    });
  });

  describe('completeTwitterOAuth', () => {
    const profile: TwitterProfilePayload = {
      twitterId: 'tw-1',
      email: 'tw@example.com',
      firstName: 'Twit',
      lastName: 'Ter',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Twitter auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'twitterOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeTwitterOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Twitter authentication is disabled'),
      );
    });

    it('returns redirect URL for existing twitter user', async () => {
      usersService.findByTwitterId.mockResolvedValue(
        createUser({ twitterId: 'tw-1' }),
      );

      const result = await service.completeTwitterOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive twitter user', async () => {
      usersService.findByTwitterId.mockResolvedValue(
        createUser({ twitterId: 'tw-1', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeTwitterOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links twitter id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByTwitterId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        twitterId: profile.twitterId,
      });

      await service.completeTwitterOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        twitterId: 'tw-1',
        isActive: true,
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      usersService.findByTwitterId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeTwitterOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          twitterId: 'tw-1',
        }),
      );
    });
  });

  describe('exchangeOAuthCode', () => {
    it('throws 503 when all social auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (
          key === 'googleOAuth.enabled' ||
          key === 'facebookOAuth.enabled' ||
          key === 'twitterOAuth.enabled'
        ) {
          return false;
        }
        return defaultConfig[key];
      });

      await expect(
        service.exchangeOAuthCode({ code: 'code-1' }),
      ).rejects.toThrow(
        new ServiceUnavailableException('Social authentication is disabled'),
      );
    });

    it('throws 401 when exchange code user is not found', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('missing');
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.exchangeOAuthCode({ code: 'code-1' }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or expired exchange code'),
      );
    });

    it('throws 401 when user is inactive', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue(createUser({ isActive: false }));

      await expect(
        service.exchangeOAuthCode({ code: 'code-1' }),
      ).rejects.toThrow(
        new UnauthorizedException('User account is not active'),
      );
    });

    it('returns sanitized user and tokens on success', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue(createUser());

      const result = await service.exchangeOAuthCode({ code: 'code-1' });

      expect(result).toEqual({
        user: expect.not.objectContaining({ password: expect.anything() }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('exchangeGoogleCode', () => {
    it('delegates to exchangeOAuthCode', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue(createUser());

      const spy = jest.spyOn(service, 'exchangeOAuthCode');
      await service.exchangeGoogleCode({ code: 'code-1' });

      expect(spy).toHaveBeenCalledWith({ code: 'code-1' });
    });
  });
});
