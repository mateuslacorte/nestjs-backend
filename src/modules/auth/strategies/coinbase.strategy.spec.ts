import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CoinbaseStrategy, CoinbaseProfilePayload } from './coinbase.strategy';

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

describe('CoinbaseStrategy', () => {
    let strategy: CoinbaseStrategy;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();
        strategy = new CoinbaseStrategy(
            createConfigService({
                'coinbaseOAuth.clientId': 'coinbase-client-id',
                'coinbaseOAuth.clientSecret': 'coinbase-client-secret',
                'coinbaseOAuth.callbackUrl':
                    'http://localhost:3000/api/v1/auth/coinbase/callback',
            }),
        );
    });

    describe('constructor', () => {
        it('uses disabled/default config when env keys are undefined', () => {
            const fallbackStrategy = new CoinbaseStrategy(createConfigService());
            expect(fallbackStrategy).toBeDefined();
        });
    });

    describe('validate', () => {
        it('returns profile payload from user endpoint', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
                        name: 'Jane Doe',
                        email: 'jane@example.com',
                    },
                },
            });

            const payload = await strategy.validate(
                'access-token',
                'refresh',
                {},
            );

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.coinbase.com/v2/user',
                {
                    headers: {
                        Authorization: 'Bearer access-token',
                        'CB-VERSION': '2021-06-23',
                    },
                },
            );
            expect(payload).toEqual({
                coinbaseId: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
                email: 'jane@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
            } satisfies CoinbaseProfilePayload);
        });

        it('falls back to Coinbase when name has no spaces', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
                        name: 'Jane',
                        email: 'jane@example.com',
                    },
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('');
        });

        it('uses Coinbase as firstName when name is empty', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
                        name: '',
                        email: 'jane@example.com',
                    },
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Coinbase');
            expect(payload.lastName).toBe('');
        });

        it('throws when email is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        id: '9da7a204-544e-5fd1-9a12-61176c5d4cd8',
                        name: 'Jane Doe',
                    },
                },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Coinbase account did not provide an email');
        });

        it('throws when user id is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    data: {
                        email: 'jane@example.com',
                        name: 'Jane Doe',
                    },
                },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Coinbase account did not provide a user id');
        });
    });
});
