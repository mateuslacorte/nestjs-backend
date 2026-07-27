import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  SteamStrategy,
  SteamOpenIdPassportStrategy,
  SteamProfilePayload,
} from './steam.strategy';

jest.mock('axios');

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

function runCallback(
  strategy: SteamOpenIdPassportStrategy,
  query: Record<string, string>,
): Promise<SteamProfilePayload> {
  return new Promise((resolve, reject) => {
    (strategy as any).success = (user: SteamProfilePayload) => resolve(user);
    (strategy as any).error = (err: Error) => reject(err);
    (strategy as any).fail = () => reject(new Error('fail'));
    strategy.authenticate({
      path: '/api/v1/auth/steam/callback',
      query,
    } as any);
  });
}

describe('SteamStrategy', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('uses default OpenID options when config keys are undefined', () => {
      const strategy = new SteamStrategy(createConfigService());
      expect(strategy).toBeDefined();
      expect((strategy as any).returnURL).toBe(
        'http://localhost:3000/api/v1/auth/steam/callback',
      );
      expect((strategy as any).realm).toBe('http://localhost:3000/');
      expect((strategy as any).apiKey).toBe('');
    });

    it('uses configured OpenID options when provided', () => {
      const strategy = new SteamStrategy(
        createConfigService({
          'steamOpenId.callbackUrl': 'https://app.example/steam/callback',
          'steamOpenId.realm': 'https://app.example/',
          'steamOpenId.apiKey': 'configured-key',
        }),
      );

      expect((strategy as any).returnURL).toBe(
        'https://app.example/steam/callback',
      );
      expect((strategy as any).realm).toBe('https://app.example/');
      expect((strategy as any).apiKey).toBe('configured-key');
    });
  });

  describe('validate', () => {
    it('returns the profile payload unchanged', async () => {
      const strategy = new SteamStrategy(
        createConfigService({
          'steamOpenId.callbackUrl':
            'http://localhost:3000/api/v1/auth/steam/callback',
          'steamOpenId.realm': 'http://localhost:3000/',
          'steamOpenId.apiKey': '',
        }),
      );

      const profile: SteamProfilePayload = {
        steamId: '76561198000000000',
        email: '76561198000000000@users.noreply.steamcommunity.com',
        firstName: 'Gamer',
        lastName: '',
      };

      await expect(strategy.validate(profile)).resolves.toEqual(profile);
    });
  });

  describe('SteamOpenIdPassportStrategy callback', () => {
    const returnURL = 'http://localhost:3000/api/v1/auth/steam/callback';
    const steamId = '76561198000000000';

    function baseQuery(overrides: Record<string, unknown> = {}) {
      return {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'id_res',
        'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
        'openid.claimed_id': `https://steamcommunity.com/openid/id/${steamId}`,
        'openid.identity': `https://steamcommunity.com/openid/id/${steamId}`,
        'openid.return_to': `${returnURL}?state=abc`,
        'openid.response_nonce': 'nonce',
        'openid.assoc_handle': 'handle',
        'openid.signed': 'signed',
        'openid.sig': 'sig',
        ...overrides,
      };
    }

    it('verifies OpenID and builds synthetic email profile', async () => {
      mockedAxios.post.mockResolvedValue({
        data: 'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n',
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          response: {
            players: [{ personaname: 'JaneDoe', realname: 'Jane Doe' }],
          },
        },
      });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: 'steam-key' },
        (user, done) => {
          done(null, user);
        },
      );

      const profile = await runCallback(strategy, baseQuery() as any);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://steamcommunity.com/openid/login',
        expect.stringContaining('openid.mode=check_authentication'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
        {
          params: { key: 'steam-key', steamids: steamId },
        },
      );
      expect(profile).toEqual({
        steamId,
        email: `${steamId}@users.noreply.steamcommunity.com`,
        firstName: 'Jane',
        lastName: 'Doe',
      } satisfies SteamProfilePayload);
    });

    it('falls back to personaname when realname is missing', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      mockedAxios.get.mockResolvedValue({
        data: {
          response: { players: [{ personaname: 'OnlyPersona' }] },
        },
      });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: 'steam-key' },
        (user, done) => done(null, user),
      );

      const profile = await runCallback(strategy, baseQuery() as any);

      expect(profile.firstName).toBe('OnlyPersona');
      expect(profile.lastName).toBe('');
    });

    it('falls back to personaname when realname is blank/whitespace', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      mockedAxios.get.mockResolvedValue({
        data: {
          response: {
            players: [{ personaname: 'PersonaFallback', realname: '   ' }],
          },
        },
      });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: 'steam-key' },
        (user, done) => done(null, user),
      );

      const profile = await runCallback(strategy, baseQuery() as any);

      expect(profile.firstName).toBe('PersonaFallback');
    });

    it('uses personaname when realname is present but parts[0] is empty', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      // Force the realname branch with a truthy trim, then empty parts via mock
      const realname = Object.create(null) as string;
      Object.defineProperty(realname, 'trim', {
        value: () => ({
          split: () => ({
            filter: () => [],
          }),
        }),
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          response: {
            players: [
              {
                personaname: 'FromPersona',
                realname,
              },
            ],
          },
        },
      });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: 'steam-key' },
        (user, done) => done(null, user),
      );

      const profile = await runCallback(
        strategy,
        baseQuery({
          'openid.return_to': returnURL,
        }) as any,
      );

      expect(profile.firstName).toBe('FromPersona');
    });

    it('defaults to Steam when realname parts and personaname are empty', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      const realname = Object.create(null) as string;
      Object.defineProperty(realname, 'trim', {
        value: () => ({
          split: () => ({
            filter: () => [],
          }),
        }),
      });
      mockedAxios.get.mockResolvedValue({
        data: {
          response: {
            players: [{ realname }],
          },
        },
      });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: 'steam-key' },
        (user, done) => done(null, user),
      );

      const profile = await runCallback(strategy, baseQuery() as any);

      expect(profile.firstName).toBe('Steam');
    });

    it('ignores Steam API enrichment failures', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      mockedAxios.get.mockRejectedValue(new Error('Steam API down'));

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: 'steam-key' },
        (user, done) => done(null, user),
      );

      const profile = await runCallback(strategy, baseQuery() as any);

      expect(profile.firstName).toBe('Steam');
      expect(profile.lastName).toBe('');
    });

    it('works without API key using Steam default name', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      const profile = await runCallback(strategy, baseQuery() as any);

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(profile).toEqual({
        steamId,
        email: `${steamId}@users.noreply.steamcommunity.com`,
        firstName: 'Steam',
        lastName: '',
      });
    });

    it('accepts return_to that starts with returnURL&', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(
        runCallback(
          strategy,
          baseQuery({
            'openid.return_to': `${returnURL}&extra=1`,
          }) as any,
        ),
      ).resolves.toMatchObject({ steamId });
    });

    it('skips non-openid and non-string query values during verification', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await runCallback(
        strategy,
        baseQuery({
          unrelated: 'skip-me',
          'openid.extra': undefined,
          'openid.arr': ['first', 'second'],
          'openid.num': 42 as unknown as string,
        }) as any,
      );

      const body = mockedAxios.post.mock.calls[0][1] as string;
      expect(body).not.toContain('unrelated');
      expect(body).toContain('openid.arr=first');
      expect(body).not.toContain('openid.num');
    });

    it('rejects when OpenID query fields are missing', async () => {
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(
        runCallback(strategy, {
          'openid.ns': 'http://specs.openid.net/auth/2.0',
        } as any),
      ).rejects.toThrow('Invalid Steam OpenID mode');

      await expect(
        runCallback(
          strategy,
          {
            'openid.mode': 'id_res',
          } as any,
        ),
      ).rejects.toThrow('Invalid Steam OpenID endpoint');

      await expect(
        runCallback(
          strategy,
          {
            'openid.mode': 'id_res',
            'openid.op_endpoint':
              'https://steamcommunity.com/openid/login',
          } as any,
        ),
      ).rejects.toThrow('Invalid Steam claimed_id');

      await expect(
        runCallback(
          strategy,
          {
            'openid.mode': 'id_res',
            'openid.op_endpoint':
              'https://steamcommunity.com/openid/login',
            'openid.claimed_id': `https://steamcommunity.com/openid/id/${steamId}`,
          } as any,
        ),
      ).rejects.toThrow('Steam OpenID return_to mismatch');
    });

    it('wraps non-Error callback failures', async () => {
      mockedAxios.post.mockRejectedValue('not-an-error');
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(runCallback(strategy, baseQuery() as any)).rejects.toThrow(
        'not-an-error',
      );
    });

    it('keeps Steam default name when player has no usable names', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      mockedAxios.get.mockResolvedValue({
        data: {
          response: { players: [{}] },
        },
      });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: 'steam-key' },
        (user, done) => done(null, user),
      );

      const profile = await runCallback(strategy, baseQuery() as any);

      expect(profile.firstName).toBe('Steam');
      expect(profile.lastName).toBe('');
    });

    it('rejects invalid verification response', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:false' });

      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(runCallback(strategy, baseQuery() as any)).rejects.toThrow(
        'Steam OpenID verification failed',
      );
    });

    it('rejects invalid OpenID mode', async () => {
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(
        runCallback(
          strategy,
          baseQuery({ 'openid.mode': 'cancel' }) as any,
        ),
      ).rejects.toThrow('Invalid Steam OpenID mode');
    });

    it('rejects invalid OpenID endpoint', async () => {
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(
        runCallback(
          strategy,
          baseQuery({
            'openid.op_endpoint': 'https://evil.example/openid',
          }) as any,
        ),
      ).rejects.toThrow('Invalid Steam OpenID endpoint');
    });

    it('rejects invalid Steam ID', async () => {
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(
        runCallback(
          strategy,
          baseQuery({
            'openid.claimed_id':
              'https://steamcommunity.com/openid/id/not-a-steamid',
          }) as any,
        ),
      ).rejects.toThrow('Invalid Steam ID');
    });

    it('rejects return_to mismatch', async () => {
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(
        runCallback(
          strategy,
          baseQuery({
            'openid.return_to': 'https://evil.example/callback',
          }) as any,
        ),
      ).rejects.toThrow('Steam OpenID return_to mismatch');
    });

    it('rejects invalid claimed_id', async () => {
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );

      await expect(
        runCallback(
          strategy,
          baseQuery({
            'openid.claimed_id': 'https://evil.com/openid/id/123',
          }) as any,
        ),
      ).rejects.toThrow('Invalid Steam claimed_id');
    });

    it('propagates verify callback errors', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (_user, done) => done(new Error('verify failed')),
      );

      await expect(runCallback(strategy, baseQuery() as any)).rejects.toThrow(
        'verify failed',
      );
    });

    it('fails when verify callback returns no user', async () => {
      mockedAxios.post.mockResolvedValue({ data: 'is_valid:true' });
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (_user, done) => done(null, false),
      );

      await expect(runCallback(strategy, baseQuery() as any)).rejects.toThrow(
        'fail',
      );
    });

    it('redirects to Steam OpenID on login start with state', () => {
      const strategy = new SteamOpenIdPassportStrategy(
        { returnURL, realm: 'http://localhost:3000/', apiKey: '' },
        (user, done) => done(null, user),
      );
      const redirect = jest.fn();
      (strategy as any).redirect = redirect;

      strategy.authenticate(
        { path: '/api/v1/auth/steam', query: {} } as any,
        { state: 'abc123' },
      );

      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://steamcommunity.com/openid/login?'),
      );
      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent(`${returnURL}?state=abc123`),
        ),
      );
    });

    it('redirects without state and supports returnURL that already has query', () => {
      const returnWithQuery = `${returnURL}?preset=1`;
      const strategy = new SteamOpenIdPassportStrategy(
        {
          returnURL: returnWithQuery,
          realm: 'http://localhost:3000/',
          apiKey: '',
        },
        (user, done) => done(null, user),
      );
      const redirect = jest.fn();
      (strategy as any).redirect = redirect;

      strategy.authenticate(
        { path: '/api/v1/auth/steam', query: {} } as any,
        {},
      );

      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent(returnWithQuery),
        ),
      );

      redirect.mockClear();
      strategy.authenticate(
        { path: '/api/v1/auth/steam', query: {} } as any,
        { state: 'xyz' },
      );
      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining(
          encodeURIComponent(`${returnWithQuery}&state=xyz`),
        ),
      );
    });
  });
});
