import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
    MicrosoftStrategy,
    MicrosoftProfilePayload,
} from './microsoft.strategy';

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

describe('MicrosoftStrategy', () => {
    let strategy: MicrosoftStrategy;
    const mockedAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();
        strategy = new MicrosoftStrategy(
            createConfigService({
                'microsoftOAuth.clientId': 'microsoft-client-id',
                'microsoftOAuth.clientSecret': 'microsoft-client-secret',
                'microsoftOAuth.callbackUrl':
                    'http://localhost:3000/api/v1/auth/microsoft/callback',
                'microsoftOAuth.authorizationUrl':
                    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
                'microsoftOAuth.tokenUrl':
                    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            }),
        );
    });

    describe('constructor', () => {
        it('uses disabled/default config when env keys are undefined', () => {
            const fallbackStrategy = new MicrosoftStrategy(createConfigService());
            expect(fallbackStrategy).toBeDefined();
        });
    });

    describe('validate', () => {
        it('returns profile payload from Graph /me', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    id: 'ms-object-id-001',
                    mail: 'jane@example.com',
                    givenName: 'Jane',
                    surname: 'Doe',
                },
            });

            const payload = await strategy.validate(
                'access-token',
                'refresh',
                {},
            );

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://graph.microsoft.com/v1.0/me',
                {
                    headers: { Authorization: 'Bearer access-token' },
                },
            );
            expect(payload).toEqual({
                microsoftId: 'ms-object-id-001',
                email: 'jane@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
            } satisfies MicrosoftProfilePayload);
        });

        it('falls back to userPrincipalName when mail is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    id: 'ms-object-id-001',
                    userPrincipalName: 'jane@contoso.com',
                    displayName: 'Jane Doe',
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.email).toBe('jane@contoso.com');
            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('Doe');
        });

        it('falls back to displayName when givenName is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    id: 'ms-object-id-001',
                    mail: 'jane@example.com',
                    displayName: 'Jane',
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Jane');
            expect(payload.lastName).toBe('');
        });

        it('uses Microsoft as firstName when givenName and displayName are empty', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {
                    id: 'ms-object-id-001',
                    mail: 'jane@example.com',
                },
            });

            const payload = await strategy.validate('token', 'refresh', {});

            expect(payload.firstName).toBe('Microsoft');
            expect(payload.lastName).toBe('');
        });

        it('throws when email is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: { id: 'ms-object-id-001', displayName: 'Jane Doe' },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Microsoft account did not provide an email');
        });

        it('throws when id is missing', async () => {
            mockedAxios.get.mockResolvedValue({
                data: { mail: 'jane@example.com', displayName: 'Jane Doe' },
            });

            await expect(
                strategy.validate('access-token', 'refresh', {}),
            ).rejects.toThrow('Microsoft account did not provide a user id');
        });
    });
});
