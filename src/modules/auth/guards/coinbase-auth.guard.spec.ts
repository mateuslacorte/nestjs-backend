import {
    BadRequestException,
    ExecutionContext,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppRequest } from '@common/http/app-http';
import { CoinbaseAuthGuard } from './coinbase-auth.guard';

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

describe('CoinbaseAuthGuard', () => {
    let guard: CoinbaseAuthGuard;
    let configService: ConfigService;
    let superCanActivate: jest.SpyInstance;

    beforeEach(() => {
        configService = createConfigService({
            'coinbaseOAuth.enabled': true,
            'coinbaseOAuth.redirectAllowlist': [
                'https://app.example.com',
                'https://app.example.com/dashboard',
            ],
        });
        guard = new CoinbaseAuthGuard(configService);
        superCanActivate = jest
            .spyOn(
                Object.getPrototypeOf(CoinbaseAuthGuard.prototype),
                'canActivate',
            )
            .mockReturnValue(true);
    });

    afterEach(() => {
        superCanActivate.mockRestore();
    });

    describe('canActivate', () => {
        it('throws ServiceUnavailableException when Coinbase OAuth is disabled', () => {
            configService = createConfigService({
                'coinbaseOAuth.enabled': false,
            });
            guard = new CoinbaseAuthGuard(configService);

            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/coinbase' })),
            ).toThrow(ServiceUnavailableException);
            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/coinbase' })),
            ).toThrow('Coinbase authentication is disabled');
            expect(superCanActivate).not.toHaveBeenCalled();
        });

        it('delegates to super.canActivate when Coinbase OAuth is enabled', () => {
            const context = createHttpContext({ path: '/auth/coinbase' });

            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(superCanActivate).toHaveBeenCalledWith(context);
        });
    });

    describe('getAuthenticateOptions', () => {
        it('returns empty options for callback path', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/coinbase/callback',
                query: { redirect: 'https://evil.com' },
            });

            expect(guard.getAuthenticateOptions(context)).toEqual({});
        });

        it('encodes allowlisted redirect from query in state', () => {
            const redirect = 'https://app.example.com/dashboard/settings';
            const context = createHttpContext({
                path: '/api/v1/auth/coinbase',
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
                path: '/api/v1/auth/coinbase',
                query: { redirect: 'https://evil.com/callback' },
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Redirect URL is not in COINBASE_REDIRECT_ALLOWLIST',
            );
        });

        it('defaults to first allowlist entry when redirect query is missing', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/coinbase',
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
                'coinbaseOAuth.enabled': true,
                'coinbaseOAuth.redirectAllowlist': [],
            });
            guard = new CoinbaseAuthGuard(configService);

            const context = createHttpContext({
                path: '/api/v1/auth/coinbase',
                query: {},
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Missing redirect query parameter and COINBASE_REDIRECT_ALLOWLIST is empty',
            );
        });
    });
});
