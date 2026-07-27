import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PatreonStrategy, PatreonProfilePayload } from './patreon.strategy';

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

describe('PatreonStrategy', () => {
    let strategy: PatreonStrategy;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();
        strategy = new PatreonStrategy(
            createConfigService({
                'patreonOAuth.clientId': 'patreon-client-id',
                'patreonOAuth.clientSecret': 'patreon-client-secret',
                'patreonOAuth.callbackUrl':
                    'http://localhost:3000/api/v1/auth/patreon/callback',
            }),
        );
    });

    describe('constructor', () => {
        it('uses disabled/default config when env keys are undefined', () => {
            const fallbackStrategy = new PatreonStrategy(createConfigService());
            expect(fallbackStrategy).toBeDefined();
        });
    });

    describe('validate', () => {
        it('returns profile payload from identity endpoint', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: 'patreon-user-123',
                        attributes: {
                            email: 'patron@example.com',
                            first_name: 'Jane',
                            last_name: 'Doe',
                        },
                    },
                },
            });

            const payload = await strategy.validate(
                'access-token',
                'refresh',
                {},
            );

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=full_name,first_name,last_name,email',
                {
                    headers: { Authorization: 'Bearer access-token' },
                },
            );
            expect(payload).toEqual({
                patreonId: 'patreon-user-123',
                email: 'patron@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
            } satisfies PatreonProfilePayload);
        });

        it('falls back to full_name when first/last missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: 'patreon-user-123',
                        attributes: {
                            email: 'patron@example.com',
                            full_name: 'Jane Doe',
                        },
                    },
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('Doe');
        });

        it('falls back to Patreon when name has no spaces', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: 'patreon-user-123',
                        attributes: {
                            email: 'patron@example.com',
                            full_name: 'Jane',
                        },
                    },
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('');
        });

        it('uses Patreon as firstName when all name fields are empty', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: 'patreon-user-123',
                        attributes: {
                            email: 'patron@example.com',
                        },
                    },
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Patreon');
            expect(payload.lastName).toBe('');
        });

        it('throws when email is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: 'patreon-user-123',
                        attributes: { full_name: 'Jane Doe' },
                    },
                },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Patreon account did not provide an email');
        });

        it('throws when user id is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        attributes: {
                            email: 'patron@example.com',
                            full_name: 'Jane Doe',
                        },
                    },
                },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Patreon account did not provide a user id');
        });
    });
});
