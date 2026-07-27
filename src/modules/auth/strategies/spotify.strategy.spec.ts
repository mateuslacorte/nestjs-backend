import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SpotifyStrategy, SpotifyProfilePayload } from './spotify.strategy';

jest.mock('axios');
jest.mock('passport-oauth2', () => ({
    Strategy: class MockOAuth2Strategy {},
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

describe('SpotifyStrategy', () => {
    let strategy: SpotifyStrategy;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();
        strategy = new SpotifyStrategy(
            createConfigService({
                'spotifyOAuth.clientId': 'spotify-client-id',
                'spotifyOAuth.clientSecret': 'spotify-client-secret',
                'spotifyOAuth.callbackUrl':
                    'http://localhost:3000/api/v1/auth/spotify/callback',
            }),
        );
    });

    describe('constructor', () => {
        it('uses disabled/default config when env keys are undefined', () => {
            const fallbackStrategy = new SpotifyStrategy(createConfigService());
            expect(fallbackStrategy).toBeDefined();
        });
    });

    describe('validate', () => {
        it('returns profile payload from /v1/me', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    id: 'spotify-123',
                    email: 'jane@example.com',
                    display_name: 'Jane Doe',
                },
            });

            const payload = await strategy.validate(
                'access-token',
                'refresh',
                {},
            );

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/me',
                {
                    headers: { Authorization: 'Bearer access-token' },
                },
            );
            expect(payload).toEqual({
                spotifyId: 'spotify-123',
                email: 'jane@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
            } satisfies SpotifyProfilePayload);
        });

        it('falls back to display_name when it has no spaces', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    id: 'spotify-123',
                    email: 'jane@example.com',
                    display_name: 'Jane',
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('');
        });

        it('uses Spotify as firstName when display_name is empty', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    id: 'spotify-123',
                    email: 'jane@example.com',
                    display_name: '',
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Spotify');
            expect(payload.lastName).toBe('');
        });

        it('throws when email is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: { id: 'spotify-123', display_name: 'Jane Doe' },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Spotify account did not provide an email');
        });

        it('throws when id is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: { email: 'jane@example.com', display_name: 'Jane Doe' },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Spotify account did not provide a user id');
        });
    });
});

