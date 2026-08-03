import {
  BadRequestException,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppRequest } from '@common/http/app-http';
import { SlackAuthGuard } from './slack-auth.guard';

function createConfigService(
  values: Record<string, unknown> = {},
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createHttpContext(req: Partial<AppRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req as AppRequest,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getType: jest.fn(() => 'http'),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('SlackAuthGuard', () => {
  let guard: SlackAuthGuard;
  let configService: ConfigService;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    configService = createConfigService({
      'slackOAuth.enabled': true,
      'slackOAuth.redirectAllowlist': [
        'https://app.example.com',
        'https://app.example.com/dashboard',
      ],
    });
    guard = new SlackAuthGuard(configService);
    superCanActivate = jest
      .spyOn(Object.getPrototypeOf(SlackAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    superCanActivate.mockRestore();
  });

  describe('canActivate', () => {
    it('throws ServiceUnavailableException when Slack OAuth is disabled', () => {
      configService = createConfigService({ 'slackOAuth.enabled': false });
      guard = new SlackAuthGuard(configService);

      expect(() =>
        guard.canActivate(createHttpContext({ path: '/auth/slack' })),
      ).toThrow(ServiceUnavailableException);
      expect(() =>
        guard.canActivate(createHttpContext({ path: '/auth/slack' })),
      ).toThrow('Slack authentication is disabled');
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('delegates to super.canActivate when Slack OAuth is enabled', () => {
      const context = createHttpContext({ path: '/auth/slack' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('getAuthenticateOptions', () => {
    it('returns empty options for callback path', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/slack/callback',
        query: { redirect: 'https://evil.com' },
      });

      expect(guard.getAuthenticateOptions(context)).toEqual({});
    });

    it('encodes allowlisted redirect from query in state', () => {
      const redirect = 'https://app.example.com/dashboard/settings';
      const context = createHttpContext({
        path: '/api/v1/auth/slack',
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
        path: '/api/v1/auth/slack',
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
        path: '/api/v1/auth/slack',
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
        path: '/api/v1/auth/slack',
        query: { redirect: 'https://evil.com/callback' },
      });

      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        BadRequestException,
      );
      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        'Redirect URL is not in SLACK_REDIRECT_ALLOWLIST',
      );
    });

    it('defaults to first allowlist entry when redirect query is missing', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/slack',
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
        'slackOAuth.enabled': true,
        'slackOAuth.redirectAllowlist': [],
      });
      guard = new SlackAuthGuard(configService);

      const context = createHttpContext({
        path: '/api/v1/auth/slack',
        query: {},
      });

      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        BadRequestException,
      );
      expect(() => guard.getAuthenticateOptions(context)).toThrow(
        'Missing redirect query parameter and SLACK_REDIRECT_ALLOWLIST is empty',
      );
    });

    it('trims whitespace from redirect query parameter', () => {
      const context = createHttpContext({
        path: '/api/v1/auth/slack',
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
        path: '/api/v1/auth/slack',
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
