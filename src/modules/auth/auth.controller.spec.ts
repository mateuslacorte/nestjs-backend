import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshtokenDto } from './dtos/refreshtoken.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ExchangeCodeDto } from './dtos/exchange-code.dto';
import { GoogleProfilePayload } from './strategies/google.strategy';
import { FacebookProfilePayload } from './strategies/facebook.strategy';
import { Role } from './enums/role.enum';

function encodeOAuthState(redirect: string): string {
  return Buffer.from(JSON.stringify({ r: redirect }), 'utf8').toString(
    'base64url',
  );
}

describe('AuthController', () => {
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    completeGoogleOAuth: jest.Mock;
    completeFacebookOAuth: jest.Mock;
    exchangeOAuthCode: jest.Mock;
    refreshToken: jest.Mock;
    createPasswordResetToken: jest.Mock;
    sendResetTokenEmail: jest.Mock;
    resetPassword: jest.Mock;
    changePassword: jest.Mock;
    verifyEmail: jest.Mock;
    createEmailVerificationToken: jest.Mock;
    sendEmailVerification: jest.Mock;
  };
  let controller: AuthController;
  const reflector = new Reflector();

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      completeGoogleOAuth: jest.fn(),
      completeFacebookOAuth: jest.fn(),
      exchangeOAuthCode: jest.fn(),
      refreshToken: jest.fn(),
      createPasswordResetToken: jest.fn(),
      sendResetTokenEmail: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
      verifyEmail: jest.fn(),
      createEmailVerificationToken: jest.fn(),
      sendEmailVerification: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  describe('routing metadata', () => {
    it('is mounted at /auth', () => {
      expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
    });

    it.each([
      ['register', RequestMethod.POST, 'register'],
      ['login', RequestMethod.POST, 'login'],
      ['googleAuth', RequestMethod.GET, 'google'],
      ['googleAuthCallback', RequestMethod.GET, 'google/callback'],
      ['facebookAuth', RequestMethod.GET, 'facebook'],
      ['facebookAuthCallback', RequestMethod.GET, 'facebook/callback'],
      ['exchangeCode', RequestMethod.POST, 'exchange'],
      ['verifyToken', RequestMethod.POST, 'verify-token'],
      ['refreshToken', RequestMethod.POST, 'refresh-token'],
      ['forgotPassword', RequestMethod.POST, 'forgot-password'],
      ['resetPassword', RequestMethod.POST, 'reset-password'],
      ['changePassword', RequestMethod.POST, 'change-password'],
      ['verifyEmail', RequestMethod.GET, 'verify-email'],
      ['resendVerification', RequestMethod.POST, 'resend-verification'],
    ] as const)(
      '%s uses the expected HTTP method and path',
      (method, httpMethod, path) => {
        expect(
          Reflect.getMetadata(
            METHOD_METADATA,
            AuthController.prototype[method],
          ),
        ).toBe(httpMethod);
        expect(
          Reflect.getMetadata(PATH_METADATA, AuthController.prototype[method]),
        ).toBe(path);
      },
    );
  });

  describe('Public metadata', () => {
    const publicMethods = [
      'register',
      'login',
      'googleAuth',
      'googleAuthCallback',
      'facebookAuth',
      'facebookAuthCallback',
      'exchangeCode',
      'refreshToken',
      'forgotPassword',
      'resetPassword',
      'verifyEmail',
      'resendVerification',
    ] as const;

    it.each(publicMethods)('%s is marked public', (method) => {
      expect(
        reflector.get(IS_PUBLIC_KEY, AuthController.prototype[method]),
      ).toBe(true);
    });

    it('verifyToken is not public', () => {
      expect(
        reflector.get(IS_PUBLIC_KEY, AuthController.prototype.verifyToken),
      ).toBeUndefined();
    });

    it('changePassword is not public', () => {
      expect(
        reflector.get(IS_PUBLIC_KEY, AuthController.prototype.changePassword),
      ).toBeUndefined();
    });
  });

  describe('guards', () => {
    it('verifyToken uses JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.verifyToken,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard]));
    });

    it('changePassword uses JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.changePassword,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard]));
    });

    it('googleAuth uses GoogleAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.googleAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([GoogleAuthGuard]));
    });

    it('facebookAuth uses FacebookAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.facebookAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([FacebookAuthGuard]));
    });
  });

  describe('register', () => {
    it('delegates to AuthService.register', async () => {
      const dto: RegisterDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
        confirmPassword: 'Str0ng!P@ssw0rd',
      };
      const response = { user: {}, accessToken: 'a', refreshToken: 'r' };
      authService.register.mockResolvedValue(response);

      await expect(controller.register(dto)).resolves.toBe(response);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delegates to AuthService.login', async () => {
      const dto: LoginDto = {
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
      };
      const response = { user: {}, accessToken: 'a', refreshToken: 'r' };
      authService.login.mockResolvedValue(response);

      await expect(controller.login(dto)).resolves.toBe(response);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('OAuth entrypoints', () => {
    it('googleAuth is a no-op (guard handles redirect)', () => {
      expect(controller.googleAuth()).toBeUndefined();
    });

    it('facebookAuth is a no-op (guard handles redirect)', () => {
      expect(controller.facebookAuth()).toBeUndefined();
    });
  });

  describe('googleAuthCallback', () => {
    it('redirects using AuthService.completeGoogleOAuth result', async () => {
      const profile: GoogleProfilePayload = {
        googleId: 'g-1',
        email: 'g@example.com',
        firstName: 'Go',
        lastName: 'Ogler',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as Request;
      const res = { redirect: jest.fn() } as unknown as Response;

      authService.completeGoogleOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=abc',
      });

      await controller.googleAuthCallback(req, res);

      expect(authService.completeGoogleOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example/cb?code=abc',
      );
    });

    it('passes undefined state when query.state is not a string', async () => {
      const profile: GoogleProfilePayload = {
        googleId: 'g-1',
        email: 'g@example.com',
        firstName: 'Go',
        lastName: 'Ogler',
      };
      const req = {
        user: profile,
        query: { state: ['a', 'b'] },
      } as unknown as Request;
      const res = { redirect: jest.fn() } as unknown as Response;

      authService.completeGoogleOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=abc',
      });

      await controller.googleAuthCallback(req, res);

      expect(authService.completeGoogleOAuth).toHaveBeenCalledWith(
        profile,
        undefined,
      );
    });
  });

  describe('facebookAuthCallback', () => {
    it('redirects using AuthService.completeFacebookOAuth result', async () => {
      const profile: FacebookProfilePayload = {
        facebookId: 'fb-1',
        email: 'fb@example.com',
        firstName: 'Face',
        lastName: 'Book',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as Request;
      const res = { redirect: jest.fn() } as unknown as Response;

      authService.completeFacebookOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=xyz',
      });

      await controller.facebookAuthCallback(req, res);

      expect(authService.completeFacebookOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example/cb?code=xyz',
      );
    });
  });

  describe('exchangeCode', () => {
    it('delegates to AuthService.exchangeOAuthCode', async () => {
      const dto: ExchangeCodeDto = { code: 'exchange-code' };
      const response = {
        user: { id: 'user-1', roles: [Role.USER] },
        accessToken: 'a',
        refreshToken: 'r',
      };
      authService.exchangeOAuthCode.mockResolvedValue(response);

      await expect(controller.exchangeCode(dto)).resolves.toBe(response);
      expect(authService.exchangeOAuthCode).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyToken', () => {
    it('returns valid token message with user payload', () => {
      const req = {
        user: { id: 'user-1', email: 'jane@example.com', roles: [Role.USER] },
      } as unknown as Request;

      expect(controller.verifyToken(req)).toEqual({
        message: 'Token is valid',
        user: req.user,
      });
    });
  });

  describe('refreshToken', () => {
    it('delegates to AuthService.refreshToken', async () => {
      const dto: RefreshtokenDto = { refreshToken: 'refresh-token' };
      const tokens = { accessToken: 'a', refreshToken: 'r' };
      authService.refreshToken.mockResolvedValue(tokens);

      await expect(controller.refreshToken(dto)).resolves.toBe(tokens);
      expect(authService.refreshToken).toHaveBeenCalledWith(dto);
    });
  });

  describe('forgotPassword', () => {
    it('creates reset token, sends email, and returns message', async () => {
      const dto: ForgotPasswordDto = { email: 'jane@example.com' };
      authService.createPasswordResetToken.mockResolvedValue('123456');
      authService.sendResetTokenEmail.mockResolvedValue('123456');

      await expect(controller.forgotPassword(dto)).resolves.toEqual({
        message: 'Password reset instructions sent to your email',
      });
      expect(authService.createPasswordResetToken).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(authService.sendResetTokenEmail).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
    });
  });

  describe('resetPassword', () => {
    it('delegates to AuthService.resetPassword and returns message', async () => {
      const dto: ResetPasswordDto = {
        token: '123456',
        password: 'NewP@ssw0rd1',
        confirmPassword: 'NewP@ssw0rd1',
      };
      authService.resetPassword.mockResolvedValue(true);

      await expect(controller.resetPassword(dto)).resolves.toEqual({
        message: 'Password reset successfully',
      });
      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('changePassword', () => {
    it('delegates to AuthService.changePassword with authenticated user id', async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'OldP@ssw0rd1',
        newPassword: 'NewP@ssw0rd1',
        confirmNewPassword: 'NewP@ssw0rd1',
      };
      const req = { user: { id: 'user-1' } } as unknown as Request;
      const response = { message: 'Password changed successfully' };
      authService.changePassword.mockResolvedValue(response);

      await expect(controller.changePassword(req, dto)).resolves.toBe(response);
      expect(authService.changePassword).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('verifyEmail', () => {
    it('returns success message when verification succeeds', async () => {
      authService.verifyEmail.mockResolvedValue(true);

      await expect(controller.verifyEmail('123456')).resolves.toEqual({
        message: 'Email verified successfully. You can now login.',
      });
      expect(authService.verifyEmail).toHaveBeenCalledWith('123456');
    });
  });

  describe('resendVerification', () => {
    it('creates verification token, sends email, and returns message', async () => {
      authService.createEmailVerificationToken.mockResolvedValue('123456');
      authService.sendEmailVerification.mockResolvedValue(undefined);

      await expect(
        controller.resendVerification('jane@example.com'),
      ).resolves.toEqual({
        message: 'Email verification resent successfully',
      });
      expect(authService.createEmailVerificationToken).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(authService.sendEmailVerification).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
    });
  });
});
