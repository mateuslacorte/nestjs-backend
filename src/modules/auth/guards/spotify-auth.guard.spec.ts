import {
    BadRequestException,
    ExecutionContext,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SpotifyAuthGuard } from './spotify-auth.guard';

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

describe('SpotifyAuthGuard', () => {
    let guard: SpotifyAuthGuard;
    let configService: ConfigService;
    let superCanActivate: jest.SpyInstance;

    beforeEach(() => {
        configService = createConfigService({
            'spotifyOAuth.enabled': true,
            'spotifyOAuth.redirectAllowlist': [
                'https://app.example.com',
                'https://app.example.com/dashboard',
            ],
        });
        guard = new SpotifyAuthGuard(configService);
        superCanActivate = jest
            .spyOn(
                Object.getPrototypeOf(SpotifyAuthGuard.prototype),
                'canActivate',
            )
            .mockReturnValue(true);
    });

    afterEach(() => {
        superCanActivate.mockRestore();
    });

    describe('canActivate', () => {
        it('throws ServiceUnavailableException when Spotify OAuth is disabled', () => {
            configService = createConfigService({
                'spotifyOAuth.enabled': false,
            });
            guard = new SpotifyAuthGuard(configService);

            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/spotify' })),
            ).toThrow(ServiceUnavailableException);
            expect(() =>
                guard.canActivate(createHttpContext({ path: '/auth/spotify' })),
            ).toThrow('Spotify authentication is disabled');
            expect(superCanActivate).not.toHaveBeenCalled();
        });

        it('delegates to super.canActivate when Spotify OAuth is enabled', () => {
            const context = createHttpContext({ path: '/auth/spotify' });

            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(superCanActivate).toHaveBeenCalledWith(context);
        });
    });

    describe('getAuthenticateOptions', () => {
        it('returns empty options for callback path', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/spotify/callback',
                query: { redirect: 'https://evil.com' },
            });

            expect(guard.getAuthenticateOptions(context)).toEqual({});
        });

        it('encodes allowlisted redirect from query in state', () => {
            const redirect = 'https://app.example.com/dashboard/settings';
            const context = createHttpContext({
                path: '/api/v1/auth/spotify',
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
                path: '/api/v1/auth/spotify',
                query: { redirect: 'https://evil.com/callback' },
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Redirect URL is not in SPOTIFY_REDIRECT_ALLOWLIST',
            );
        });

        it('defaults to first allowlist entry when redirect query is missing', () => {
            const context = createHttpContext({
                path: '/api/v1/auth/spotify',
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
                'spotifyOAuth.enabled': true,
                'spotifyOAuth.redirectAllowlist': [],
            });
            guard = new SpotifyAuthGuard(configService);

            const context = createHttpContext({
                path: '/api/v1/auth/spotify',
                query: {},
            });

            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                BadRequestException,
            );
            expect(() => guard.getAuthenticateOptions(context)).toThrow(
                'Missing redirect query parameter and SPOTIFY_REDIRECT_ALLOWLIST is empty',
            );
        });
    });
});

