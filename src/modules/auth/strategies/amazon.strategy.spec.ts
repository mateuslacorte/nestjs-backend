import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AmazonStrategy, AmazonProfilePayload } from './amazon.strategy';

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

describe('AmazonStrategy', () => {
    let strategy: AmazonStrategy;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();
        strategy = new AmazonStrategy(
            createConfigService({
                'amazonOAuth.clientId': 'amazon-client-id',
                'amazonOAuth.clientSecret': 'amazon-client-secret',
                'amazonOAuth.callbackUrl':
                    'http://localhost:3000/api/v1/auth/amazon/callback',
            }),
        );
    });

    describe('constructor', () => {
        it('uses disabled/default config when env keys are undefined', () => {
            const fallbackStrategy = new AmazonStrategy(createConfigService());
            expect(fallbackStrategy).toBeDefined();
        });
    });

    describe('validate', () => {
        it('returns profile payload from /user/profile', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    user_id: 'amzn1.account.abc123',
                    email: 'jane@example.com',
                    name: 'Jane Doe',
                },
            });

            const payload = await strategy.validate(
                'access-token',
                'refresh',
                {},
            );

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.amazon.com/user/profile',
                {
                    headers: { Authorization: 'Bearer access-token' },
                },
            );
            expect(payload).toEqual({
                amazonId: 'amzn1.account.abc123',
                email: 'jane@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
            } satisfies AmazonProfilePayload);
        });

        it('falls back to Amazon when name has no spaces', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    user_id: 'amzn1.account.abc123',
                    email: 'jane@example.com',
                    name: 'Jane',
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('');
        });

        it('uses Amazon as firstName when name is empty', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    user_id: 'amzn1.account.abc123',
                    email: 'jane@example.com',
                    name: '',
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Amazon');
            expect(payload.lastName).toBe('');
        });

        it('throws when email is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: { user_id: 'amzn1.account.abc123', name: 'Jane Doe' },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Amazon account did not provide an email');
        });

        it('throws when user_id is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: { email: 'jane@example.com', name: 'Jane Doe' },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Amazon account did not provide a user id');
        });
    });
});
