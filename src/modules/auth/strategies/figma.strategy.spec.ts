import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FigmaStrategy, FigmaProfilePayload } from './figma.strategy';

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

describe('FigmaStrategy', () => {
  let strategy: FigmaStrategy;
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new FigmaStrategy(
      createConfigService({
        'figmaOAuth.clientId': 'figma-client-id',
        'figmaOAuth.clientSecret': 'figma-client-secret',
        'figmaOAuth.callbackUrl':
          'http://localhost:3000/api/v1/auth/figma/callback',
      }),
    );
  });

  describe('constructor', () => {
    it('uses disabled/default config when env keys are undefined', () => {
      const fallbackStrategy = new FigmaStrategy(createConfigService());
      expect(fallbackStrategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('returns profile payload from /v1/me', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          id: 'fig-123',
          email: 'jane@example.com',
          handle: 'Jane Doe',
        },
      });

      const payload = await strategy.validate('access-token', 'refresh', {});

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.figma.com/v1/me',
        {
          headers: { Authorization: 'Bearer access-token' },
        },
      );
      expect(payload).toEqual({
        figmaId: 'fig-123',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies FigmaProfilePayload);
    });

    it('throws when email is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { id: 'fig-123', handle: 'Jane' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Figma account did not provide an email');
    });

    it('throws when user id is missing', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { email: 'jane@example.com' },
      });

      await expect(
        strategy.validate('access-token', 'refresh', {}),
      ).rejects.toThrow('Figma account did not provide a user id');
    });

    it('uses User as firstName when handle is empty', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { id: 'fig-1', email: 'a@b.com', handle: '' },
      });

      const payload = await strategy.validate('token', 'refresh', {});

      expect(payload).toEqual(
        expect.objectContaining({
          firstName: 'User',
          lastName: '',
        }),
      );
    });
  });
});
