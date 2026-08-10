import {
    BadRequestException,
    ExecutionContext,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppRequest } from '@common/http/app-http';
import { PatreonAuthGuard } from './patreon-auth.guard';

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

describe('PatreonAuthGuard', () => {
    let guard: PatreonAuthGuard;
    let configService: ConfigService;
    let superCanActivate: jest.SpyInstance;

    beforeEach(() => {
        configService = createConfigService({
            'patreonOAuth.enabled': true,
            'patreonOAuth.redirectAllowlist': [
                'https://app.example.com',
                'https://app.example.com/dashboard',
              'https://app.example.com/dashboard/settings',
            ],
        });
        guard = new PatreonAuthGuard(configService);
        superCanActivate = jest
            .spyOn(
                Object.getPrototypeOf(PatreonAuthGuard.prototype),
                'canActivate',
            )
            .mockReturnValue(true);
    });

    afterEach(() => {
        superCanActivate.mockRestore();
    });

    describe('canActivate', () => {
        it('throws ServiceUnavailableException when Patreon OAuth is disabled', () => {
            configService = createConfigService({
                'patreonOAuth.enabled': false,
            });
            guard = new PatreonAuthGuard(configService);

            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/patreon' })),
            ).toThrow(ServiceUnavailableException);
            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/patreon' })),
            ).toThrow('Patreon authentication is disabled');
            expect(superCanActivate).not.toHaveBeenCalled();
        });

        it('delegates to super.canActivate when Patreon OAuth is enabled', () => {
            const context = createHttpContext({ path: '/auth/patreon' });

            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(superCanActivate).toHaveBeenCalledWith(context);
        });
    });

    describe('getAuthenticateOptions', () => {
        it('returns empty options for callback path', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/patreon/callback',
                query: { redirect: 'https://evil.com' },
            });

            expect(guard.getAuthenticateOptions(context)).toEqual({});
        });

        it('encodes allowlisted redirect from query in state', () => {
            const redirect = 'https://app.example.com/dashboard/settings';
            const context = createHttpContext({
                path: '/api/v1/auth/patreon',
                query: { redirect },
            });

            const options = guard.getAuthenticateOptions(context);
            const state = JSON.parse(
                Buffer.from(options.state as string, 'base64url').toString(
                    'utf8',
                ),
            );

            expect(state).toEqual({ r: redirect });
        });

        it('throws BadRequestException when redirect is not in allowlist', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/patreon',
                query: { redirect: 'https://evil.com/callback' },
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Redirect URL is not in PATREON_REDIRECT_ALLOWLIST',
            );
        });

        it('defaults to first allowlist entry when redirect query is missing', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/patreon',
                query: {},
            });

            const options = guard.getAuthenticateOptions(context);
            const state = JSON.parse(
                Buffer.from(options.state as string, 'base64url').toString(
                    'utf8',
                ),
            );

            expect(state.r).toBe('https://app.example.com');
        });

        it('throws BadRequestException when allowlist is empty and redirect is missing', () => {
            configService = createConfigService({
                'patreonOAuth.enabled': true,
                'patreonOAuth.redirectAllowlist': [],
            });
            guard = new PatreonAuthGuard(configService);

            const context = createHttpContext({
                path: '/api/v1/auth/patreon',
                query: {},
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Missing redirect query parameter and PATREON_REDIRECT_ALLOWLIST is empty',
            );
        });
    });
});
