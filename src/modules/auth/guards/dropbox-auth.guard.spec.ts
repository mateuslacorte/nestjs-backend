import {
    BadRequestException,
    ExecutionContext,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppRequest } from '@common/http/app-http';
import { DropboxAuthGuard } from './dropbox-auth.guard';

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

describe('DropboxAuthGuard', () => {
    let guard: DropboxAuthGuard;
    let configService: ConfigService;
    let superCanActivate: jest.SpyInstance;

    beforeEach(() => {
        configService = createConfigService({
            'dropboxOAuth.enabled': true,
            'dropboxOAuth.redirectAllowlist': [
                'https://app.example.com',
                'https://app.example.com/dashboard',
            ],
        });
        guard = new DropboxAuthGuard(configService);
        superCanActivate = jest
            .spyOn(
                Object.getPrototypeOf(DropboxAuthGuard.prototype),
                'canActivate',
            )
            .mockReturnValue(true);
    });

    afterEach(() => {
        superCanActivate.mockRestore();
    });

    describe('canActivate', () => {
        it('throws ServiceUnavailableException when Dropbox OAuth is disabled', () => {
            configService = createConfigService({
                'dropboxOAuth.enabled': false,
            });
            guard = new DropboxAuthGuard(configService);

            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/dropbox' })),
            ).toThrow(ServiceUnavailableException);
            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/dropbox' })),
            ).toThrow('Dropbox authentication is disabled');
            expect(superCanActivate).not.toHaveBeenCalled();
        });

        it('delegates to super.canActivate when Dropbox OAuth is enabled', () => {
            const context = createHttpContext({ path: '/auth/dropbox' });

            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(superCanActivate).toHaveBeenCalledWith(context);
        });
    });

    describe('getAuthenticateOptions', () => {
        it('returns empty options for callback path', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/dropbox/callback',
                query: { redirect: 'https://evil.com' },
            });

            expect(guard.getAuthenticateOptions(context)).toEqual({});
        });

        it('encodes allowlisted redirect from query in state', () => {
            const redirect = 'https://app.example.com/dashboard/settings';
            const context = createHttpContext({
                path: '/api/v1/auth/dropbox',
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
                path: '/api/v1/auth/dropbox',
                query: { redirect: 'https://evil.com/callback' },
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Redirect URL is not in DROPBOX_REDIRECT_ALLOWLIST',
            );
        });

        it('defaults to first allowlist entry when redirect query is missing', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/dropbox',
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
                'dropboxOAuth.enabled': true,
                'dropboxOAuth.redirectAllowlist': [],
            });
            guard = new DropboxAuthGuard(configService);

            const context = createHttpContext({
                path: '/api/v1/auth/dropbox',
                query: {},
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Missing redirect query parameter and DROPBOX_REDIRECT_ALLOWLIST is empty',
            );
        });
    });
});
