import {
  BadRequestException,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TwitchAuthGuard } from './twitch-auth.guard';

function createConfigService(
  values: Record<string, unknown> = {},
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createHttpContext(req: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req as Request,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getType: jest.fn(() => 'http'),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('TwitchAuthGuard', () => {
  let guard: TwitchAuthGuard;
  let configService: ConfigService;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    configService = createConfigService({
      'twitchOAuth.enabled': true,
      'twitchOAuth.redirectAllowlist': [
        'https://app.example.com',
        'https://app.example.com/dashboard',
      ],
    });
    guard = new TwitchAuthGuard(configService);
    superCanActivate = jest
      .spyOn(Object.getPrototypeOf(TwitchAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    superCanActivate.mockRestore();
  });

  describe('canActivate', () => {
    it('throws ServiceUnavailableException when Twitch OAuth is disabled', () => {
      configService = createConfigService({ 'twitchOAuth.enabled': false });
      guard = new TwitchAuthGuard(configService);

      expect(() =>
        guard.canActivate(createHttpContext({ path: '/auth/twitch' })),
      ).toThrow(ServiceUnavailableException);
      expect(() =>
        guard.canActivate(createHttpContext({ path: '/auth/twitch' })),
      ).toThrow('Twitch authentication is disabled');
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('delegates to super.canActivate when Twitch OAuth is enabled', () => {
      const context = createHttpContext({ path: '/auth/twitch' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('getAuthenticateOptions', () => {
    it('returns empty options for callback path', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/twitch/callback',
        query: { redirect: 'https://evil.com' },
      });

      expect(guard.getAuthenticateOptions(context)).toEqual({});
    });

    it('encodes allowlisted redirect from query in state', () => {
      const redirect = 'https://app.example.com/dashboard/settings';
      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: { redirect },
      });

      const options = guard.getAuthenticateOptions(context);
      const state = JSON.parse(
        Buffer.from(options.state as string, 'base64url').toString('utf8'),
      );

      expect(state).toEqual({ r: redirect });
    });

    it('allows redirect that exactly matches an allowlist entry', () => {
      const redirect = 'https://app.example.com';
      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: { redirect },
      });

      const options = guard.getAuthenticateOptions(context);
      const state = JSON.parse(
        Buffer.from(options.state as string, 'base64url').toString('utf8'),
      );

      expect(state.r).toBe(redirect);
    });

    it('allows redirect that starts with an allowlist prefix', () => {
      const redirect = 'https://app.example.com/settings/profile';
      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: { redirect },
      });

      const options = guard.getAuthenticateOptions(context);
      const state = JSON.parse(
        Buffer.from(options.state as string, 'base64url').toString('utf8'),
      );

      expect(state.r).toBe(redirect);
    });

    it('throws BadRequestException when redirect is not in allowlist', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: { redirect: 'https://evil.com/callback' },
      });

      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        BadRequestException,
      );
      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        'Redirect URL is not in TWITCH_REDIRECT_ALLOWLIST',
      );
    });

    it('defaults to first allowlist entry when redirect query is missing', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: {},
      });

      const options = guard.getAuthenticateOptions(context);
      const state = JSON.parse(
        Buffer.from(options.state as string, 'base64url').toString('utf8'),
      );

      expect(state.r).toBe('https://app.example.com');
    });

    it('throws BadRequestException when allowlist is empty and redirect is missing', () => {
      configService = createConfigService({
        'twitchOAuth.enabled': true,
        'twitchOAuth.redirectAllowlist': [],
      });
      guard = new TwitchAuthGuard(configService);

      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: {},
      });

      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        BadRequestException,
      );
      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        'Missing redirect query parameter and TWITCH_REDIRECT_ALLOWLIST is empty',
      );
    });

    it('trims whitespace from redirect query parameter', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: { redirect: '  https://app.example.com  ' },
      });

      const options = guard.getAuthenticateOptions(context);
      const state = JSON.parse(
        Buffer.from(options.state as string, 'base64url').toString('utf8'),
      );

      expect(state.r).toBe('https://app.example.com');
    });

    it('ignores non-string redirect query values', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/twitch',
        query: { redirect: ['https://app.example.com'] as unknown as string },
      });

      const options = guard.getAuthenticateOptions(context);
      const state = JSON.parse(
        Buffer.from(options.state as string, 'base64url').toString('utf8'),
      );

      expect(state.r).toBe('https://app.example.com');
    });
  });
});
