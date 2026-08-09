import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CacheService } from '@common/cache/cache.service';
import { OauthExchangeService } from './oauth-exchange.service';

jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomBytes: jest.fn(),
}));

const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;

describe('OauthExchangeService', () => {
  let service: OauthExchangeService;
  let cacheService: jest.Mocked<Pick<CacheService, 'get' | 'set' | 'del'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const fixedBuffer = Buffer.alloc(32, 0xab);
  const fixedCode = fixedBuffer.toString('base64url');
  const userId = 'user-123';

  beforeEach(() => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn(),
    };

    mockRandomBytes.mockReturnValue(
      fixedBuffer as unknown as ReturnType<typeof randomBytes>,
    );

    service = new OauthExchangeService(
      cacheService as unknown as CacheService,
      configService as unknown as ConfigService,
    );
  });

  describe('createExchangeCode', () => {
    it('uses google OAuth TTL when configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return 120;
        return undefined;
      });

      const code = await service.createExchangeCode(userId);

      expect(code).toBe(fixedCode);
      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        120,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'googleOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to facebook OAuth TTL when google TTL is missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return 90;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        90,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'facebookOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to twitter OAuth TTL when google and facebook TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return 75;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        75,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'twitterOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to github OAuth TTL when google, facebook, and twitter TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return 45;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        45,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'githubOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to figma OAuth TTL when google, facebook, twitter, and github TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return 30;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        30,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'figmaOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to linkedin OAuth TTL when google, facebook, twitter, github, and figma TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return 25;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        25,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'linkedinOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to slack OAuth TTL when google, facebook, twitter, github, figma, and linkedin TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return 20;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        20,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'slackOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to atlassian OAuth TTL when google, facebook, twitter, github, figma, linkedin, and slack TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return 15;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        15,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'atlassianOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to gitlab OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, and atlassian TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return 12;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        12,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'gitlabOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to bitbucket OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, and gitlab TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return 10;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        10,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'bitbucketOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to discord OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, and bitbucket TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return 8;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        8,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'discordOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to twitch OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, and discord TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return 6;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        6,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'twitchOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to steam OpenID TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, and reddit TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return 4;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        4,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'steamOpenId.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to reddit OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, and steam TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return 2;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        2,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'redditOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to Apple OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, steam, and reddit TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return 1;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        1,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'appleOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to Amazon OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, steam, reddit, apple TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'amazonOAuth.exchangeCodeTtlSeconds') return 7;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        7,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'amazonOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to Microsoft OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, steam, reddit, apple, and amazon TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'amazonOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'microsoftOAuth.exchangeCodeTtlSeconds') return 8;
        if (key === 'patreonOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'dropboxOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        8,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'microsoftOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to Patreon OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, steam, reddit, apple, amazon, and microsoft TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'amazonOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'microsoftOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'patreonOAuth.exchangeCodeTtlSeconds') return 9;
        if (key === 'dropboxOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        9,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'patreonOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to Dropbox OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, steam, reddit, apple, amazon, microsoft, and patreon TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'amazonOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'microsoftOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'patreonOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'dropboxOAuth.exchangeCodeTtlSeconds') return 10;
        if (key === 'coinbaseOAuth.exchangeCodeTtlSeconds') return undefined;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        10,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'dropboxOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to Coinbase OAuth TTL when google, facebook, twitter, github, figma, linkedin, slack, atlassian, gitlab, bitbucket, discord, twitch, steam, reddit, apple, amazon, microsoft, patreon, and dropbox TTL are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'facebookOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitterOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'githubOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'figmaOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'linkedinOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'slackOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'atlassianOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'gitlabOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'bitbucketOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'discordOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'twitchOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'steamOpenId.exchangeCodeTtlSeconds') return undefined;
        if (key === 'redditOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'appleOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'amazonOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'microsoftOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'patreonOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'dropboxOAuth.exchangeCodeTtlSeconds') return undefined;
        if (key === 'coinbaseOAuth.exchangeCodeTtlSeconds') return 10;
        return undefined;
      });

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        10,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'coinbaseOAuth.exchangeCodeTtlSeconds',
      );
    });

    it('falls back to 60 seconds when no TTL is configured', async () => {
      configService.get.mockReturnValue(undefined);

      await service.createExchangeCode(userId);

      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:oauth:exchange:${fixedCode}`,
        { userId },
        60,
      );
    });

    it('generates code via crypto.randomBytes(32)', async () => {
      configService.get.mockReturnValue(undefined);

      await service.createExchangeCode(userId);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
    });

    it('returns the generated exchange code', async () => {
      configService.get.mockReturnValue(undefined);

      const code = await service.createExchangeCode(userId);

      expect(code).toBe(fixedCode);
    });
  });

  describe('consumeExchangeCode', () => {
    it('returns userId and deletes the key on success', async () => {
      cacheService.get.mockResolvedValue({ userId });

      const result = await service.consumeExchangeCode('abc-code');

      expect(result).toBe(userId);
      expect(cacheService.get).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc-code',
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc-code',
      );
    });

    it('strips trailing hash fragment from the exchange code', async () => {
      cacheService.get.mockResolvedValue({ userId });

      const result = await service.consumeExchangeCode('abc-code#');

      expect(result).toBe(userId);
      expect(cacheService.get).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc-code',
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc-code',
      );
    });

    it('strips encoded %23 hash from the exchange code', async () => {
      cacheService.get.mockResolvedValue({ userId });

      const result = await service.consumeExchangeCode('abc-code%23');

      expect(result).toBe(userId);
      expect(cacheService.get).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc-code',
      );
    });

    it('keeps raw value when percent-encoding is malformed', async () => {
      cacheService.get.mockResolvedValue({ userId });

      const result = await service.consumeExchangeCode('abc%E0%A4');

      expect(result).toBe(userId);
      expect(cacheService.get).toHaveBeenCalledWith(
        'auth:oauth:exchange:abc%E0%A4',
      );
    });

    it('throws UnauthorizedException when code is missing from cache', async () => {
      cacheService.get.mockResolvedValue(null);

      await expect(service.consumeExchangeCode('missing')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.consumeExchangeCode('missing')).rejects.toThrow(
        'Invalid or expired exchange code',
      );
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when payload has no userId', async () => {
      cacheService.get.mockResolvedValue({ userId: '' });

      await expect(service.consumeExchangeCode('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.consumeExchangeCode('invalid')).rejects.toThrow(
        'Invalid or expired exchange code',
      );
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when payload is undefined userId', async () => {
      cacheService.get.mockResolvedValue({});

      await expect(service.consumeExchangeCode('empty')).rejects.toThrow(
        'Invalid or expired exchange code',
      );
    });
  });
});
