import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DropboxStrategy, DropboxProfilePayload } from './dropbox.strategy';

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

describe('DropboxStrategy', () => {
    let strategy: DropboxStrategy;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();
        strategy = new DropboxStrategy(
            createConfigService({
                'dropboxOAuth.clientId': 'dropbox-client-id',
                'dropboxOAuth.clientSecret': 'dropbox-client-secret',
                'dropboxOAuth.callbackUrl':
                    'http://localhost:3000/api/v1/auth/dropbox/callback',
            }),
        );
    });

    describe('constructor', () => {
        it('uses disabled/default config when env keys are undefined', () => {
            const fallbackStrategy = new DropboxStrategy(createConfigService());
            expect(fallbackStrategy).toBeDefined();
        });
    });

    describe('validate', () => {
        it('returns profile payload from get_current_account endpoint', async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    account_id: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
                    email: 'user@example.com',
                    name: {
                        given_name: 'Jane',
                        surname: 'Doe',
                    },
                },
            });

            const payload = await strategy.validate(
                'access-token',
                'refresh',
                {},
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.dropboxapi.com/2/users/get_current_account',
                null,
                {
                    headers: { Authorization: 'Bearer access-token' },
                },
            );
            expect(payload).toEqual({
                dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
                email: 'user@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
            } satisfies DropboxProfilePayload);
        });

        it('falls back to display_name when given/surname missing', async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    account_id: 'dbid:abc123',
                    email: 'user@example.com',
                    name: { display_name: 'Jane Doe' },
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('Doe');
        });

        it('falls back to Dropbox when name has no spaces', async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    account_id: 'dbid:abc123',
                    email: 'user@example.com',
                    name: { display_name: 'Jane' },
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('');
        });

        it('uses Dropbox as firstName when name fields are empty', async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    account_id: 'dbid:abc123',
                    email: 'user@example.com',
                    name: {},
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Dropbox');
            expect(payload.lastName).toBe('');
        });

        it('throws when email is missing', async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    account_id: 'dbid:abc123',
                    name: { display_name: 'Jane Doe' },
                },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Dropbox account did not provide an email');
        });

        it('throws when account id is missing', async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    email: 'user@example.com',
                    name: { display_name: 'Jane Doe' },
                },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Dropbox account did not provide an account id');
        });
    });
});
