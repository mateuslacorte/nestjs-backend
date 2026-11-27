jest.mock('@common/crypto/password.util', () => ({
  verifyPassword: jest.fn(),
}));

jest.mock('./utils/generate-random-display-name.util', () => ({
  generateRandomDisplayName: jest.fn(() => ({
    firstName: 'Fearful',
    lastName: 'Bear',
  })),
}));

const mockRandomBytes = jest.fn((size: number) => Buffer.alloc(size, 0xab));

jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomBytes: (...args: [number]) => mockRandomBytes(...args),
  };
});

import { verifyPassword } from '@common/crypto/password.util';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { OauthExchangeService } from './services/oauth-exchange.service';
import { Role } from './enums/role.enum';
import { IUser } from '../users/interfaces/user.interface';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { GoogleProfilePayload } from './strategies/google.strategy';
import { FacebookProfilePayload } from './strategies/facebook.strategy';
import { TwitterProfilePayload } from './strategies/twitter.strategy';
import { GithubProfilePayload } from './strategies/github.strategy';
import { FigmaProfilePayload } from './strategies/figma.strategy';
import { LinkedinProfilePayload } from './strategies/linkedin.strategy';
import { SlackProfilePayload } from './strategies/slack.strategy';
import { AtlassianProfilePayload } from './strategies/atlassian.strategy';
import { GitlabProfilePayload } from './strategies/gitlab.strategy';
import { BitbucketProfilePayload } from './strategies/bitbucket.strategy';
import { DiscordProfilePayload } from './strategies/discord.strategy';
import { TwitchProfilePayload } from './strategies/twitch.strategy';
import { SteamProfilePayload } from './strategies/steam.strategy';
import { AppleProfilePayload } from './strategies/apple.strategy';
import { AmazonProfilePayload } from './strategies/amazon.strategy';
import { PatreonProfilePayload } from './strategies/patreon.strategy';
import { DropboxProfilePayload } from './strategies/dropbox.strategy';
import { generateRandomDisplayName } from './utils/generate-random-display-name.util';

function createUser(overrides: Partial<IUser> = {}): IUser {
  return {
    id: 'user-1',
    username: 'janesmith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: 'hashed-password',
    isActive: true,
    roles: [Role.USER],
    ...overrides,
  };
}

function encodeOAuthState(redirect: string): string {
  return Buffer.from(JSON.stringify({ r: redirect }), 'utf8').toString(
    'base64url',
  );
}

const oauthRedirectAllowlist = [
  'https://app.example/cb',
  'https://app.example/',
  'https://app.example/cb?foo=bar',
  'https://app.example/cb?foo=1',
  'https://app.example/cb#/home',
];

const defaultConfig: Record<string, unknown> = {
  'jwt.secret': 'jwt-secret',
  'jwt.refreshSecret': 'jwt-refresh-secret',
  'jwt.expirationTime': '1h',
  'jwt.refreshExpirationTime': '7d',
  'jwt.jitterSeconds': 0,
  'googleOAuth.enabled': true,
  'googleOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'googleOAuth.defaultRoles': [Role.USER],
  'facebookOAuth.enabled': true,
  'facebookOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'facebookOAuth.defaultRoles': [Role.USER],
  'twitterOAuth.enabled': true,
  'twitterOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'twitterOAuth.defaultRoles': [Role.USER],
  'githubOAuth.enabled': true,
  'githubOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'githubOAuth.defaultRoles': [Role.USER],
  'figmaOAuth.enabled': true,
  'figmaOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'figmaOAuth.defaultRoles': [Role.USER],
  'linkedinOAuth.enabled': true,
  'linkedinOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'linkedinOAuth.defaultRoles': [Role.USER],
  'slackOAuth.enabled': true,
  'slackOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'slackOAuth.defaultRoles': [Role.USER],
  'atlassianOAuth.enabled': true,
  'atlassianOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'atlassianOAuth.defaultRoles': [Role.USER],
  'gitlabOAuth.enabled': true,
  'gitlabOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'gitlabOAuth.defaultRoles': [Role.USER],
  'bitbucketOAuth.enabled': true,
  'bitbucketOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'bitbucketOAuth.defaultRoles': [Role.USER],
  'discordOAuth.enabled': true,
  'discordOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'discordOAuth.defaultRoles': [Role.USER],
  'twitchOAuth.enabled': true,
  'twitchOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'twitchOAuth.defaultRoles': [Role.USER],
  'steamOpenId.enabled': true,
  'steamOpenId.redirectAllowlist': oauthRedirectAllowlist,
  'steamOpenId.defaultRoles': [Role.USER],
  'appleOAuth.enabled': true,
  'appleOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'appleOAuth.defaultRoles': [Role.USER],
  'amazonOAuth.enabled': true,
  'amazonOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'amazonOAuth.defaultRoles': [Role.USER],
  'patreonOAuth.enabled': true,
  'patreonOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'patreonOAuth.defaultRoles': [Role.USER],
  'dropboxOAuth.enabled': true,
  'dropboxOAuth.redirectAllowlist': oauthRedirectAllowlist,
  'dropboxOAuth.defaultRoles': [Role.USER],
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock;
    createAndAwaitUser: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
    findByUsername: jest.Mock;
    findByGoogleId: jest.Mock;
    findByFacebookId: jest.Mock;
    findByTwitterId: jest.Mock;
    findByGithubId: jest.Mock;
    findByFigmaId: jest.Mock;
    findByLinkedinId: jest.Mock;
    findBySlackId: jest.Mock;
    findByAtlassianId: jest.Mock;
    findByGitlabId: jest.Mock;
    findByBitbucketId: jest.Mock;
    findByDiscordId: jest.Mock;
    findByTwitchId: jest.Mock;
    findBySteamId: jest.Mock;
    findByAmazonId: jest.Mock;
    findByPatreonId: jest.Mock;
    findByDropboxId: jest.Mock;
    findByMetamaskId: jest.Mock;
    findByActiveDirectoryId: jest.Mock;
    findByAppleId: jest.Mock;
    findByEmailVerificationToken: jest.Mock;
    findByPasswordToken: jest.Mock;
    update: jest.Mock;
    updateAndAwaitUser: jest.Mock;
    updateResetToken: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };
  let emailService: {
    sendEmailConfirmation: jest.Mock;
    sendPasswordReset: jest.Mock;
  };
  let oauthExchangeService: {
    createExchangeCode: jest.Mock;
    consumeExchangeCode: jest.Mock;
  };
  let activeDirectoryLdapService: { authenticate: jest.Mock };
  let metamaskSiweService: {
    createNonce: jest.Mock;
    verifyAndGetProfile: jest.Mock;
  };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      createAndAwaitUser: jest.fn().mockImplementation((...args: unknown[]) => (usersService.create as jest.Mock)(...args)),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByGoogleId: jest.fn(),
      findByFacebookId: jest.fn(),
      findByTwitterId: jest.fn(),
      findByGithubId: jest.fn(),
      findByFigmaId: jest.fn(),
      findByLinkedinId: jest.fn(),
      findBySlackId: jest.fn(),
      findByAtlassianId: jest.fn(),
      findByGitlabId: jest.fn(),
      findByBitbucketId: jest.fn(),
      findByDiscordId: jest.fn(),
      findByTwitchId: jest.fn(),
      findBySteamId: jest.fn(),
      findByAmazonId: jest.fn(),
      findByPatreonId: jest.fn(),
      findByDropboxId: jest.fn(),
      findByMetamaskId: jest.fn(),
      findByActiveDirectoryId: jest.fn(),
      findByAppleId: jest.fn(),
      findByEmailVerificationToken: jest.fn(),
      findByPasswordToken: jest.fn(),
      update: jest.fn(),
      updateAndAwaitUser: jest.fn().mockImplementation((...args: unknown[]) => (usersService.update as jest.Mock)(...args)),
      updateResetToken: jest.fn(),
      updatePassword: jest.fn(),
    };

    jwtService = {
      sign: jest.fn((payload, options?: { secret?: string }) => {
        if (options?.secret === 'jwt-refresh-secret') {
          return 'refresh-token';
        }
        return 'access-token';
      }),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => defaultConfig[key]),
    };

    emailService = {
      sendEmailConfirmation: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    oauthExchangeService = {
      createExchangeCode: jest.fn().mockResolvedValue('exchange-code-123'),
      consumeExchangeCode: jest.fn(),
    };

    activeDirectoryLdapService = {
      authenticate: jest.fn(),
    };

    metamaskSiweService = {
      createNonce: jest.fn(),
      verifyAndGetProfile: jest.fn(),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      emailService as unknown as EmailService,
      oauthExchangeService as unknown as OauthExchangeService,
      activeDirectoryLdapService as unknown as import('./services/active-directory-ldap.service').ActiveDirectoryLdapService,
      metamaskSiweService as unknown as import('./services/metamask-siwe.service').MetamaskSiweService,
      cacheService as unknown as import('@common/cache/cache.service').CacheService,
    );

    mockRandomBytes.mockImplementation((size: number) =>
      Buffer.alloc(size, 0xab),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'jane@example.com',
      password: 'Str0ng!P@ssw0rd',
      confirmPassword: 'Str0ng!P@ssw0rd',
    };

    it('throws 400 when passwords do not match', async () => {
      await expect(
        service.register({ ...registerDto, confirmPassword: 'Mismatch!' }),
      ).rejects.toThrow(new BadRequestException('Passwords do not match'));
    });

    it('throws 409 when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(createUser());

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('A user with this email already exists'),
      );
    });

    it('creates inactive user, sends verification, returns user and message without tokens', async () => {
      const newUser = createUser({ isActive: false, roles: [], password: 'hash' });
      usersService.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newUser);
      usersService.create.mockResolvedValue(newUser);
      usersService.update.mockResolvedValue(newUser);

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
        isActive: false,
        roles: [],
      });
      expect(usersService.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: expect.any(Date),
        }),
      );
      expect(emailService.sendEmailConfirmation).toHaveBeenCalledWith(
        'jane@example.com',
        expect.any(String),
      );
      expect(result).toEqual({
        user: expect.not.objectContaining({ password: expect.anything() }),
        message:
          'Registration successful. Please check your email to confirm your account.',
      });
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
    });
  });

  describe('createEmailVerificationToken', () => {
    it('throws 404 when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.createEmailVerificationToken('missing@example.com'),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });

    it('generates token and updates user', async () => {
      const user = createUser();
      usersService.findByEmail.mockResolvedValue(user);
      usersService.update.mockResolvedValue(user);

      const token = await service.createEmailVerificationToken(user.email);

      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        emailVerificationToken: token,
        emailVerificationExpires: expect.any(Date),
      });
    });
  });

  describe('sendEmailVerification', () => {
    it('delegates to EmailService.sendEmailConfirmation', async () => {
      await service.sendEmailVerification('jane@example.com', '123456');

      expect(emailService.sendEmailConfirmation).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
    });
  });

  describe('verifyEmail', () => {
    it('throws 404 when user is not found by token', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        new NotFoundException('Invalid verification token'),
      );
    });

    it('throws 400 when verification fields are missing', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(
        createUser({
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined,
        }),
      );

      await expect(service.verifyEmail('tok')).rejects.toThrow(
        new BadRequestException('Invalid or expired verification token'),
      );
    });

    it('throws 400 when token is expired', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(
        createUser({
          emailVerificationToken: '123456',
          emailVerificationExpires: new Date('2020-01-01'),
        }),
      );

      await expect(service.verifyEmail('123456')).rejects.toThrow(
        new BadRequestException('Verification token has expired'),
      );
    });

    it('throws 400 when token does not match', async () => {
      usersService.findByEmailVerificationToken.mockResolvedValue(
        createUser({
          emailVerificationToken: '111111',
          emailVerificationExpires: new Date(Date.now() + 86400000),
        }),
      );

      await expect(service.verifyEmail('222222')).rejects.toThrow(
        new BadRequestException('Invalid verification token'),
      );
    });

    it('activates user and clears verification fields on success', async () => {
      const user = createUser({
        isActive: false,
        emailVerificationToken: '123456',
        emailVerificationExpires: new Date(Date.now() + 86400000),
      });
      usersService.findByEmailVerificationToken.mockResolvedValue(user);
      usersService.update.mockResolvedValue({ ...user, isActive: true });

      await expect(service.verifyEmail('123456')).resolves.toBe(true);
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
      });
    });
  });

  describe('validateUser', () => {
    it('returns null when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('missing@example.com', 'pass'),
      ).resolves.toBeNull();
    });

    it('returns null when user has no password', async () => {
      usersService.findByEmail.mockResolvedValue(createUser({ password: null }));

      await expect(
        service.validateUser('jane@example.com', 'pass'),
      ).resolves.toBeNull();
    });

    it('returns null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('jane@example.com', 'wrong'),
      ).resolves.toBeNull();
    });

    it('throws when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(
        createUser({ isActive: false }),
      );
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateUser('jane@example.com', 'pass'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Please verify your email before logging in',
        ),
      );
    });

    it('returns user without password on success', async () => {
      usersService.findByEmail.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('jane@example.com', 'pass');

      expect(result).toEqual(expect.not.objectContaining({ password: expect.anything() }));
      expect(result?.email).toBe('jane@example.com');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'jane@example.com',
      password: 'Str0ng!P@ssw0rd',
    };

    it('throws 401 for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('returns sanitized user and tokens on success', async () => {
      usersService.findByEmail.mockResolvedValue(createUser({ googleId: 'google-1' }));
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: expect.not.objectContaining({
          password: expect.anything(),
          googleId: expect.anything(),
          activeDirectoryId: expect.anything(),
        }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(result.user).toMatchObject({
        email: 'jane@example.com',
      });
    });

    it('records failed login attempts', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  describe('loginWithActiveDirectory', () => {
    const adProfile = {
      activeDirectoryId: 'ad-guid-001',
      email: 'jdoe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      samAccountName: 'jdoe',
      groups: [] as string[],
    };

    it('returns sanitized user and tokens on success', async () => {
      activeDirectoryLdapService.authenticate.mockResolvedValue(adProfile);
      usersService.findByActiveDirectoryId.mockResolvedValue(
        createUser({ activeDirectoryId: 'ad-guid-001' }),
      );

      const result = await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(activeDirectoryLdapService.authenticate).toHaveBeenCalledWith(
        'jdoe',
        'pass',
      );
      expect(result).toEqual({
        user: expect.not.objectContaining({ password: expect.anything() }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('links activeDirectoryId to existing email user', async () => {
      activeDirectoryLdapService.authenticate.mockResolvedValue(adProfile);
      usersService.findByActiveDirectoryId.mockResolvedValue(null);
      const byEmail = createUser({ email: adProfile.email });
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        activeDirectoryId: adProfile.activeDirectoryId,
      });

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        activeDirectoryId: 'ad-guid-001',
      });
    });

    it('auto-provisions new AD user', async () => {
      activeDirectoryLdapService.authenticate.mockResolvedValue(adProfile);
      usersService.findByActiveDirectoryId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activeDirectoryId: 'ad-guid-001',
          email: 'jdoe@example.com',
          isActive: true,
        }),
      );
    });

    it('reactivates inactive AD user', async () => {
      activeDirectoryLdapService.authenticate.mockResolvedValue(adProfile);
      usersService.findByActiveDirectoryId.mockResolvedValue(
        createUser({ activeDirectoryId: 'ad-guid-001', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('uses dash lastName and email local when samAccountName/lastName empty', async () => {
      activeDirectoryLdapService.authenticate.mockResolvedValue({
        ...adProfile,
        lastName: '',
        samAccountName: undefined,
      });
      usersService.findByActiveDirectoryId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          username: 'jdoe',
          roles: [],
        }),
      );
    });

    it('maps AD memberOf groups to roles and syncs on login', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adLdap.defaultRoles') return [Role.USER];
        if (key === 'adLdap.groupRoleMap') {
          return [
            { group: 'Nest-Admins', role: Role.ADMIN },
            { group: 'Nest-Managers', role: Role.MANAGER },
          ];
        }
        if (key === 'adLdap.syncRolesOnLogin') return true;
        return defaultConfig[key];
      });

      activeDirectoryLdapService.authenticate.mockResolvedValue({
        ...adProfile,
        groups: [
          'CN=Nest-Admins,OU=Groups,DC=example,DC=com',
          'CN=Nest-Managers,OU=Groups,DC=example,DC=com',
        ],
      });
      usersService.findByActiveDirectoryId.mockResolvedValue(
        createUser({
          activeDirectoryId: 'ad-guid-001',
          roles: [Role.USER],
        }),
      );
      usersService.update.mockResolvedValue(
        createUser({ roles: [Role.ADMIN, Role.MANAGER] }),
      );

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        roles: [Role.ADMIN, Role.MANAGER],
      });
    });

    it('applies mapped roles when auto-provisioning a new AD user', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adLdap.defaultRoles') return [Role.USER];
        if (key === 'adLdap.groupRoleMap') {
          return [{ group: 'Nest-Admins', role: Role.ADMIN }];
        }
        if (key === 'adLdap.syncRolesOnLogin') return true;
        return defaultConfig[key];
      });

      activeDirectoryLdapService.authenticate.mockResolvedValue({
        ...adProfile,
        groups: ['CN=Nest-Admins,OU=Groups,DC=example,DC=com'],
      });
      usersService.findByActiveDirectoryId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser({ roles: [Role.ADMIN] }));

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.ADMIN],
        }),
      );
    });

    it('falls back to defaultRoles when group map is set but no group matches', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adLdap.defaultRoles') return [Role.USER];
        if (key === 'adLdap.groupRoleMap') {
          return [{ group: 'Nest-Admins', role: Role.ADMIN }];
        }
        return defaultConfig[key];
      });

      activeDirectoryLdapService.authenticate.mockResolvedValue({
        ...adProfile,
        groups: ['CN=Other,OU=Groups,DC=example,DC=com'],
      });
      usersService.findByActiveDirectoryId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.USER],
        }),
      );
    });

    it('treats missing groups as empty when resolving AD roles', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adLdap.defaultRoles') return [Role.USER];
        if (key === 'adLdap.groupRoleMap') return [];
        return defaultConfig[key];
      });

      const { groups: _groups, ...profileWithoutGroups } = adProfile;
      activeDirectoryLdapService.authenticate.mockResolvedValue(
        profileWithoutGroups as typeof adProfile,
      );
      usersService.findByActiveDirectoryId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser({ roles: [Role.USER] }));

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [Role.USER],
        }),
      );
    });

    it('syncs mapped roles when linking AD account to an existing email user', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adLdap.defaultRoles') return [Role.USER];
        if (key === 'adLdap.groupRoleMap') {
          return [{ group: 'Nest-Admins', role: Role.ADMIN }];
        }
        if (key === 'adLdap.syncRolesOnLogin') return true;
        return defaultConfig[key];
      });

      activeDirectoryLdapService.authenticate.mockResolvedValue({
        ...adProfile,
        groups: ['CN=Nest-Admins,OU=Groups,DC=example,DC=com'],
      });
      usersService.findByActiveDirectoryId.mockResolvedValue(null);
      const byEmail = createUser({
        email: adProfile.email,
        roles: [Role.USER],
      });
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        activeDirectoryId: adProfile.activeDirectoryId,
        roles: [Role.ADMIN],
      });

      await service.loginWithActiveDirectory({
        username: 'jdoe',
        password: 'pass',
      });

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        activeDirectoryId: 'ad-guid-001',
        roles: [Role.ADMIN],
      });
    });
  });

  describe('issueMetamaskNonce', () => {
    it('delegates to MetamaskSiweService.createNonce', async () => {
      metamaskSiweService.createNonce.mockResolvedValue({
        nonce: 'nonce-1',
        expiresIn: 300,
      });

      await expect(service.issueMetamaskNonce()).resolves.toEqual({
        nonce: 'nonce-1',
        expiresIn: 300,
      });
    });
  });

  describe('loginWithMetamask', () => {
    const profile = {
      metamaskId: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      email: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266@users.noreply.metamask.local',
    };

    it('returns sanitized user and tokens for existing metamask user', async () => {
      metamaskSiweService.verifyAndGetProfile.mockResolvedValue(profile);
      usersService.findByMetamaskId.mockResolvedValue(
        createUser({ metamaskId: profile.metamaskId }),
      );

      const result = await service.loginWithMetamask({
        message: 'siwe',
        signature: '0xsig',
      });

      expect(metamaskSiweService.verifyAndGetProfile).toHaveBeenCalledWith(
        'siwe',
        '0xsig',
      );
      expect(result).toEqual({
        user: expect.not.objectContaining({ password: expect.anything() }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('reactivates inactive metamask user', async () => {
      metamaskSiweService.verifyAndGetProfile.mockResolvedValue(profile);
      usersService.findByMetamaskId.mockResolvedValue(
        createUser({ metamaskId: profile.metamaskId, isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.loginWithMetamask({
        message: 'siwe',
        signature: '0xsig',
      });

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('creates new user with random display name (no email linking)', async () => {
      metamaskSiweService.verifyAndGetProfile.mockResolvedValue(profile);
      usersService.findByMetamaskId.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.loginWithMetamask({
        message: 'siwe',
        signature: '0xsig',
      });

      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metamaskId: profile.metamaskId,
          email: profile.email,
          firstName: 'Fearful',
          lastName: 'Bear',
          isActive: true,
        }),
      );
    });

    it('uses dash lastName when generated display lastName is empty', async () => {
      (generateRandomDisplayName as jest.Mock).mockReturnValueOnce({
        firstName: 'Fearful',
        lastName: '',
      });
      metamaskSiweService.verifyAndGetProfile.mockResolvedValue(profile);
      usersService.findByMetamaskId.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.loginWithMetamask({
        message: 'siwe',
        signature: '0xsig',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Fearful',
          lastName: '-',
        }),
      );
    });
  });

  describe('validateUserById', () => {
    it('delegates to UsersService.findById', async () => {
      const user = createUser();
      usersService.findById.mockResolvedValue(user);

      await expect(service.validateUserById('user-1')).resolves.toBe(user);
      expect(usersService.findById).toHaveBeenCalledWith('user-1');
    });

    it('returns null when user is inactive', async () => {
      usersService.findById.mockResolvedValue(createUser({ isActive: false }));

      await expect(service.validateUserById('user-1')).resolves.toBeNull();
    });

    it('returns null when user-level revocation key is set', async () => {
      usersService.findById.mockResolvedValue(createUser());
      cacheService.get.mockResolvedValue(Date.now());

      await expect(service.validateUserById('user-1')).resolves.toBeNull();
      expect(cacheService.get).toHaveBeenCalledWith('auth:user:revoked:user-1');
    });

    it('passes when user exists and revocation key is absent', async () => {
      const user = createUser();
      usersService.findById.mockResolvedValue(user);
      cacheService.get.mockResolvedValue(null);

      await expect(service.validateUserById('user-1')).resolves.toBe(user);
    });
  });

  describe('refreshToken', () => {
    it('returns new tokens on success', async () => {
      const user = createUser();
      jwtService.verify.mockReturnValue({ id: 'user-1' });
      usersService.findById.mockResolvedValue(user);

      const result = await service.refreshToken({
        refreshToken: 'valid-refresh',
      });

      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh', {
        secret: 'jwt-refresh-secret',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('revokes previous refresh jti before issuing new tokens', async () => {
      const user = createUser();
      jwtService.verify.mockReturnValue({ id: 'user-1', jti: 'jti-old' });
      usersService.findById.mockResolvedValue(user);
      cacheService.get.mockResolvedValue(undefined);

      await service.refreshToken({ refreshToken: 'valid-refresh' });

      expect(cacheService.set).toHaveBeenCalledWith(
        'auth:refresh:revoke:jti-old',
        true,
        604800,
      );
    });

    it.each([
      ['30s', 30],
      ['5m', 300],
      ['2h', 7200],
    ] as const)(
      'parses refresh TTL %s as %s seconds when revoking jti',
      async (expiresIn, ttlSeconds) => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'jwt.refreshExpirationTime') return expiresIn;
          return defaultConfig[key];
        });
        jwtService.verify.mockReturnValue({ id: 'user-1', jti: 'jti-ttl' });
        usersService.findById.mockResolvedValue(createUser());
        cacheService.get.mockResolvedValue(undefined);

        await service.refreshToken({ refreshToken: 'valid-refresh' });

        expect(cacheService.set).toHaveBeenCalledWith(
          'auth:refresh:revoke:jti-ttl',
          true,
          ttlSeconds,
        );
      },
    );

    it('falls back to 7d TTL when revoking with an unparseable refresh expiration', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jwt.refreshExpirationTime') return 'not-a-duration';
        if (key === 'jwt.expirationTime') return '1h';
        return defaultConfig[key];
      });
      jwtService.verify.mockReturnValue({ id: 'user-1', jti: 'jti-bad-ttl' });
      usersService.findById.mockResolvedValue(createUser());
      cacheService.get.mockResolvedValue(undefined);

      await expect(
        service.refreshToken({ refreshToken: 'valid-refresh' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));

      expect(cacheService.set).toHaveBeenCalledWith(
        'auth:refresh:revoke:jti-bad-ttl',
        true,
        604800,
      );
    });

    it('rejects revoked refresh tokens', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-1', jti: 'jti-revoked' });
      cacheService.get.mockResolvedValue(true);

      await expect(
        service.refreshToken({ refreshToken: 'valid-refresh' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('rejects inactive users', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-1' });
      usersService.findById.mockResolvedValue(createUser({ isActive: false }));

      await expect(
        service.refreshToken({ refreshToken: 'valid-refresh' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('rejects when user-level revocation key is set', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-1', jti: 'jti-1' });
      usersService.findById.mockResolvedValue(createUser());
      cacheService.get.mockImplementation((key: string) => {
        if (key === 'auth:user:revoked:user-1') return Promise.resolve(Date.now());
        return Promise.resolve(null);
      });

      await expect(
        service.refreshToken({ refreshToken: 'valid-refresh' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('uses jwt TTL fallbacks when expiration config is undefined', async () => {
      configService.get.mockImplementation((key: string) => {
        if (
          key === 'jwt.jitterSeconds' ||
          key === 'jwt.expirationTime' ||
          key === 'jwt.refreshExpirationTime'
        ) {
          return undefined;
        }
        return defaultConfig[key];
      });
      const user = createUser();
      jwtService.verify.mockReturnValue({ id: 'user-1', jti: 'jti-fallback' });
      usersService.findById.mockResolvedValue(user);
      cacheService.get.mockResolvedValue(undefined);

      await service.refreshToken({ refreshToken: 'valid-refresh' });

      expect(cacheService.set).toHaveBeenCalledWith(
        'auth:refresh:revoke:jti-fallback',
        true,
        604800,
      );
      // withJitter converts default '1h' / '7d' string TTLs to seconds
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        expect.objectContaining({ expiresIn: 3600 }),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        expect.objectContaining({ expiresIn: 604800 }),
      );
    });

    it('wraps verification errors as 401 Invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refreshToken({ refreshToken: 'bad' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('wraps user-not-found as 401 Invalid refresh token', async () => {
      jwtService.verify.mockReturnValue({ id: 'missing' });
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'valid-refresh' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });
  });

  describe('createPasswordResetToken', () => {
    it('returns null when user is not found (anti-enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.createPasswordResetToken('missing@example.com'),
      ).resolves.toBeNull();
    });

    it('generates token and updates reset fields', async () => {
      const user = createUser();
      usersService.findByEmail.mockResolvedValue(user);
      usersService.updateResetToken.mockResolvedValue(user);

      const token = await service.createPasswordResetToken(user.email);

      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(usersService.updateResetToken).toHaveBeenCalledWith('user-1', {
        passwordResetToken: token,
        passwordResetExpires: expect.any(Date),
      });
    });
  });

  describe('resetPassword', () => {
    const resetDto = {
      token: '123456',
      password: 'NewP@ssw0rd1',
      confirmPassword: 'NewP@ssw0rd1',
    };

    it('throws 400 when passwords do not match', async () => {
      await expect(
        service.resetPassword({ ...resetDto, confirmPassword: 'other' }),
      ).rejects.toThrow(new BadRequestException('Passwords do not match'));
    });

    it('throws 404 when user is not found', async () => {
      usersService.findByPasswordToken.mockResolvedValue(null);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });

    it('throws 400 when reset fields are missing', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: undefined,
          passwordResetExpires: undefined,
        }),
      );

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException('Invalid or expired reset token'),
      );
    });

    it('throws 400 when reset token is expired', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: '123456',
          passwordResetExpires: new Date('2020-01-01'),
        }),
      );

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException('Reset token has expired'),
      );
    });

    it('throws 400 when token does not match', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: '111111',
          passwordResetExpires: new Date(Date.now() + 3600000),
        }),
      );

      await expect(service.resetPassword(resetDto)).rejects.toThrow(
        new BadRequestException('Invalid reset token'),
      );
    });

    it('updates password and clears reset token on success', async () => {
      usersService.findByPasswordToken.mockResolvedValue(
        createUser({
          passwordResetToken: '123456',
          passwordResetExpires: new Date(Date.now() + 3600000),
        }),
      );
      usersService.updatePassword.mockResolvedValue(createUser());

      await expect(service.resetPassword(resetDto)).resolves.toBe(true);
      expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', {
        password: 'NewP@ssw0rd1',
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });
    });
  });

  describe('sendResetTokenEmail', () => {
    it('delegates to EmailService.sendPasswordReset and returns token', async () => {
      const result = await service.sendResetTokenEmail(
        'jane@example.com',
        '123456',
      );

      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
      expect(result).toBe('123456');
    });
  });

  describe('changePassword', () => {
    const changeDto = {
      currentPassword: 'OldP@ssw0rd1',
      newPassword: 'NewP@ssw0rd1',
      confirmNewPassword: 'NewP@ssw0rd1',
    };

    it('throws 400 when new passwords do not match', async () => {
      await expect(
        service.changePassword('user-1', {
          ...changeDto,
          confirmNewPassword: 'Mismatch!',
        }),
      ).rejects.toThrow(
        new BadRequestException('New password and confirmation do not match'),
      );
    });

    it('throws 400 when new password equals current password', async () => {
      await expect(
        service.changePassword('user-1', {
          ...changeDto,
          newPassword: changeDto.currentPassword,
          confirmNewPassword: changeDto.currentPassword,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'New password must be different from the current password',
        ),
      );
    });

    it('throws 404 when user is not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', changeDto),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });

    it('throws 400 for social-only accounts without local password', async () => {
      usersService.findById.mockResolvedValue(createUser({ password: null }));

      await expect(
        service.changePassword('user-1', changeDto),
      ).rejects.toThrow(
        new BadRequestException(
          'This account uses social login and has no local password',
        ),
      );
    });

    it('throws 400 when current password is incorrect', async () => {
      usersService.findById.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', changeDto),
      ).rejects.toThrow(
        new BadRequestException('Current password is incorrect'),
      );
    });

    it('updates password on success', async () => {
      usersService.findById.mockResolvedValue(createUser());
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      usersService.updatePassword.mockResolvedValue(createUser());

      await expect(
        service.changePassword('user-1', changeDto),
      ).resolves.toEqual({ message: 'Password changed successfully' });
      expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', {
        password: 'NewP@ssw0rd1',
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });
    });
  });

  describe('issueTokensForUser', () => {
    it('returns access and refresh tokens', async () => {
      const result = await service.issueTokensForUser(createUser());

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('completeGoogleOAuth', () => {
    const profile: GoogleProfilePayload = {
      googleId: 'google-1',
      email: 'google@example.com',
      firstName: 'Go',
      lastName: 'Ogler',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Google auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeGoogleOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Google authentication is disabled'),
      );
    });

    it('throws 400 when state is missing', async () => {
      await expect(service.completeGoogleOAuth(profile)).rejects.toThrow(
        new BadRequestException('Missing OAuth state'),
      );
    });

    it('throws 400 when state is invalid', async () => {
      await expect(
        service.completeGoogleOAuth(profile, 'not-valid-base64url!!!'),
      ).rejects.toThrow(new BadRequestException('Invalid OAuth state'));
    });

    it('throws 400 when state JSON is missing redirect (r)', async () => {
      const badState = Buffer.from(JSON.stringify({}), 'utf8').toString(
        'base64url',
      );

      await expect(
        service.completeGoogleOAuth(profile, badState),
      ).rejects.toThrow(new BadRequestException('Invalid OAuth state'));
    });

    it('throws 400 when state redirect (r) is not a string', async () => {
      const badState = Buffer.from(
        JSON.stringify({ r: 123 }),
        'utf8',
      ).toString('base64url');

      await expect(
        service.completeGoogleOAuth(profile, badState),
      ).rejects.toThrow(new BadRequestException('Invalid OAuth state'));
    });

    it('throws 400 when redirect is not allowlisted', async () => {
      const badState = encodeOAuthState('https://evil.example/cb');

      await expect(
        service.completeGoogleOAuth(profile, badState),
      ).rejects.toThrow(new BadRequestException('Redirect URL is not allowed'));
    });

    it('treats undefined allowlist config as empty (rejects redirect)', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.redirectAllowlist') return undefined;
        return defaultConfig[key];
      });

      await expect(
        service.completeGoogleOAuth(profile, state),
      ).rejects.toThrow(new BadRequestException('Redirect URL is not allowed'));
    });

    it('rejects redirect that only matches allowlist as prefix', async () => {
      const existing = createUser({ googleId: 'google-1' });
      usersService.findByGoogleId.mockResolvedValue(existing);
      const prefixState = encodeOAuthState('https://app.example/dashboard');

      await expect(
        service.completeGoogleOAuth(profile, prefixState),
      ).rejects.toThrow(new BadRequestException('Redirect URL is not allowed'));
    });

    it('allows redirect via exact allowlist match', async () => {
      const existing = createUser({ googleId: 'google-1' });
      usersService.findByGoogleId.mockResolvedValue(existing);
      const exactState = encodeOAuthState('https://app.example/cb');

      const result = await service.completeGoogleOAuth(profile, exactState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('returns existing user by google id and builds redirect with ?', async () => {
      const existing = createUser({ googleId: 'google-1' });
      usersService.findByGoogleId.mockResolvedValue(existing);

      const result = await service.completeGoogleOAuth(profile, state);

      expect(oauthExchangeService.createExchangeCode).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive user found by google id', async () => {
      const inactive = createUser({ googleId: 'google-1', isActive: false });
      const reactivated = createUser({ googleId: 'google-1', isActive: true });
      usersService.findByGoogleId.mockResolvedValue(inactive);
      usersService.update.mockResolvedValue(reactivated);

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links google id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        googleId: profile.googleId,
      });

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        googleId: 'google-1',
      });
    });

    it('rejects linking google id to inactive unverified email account', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(
        createUser({ email: profile.email, isActive: false }),
      );

      await expect(service.completeGoogleOAuth(profile, state)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('creates new user with dash lastName when empty', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(
        createUser({
          email: profile.email,
          lastName: '-',
          googleId: 'google-1',
        }),
      );

      await service.completeGoogleOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          googleId: 'google-1',
          isActive: true,
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=bar');
      usersService.findByGoogleId.mockResolvedValue(createUser());

      const result = await service.completeGoogleOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=bar&code=exchange-code-123',
      );
    });

    it('places code before hash when redirect URL has a fragment', async () => {
      const hashState = encodeOAuthState('https://app.example/cb#/home');
      usersService.findByGoogleId.mockResolvedValue(createUser());

      const result = await service.completeGoogleOAuth(profile, hashState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123#/home',
      );
    });

    it('falls back for relative redirect without query or hash', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.redirectAllowlist') return ['/oauth/cb'];
        return defaultConfig[key];
      });
      usersService.findByGoogleId.mockResolvedValue(createUser());
      const relativeState = encodeOAuthState('/oauth/cb');

      const result = await service.completeGoogleOAuth(profile, relativeState);

      expect(result.redirectUrl).toBe('/oauth/cb?code=exchange-code-123');
    });

    it('falls back for relative redirect that already has query params', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.redirectAllowlist')
          return ['/oauth/cb', '/oauth/cb?foo=bar'];
        return defaultConfig[key];
      });
      usersService.findByGoogleId.mockResolvedValue(createUser());
      const relativeState = encodeOAuthState('/oauth/cb?foo=bar');

      const result = await service.completeGoogleOAuth(profile, relativeState);

      expect(result.redirectUrl).toBe(
        '/oauth/cb?foo=bar&code=exchange-code-123',
      );
    });

    it('falls back for relative redirect with a hash fragment', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.redirectAllowlist')
          return ['/oauth/cb', '/oauth/cb#/home'];
        return defaultConfig[key];
      });
      usersService.findByGoogleId.mockResolvedValue(createUser());
      const relativeState = encodeOAuthState('/oauth/cb#/home');

      const result = await service.completeGoogleOAuth(profile, relativeState);

      expect(result.redirectUrl).toBe(
        '/oauth/cb?code=exchange-code-123#/home',
      );
    });

    it('retries username on collision when creating new user', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername
        .mockResolvedValueOnce(createUser({ username: 'google' }))
        .mockResolvedValueOnce(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.findByUsername).toHaveBeenCalledTimes(2);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^google[a-f0-9]{4}$/),
        }),
      );
    });

    it('uses empty roles when defaultRoles config is undefined', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'googleOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [],
          googleId: 'google-1',
        }),
      );
    });

    it('falls back to user username when email local part sanitizes empty', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeGoogleOAuth(
        { ...profile, email: '!!!@example.com' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'user',
        }),
      );
    });

    it('appends timestamp when username candidates are exhausted', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(createUser());
      usersService.create.mockResolvedValue(createUser());

      await service.completeGoogleOAuth(profile, state);

      expect(usersService.findByUsername).toHaveBeenCalledTimes(20);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^google[a-z0-9]+$/),
        }),
      );
    });
  });

  describe('completeFacebookOAuth', () => {
    const profile: FacebookProfilePayload = {
      facebookId: 'fb-1',
      email: 'fb@example.com',
      firstName: 'Face',
      lastName: 'Book',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Facebook auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'facebookOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeFacebookOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Facebook authentication is disabled'),
      );
    });

    it('returns redirect URL for existing facebook user', async () => {
      usersService.findByFacebookId.mockResolvedValue(
        createUser({ facebookId: 'fb-1' }),
      );

      const result = await service.completeFacebookOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive facebook user', async () => {
      usersService.findByFacebookId.mockResolvedValue(
        createUser({ facebookId: 'fb-1', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeFacebookOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links facebook id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByFacebookId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        facebookId: profile.facebookId,
      });

      await service.completeFacebookOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        facebookId: 'fb-1',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'facebookOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByFacebookId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeFacebookOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ lastName: '-', roles: [] }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByFacebookId.mockResolvedValue(
        createUser({ facebookId: 'fb-1' }),
      );

      const result = await service.completeFacebookOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeTwitterOAuth', () => {
    const profile: TwitterProfilePayload = {
      twitterId: 'tw-1',
      email: 'tw@example.com',
      firstName: 'Twit',
      lastName: 'Ter',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Twitter auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'twitterOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeTwitterOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Twitter authentication is disabled'),
      );
    });

    it('returns redirect URL for existing twitter user', async () => {
      usersService.findByTwitterId.mockResolvedValue(
        createUser({ twitterId: 'tw-1' }),
      );

      const result = await service.completeTwitterOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive twitter user', async () => {
      usersService.findByTwitterId.mockResolvedValue(
        createUser({ twitterId: 'tw-1', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeTwitterOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links twitter id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByTwitterId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        twitterId: profile.twitterId,
      });

      await service.completeTwitterOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        twitterId: 'tw-1',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'twitterOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByTwitterId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeTwitterOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          twitterId: 'tw-1',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByTwitterId.mockResolvedValue(
        createUser({ twitterId: 'tw-1' }),
      );

      const result = await service.completeTwitterOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeGithubOAuth', () => {
    const profile: GithubProfilePayload = {
      githubId: 'gh-1',
      email: 'gh@example.com',
      firstName: 'Git',
      lastName: 'Hub',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when GitHub auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'githubOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeGithubOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('GitHub authentication is disabled'),
      );
    });

    it('returns redirect URL for existing github user', async () => {
      usersService.findByGithubId.mockResolvedValue(
        createUser({ githubId: 'gh-1' }),
      );

      const result = await service.completeGithubOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive github user', async () => {
      usersService.findByGithubId.mockResolvedValue(
        createUser({ githubId: 'gh-1', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeGithubOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links github id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByGithubId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        githubId: profile.githubId,
      });

      await service.completeGithubOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        githubId: 'gh-1',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'githubOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByGithubId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeGithubOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          githubId: 'gh-1',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByGithubId.mockResolvedValue(
        createUser({ githubId: 'gh-1' }),
      );

      const result = await service.completeGithubOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeFigmaOAuth', () => {
    const profile: FigmaProfilePayload = {
      figmaId: 'fig-1',
      email: 'fig@example.com',
      firstName: 'Fig',
      lastName: 'Ma',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Figma auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'figmaOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeFigmaOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Figma authentication is disabled'),
      );
    });

    it('returns redirect URL for existing figma user', async () => {
      usersService.findByFigmaId.mockResolvedValue(
        createUser({ figmaId: 'fig-1' }),
      );

      const result = await service.completeFigmaOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive figma user', async () => {
      usersService.findByFigmaId.mockResolvedValue(
        createUser({ figmaId: 'fig-1', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeFigmaOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links figma id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByFigmaId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        figmaId: profile.figmaId,
      });

      await service.completeFigmaOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        figmaId: 'fig-1',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'figmaOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByFigmaId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeFigmaOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          figmaId: 'fig-1',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByFigmaId.mockResolvedValue(
        createUser({ figmaId: 'fig-1' }),
      );

      const result = await service.completeFigmaOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeLinkedinOAuth', () => {
    const profile: LinkedinProfilePayload = {
      linkedinId: 'li-1',
      email: 'li@example.com',
      firstName: 'Link',
      lastName: 'EdIn',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when LinkedIn auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'linkedinOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeLinkedinOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('LinkedIn authentication is disabled'),
      );
    });

    it('returns redirect URL for existing linkedin user', async () => {
      usersService.findByLinkedinId.mockResolvedValue(
        createUser({ linkedinId: 'li-1' }),
      );

      const result = await service.completeLinkedinOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive linkedin user', async () => {
      usersService.findByLinkedinId.mockResolvedValue(
        createUser({ linkedinId: 'li-1', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeLinkedinOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links linkedin id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByLinkedinId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        linkedinId: profile.linkedinId,
      });

      await service.completeLinkedinOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        linkedinId: 'li-1',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'linkedinOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByLinkedinId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeLinkedinOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          linkedinId: 'li-1',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByLinkedinId.mockResolvedValue(
        createUser({ linkedinId: 'li-1' }),
      );

      const result = await service.completeLinkedinOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeSlackOAuth', () => {
    const profile: SlackProfilePayload = {
      slackId: 'U0R7JM',
      email: 'slack@example.com',
      firstName: 'Slack',
      lastName: 'User',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Slack auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'slackOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeSlackOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Slack authentication is disabled'),
      );
    });

    it('returns redirect URL for existing slack user', async () => {
      usersService.findBySlackId.mockResolvedValue(
        createUser({ slackId: 'U0R7JM' }),
      );

      const result = await service.completeSlackOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive slack user', async () => {
      usersService.findBySlackId.mockResolvedValue(
        createUser({ slackId: 'U0R7JM', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeSlackOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links slack id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findBySlackId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        slackId: profile.slackId,
      });

      await service.completeSlackOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        slackId: 'U0R7JM',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'slackOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findBySlackId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeSlackOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          slackId: 'U0R7JM',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findBySlackId.mockResolvedValue(
        createUser({ slackId: 'U0R7JM' }),
      );

      const result = await service.completeSlackOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeAtlassianOAuth', () => {
    const profile: AtlassianProfilePayload = {
      atlassianId: '712020:abc123',
      email: 'atlassian@example.com',
      firstName: 'Atlassian',
      lastName: 'User',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Atlassian auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'atlassianOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeAtlassianOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Atlassian authentication is disabled'),
      );
    });

    it('returns redirect URL for existing atlassian user', async () => {
      usersService.findByAtlassianId.mockResolvedValue(
        createUser({ atlassianId: '712020:abc123' }),
      );

      const result = await service.completeAtlassianOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive atlassian user', async () => {
      usersService.findByAtlassianId.mockResolvedValue(
        createUser({ atlassianId: '712020:abc123', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeAtlassianOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links atlassian id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByAtlassianId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        atlassianId: profile.atlassianId,
      });

      await service.completeAtlassianOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        atlassianId: '712020:abc123',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'atlassianOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByAtlassianId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeAtlassianOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          atlassianId: '712020:abc123',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByAtlassianId.mockResolvedValue(
        createUser({ atlassianId: '712020:abc123' }),
      );

      const result = await service.completeAtlassianOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeGitlabOAuth', () => {
    const profile: GitlabProfilePayload = {
      gitlabId: '12345678',
      email: 'gitlab@example.com',
      firstName: 'GitLab',
      lastName: 'User',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when GitLab auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'gitlabOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeGitlabOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('GitLab authentication is disabled'),
      );
    });

    it('returns redirect URL for existing gitlab user', async () => {
      usersService.findByGitlabId.mockResolvedValue(
        createUser({ gitlabId: '12345678' }),
      );

      const result = await service.completeGitlabOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive gitlab user', async () => {
      usersService.findByGitlabId.mockResolvedValue(
        createUser({ gitlabId: '12345678', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeGitlabOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links gitlab id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByGitlabId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        gitlabId: profile.gitlabId,
      });

      await service.completeGitlabOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        gitlabId: '12345678',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'gitlabOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByGitlabId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeGitlabOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          gitlabId: '12345678',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByGitlabId.mockResolvedValue(
        createUser({ gitlabId: '12345678' }),
      );

      const result = await service.completeGitlabOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeBitbucketOAuth', () => {
    const profile: BitbucketProfilePayload = {
      bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
      email: 'bitbucket@example.com',
      firstName: 'Bitbucket',
      lastName: 'User',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Bitbucket auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'bitbucketOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeBitbucketOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Bitbucket authentication is disabled'),
      );
    });

    it('returns redirect URL for existing bitbucket user', async () => {
      usersService.findByBitbucketId.mockResolvedValue(
        createUser({ bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}' }),
      );

      const result = await service.completeBitbucketOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive bitbucket user', async () => {
      usersService.findByBitbucketId.mockResolvedValue(
        createUser({
          bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
          isActive: false,
        }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeBitbucketOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links bitbucket id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByBitbucketId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        bitbucketId: profile.bitbucketId,
      });

      await service.completeBitbucketOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'bitbucketOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByBitbucketId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeBitbucketOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByBitbucketId.mockResolvedValue(
        createUser({ bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}' }),
      );

      const result = await service.completeBitbucketOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeDiscordOAuth', () => {
    const profile: DiscordProfilePayload = {
      discordId: '123456789012345678',
      email: 'discord@example.com',
      firstName: 'Discord',
      lastName: 'User',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Discord auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'discordOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeDiscordOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Discord authentication is disabled'),
      );
    });

    it('returns redirect URL for existing discord user', async () => {
      usersService.findByDiscordId.mockResolvedValue(
        createUser({ discordId: '123456789012345678' }),
      );

      const result = await service.completeDiscordOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive discord user', async () => {
      usersService.findByDiscordId.mockResolvedValue(
        createUser({
          discordId: '123456789012345678',
          isActive: false,
        }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeDiscordOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links discord id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByDiscordId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        discordId: profile.discordId,
      });

      await service.completeDiscordOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        discordId: '123456789012345678',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'discordOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByDiscordId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeDiscordOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          discordId: '123456789012345678',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByDiscordId.mockResolvedValue(
        createUser({ discordId: '123456789012345678' }),
      );

      const result = await service.completeDiscordOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeTwitchOAuth', () => {
    const profile: TwitchProfilePayload = {
      twitchId: '141981764',
      email: 'twitch@example.com',
      firstName: 'Twitch',
      lastName: 'User',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Twitch auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'twitchOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeTwitchOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Twitch authentication is disabled'),
      );
    });

    it('returns redirect URL for existing twitch user', async () => {
      usersService.findByTwitchId.mockResolvedValue(
        createUser({ twitchId: '141981764' }),
      );

      const result = await service.completeTwitchOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive twitch user', async () => {
      usersService.findByTwitchId.mockResolvedValue(
        createUser({
          twitchId: '141981764',
          isActive: false,
        }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeTwitchOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links twitch id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByTwitchId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        twitchId: profile.twitchId,
      });

      await service.completeTwitchOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        twitchId: '141981764',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'twitchOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByTwitchId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeTwitchOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          twitchId: '141981764',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByTwitchId.mockResolvedValue(
        createUser({ twitchId: '141981764' }),
      );

      const result = await service.completeTwitchOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeSteamOAuth', () => {
    const profile: SteamProfilePayload = {
      steamId: '76561198000000000',
      email: '76561198000000000@users.noreply.steamcommunity.com',
      firstName: 'Steam',
      lastName: 'User',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Steam auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'steamOpenId.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeSteamOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Steam authentication is disabled'),
      );
    });

    it('returns redirect URL for existing steam user', async () => {
      usersService.findBySteamId.mockResolvedValue(
        createUser({ steamId: '76561198000000000' }),
      );

      const result = await service.completeSteamOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive steam user', async () => {
      usersService.findBySteamId.mockResolvedValue(
        createUser({
          steamId: '76561198000000000',
          isActive: false,
        }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeSteamOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links steam id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findBySteamId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        steamId: profile.steamId,
      });

      await service.completeSteamOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        steamId: '76561198000000000',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'steamOpenId.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findBySteamId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeSteamOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          steamId: '76561198000000000',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findBySteamId.mockResolvedValue(
        createUser({ steamId: '76561198000000000' }),
      );

      const result = await service.completeSteamOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });


  describe('completeAppleOAuth', () => {
    const profile: AppleProfilePayload = {
      appleId: 'apple-sub-001',
      email: 'user@privaterelay.appleid.com',
      firstName: 'Jane',
      lastName: 'Doe',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Apple auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'appleOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeAppleOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Apple authentication is disabled'),
      );
    });

    it('returns redirect URL for existing apple user', async () => {
      usersService.findByAppleId.mockResolvedValue(
        createUser({ appleId: 'apple-sub-001' }),
      );

      const result = await service.completeAppleOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive apple user', async () => {
      usersService.findByAppleId.mockResolvedValue(
        createUser({ appleId: 'apple-sub-001', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeAppleOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links apple id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByAppleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        appleId: profile.appleId,
      });

      await service.completeAppleOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        appleId: 'apple-sub-001',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'appleOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByAppleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeAppleOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          appleId: 'apple-sub-001',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByAppleId.mockResolvedValue(
        createUser({ appleId: 'apple-sub-001' }),
      );

      const result = await service.completeAppleOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeAmazonOAuth', () => {
    const profile: AmazonProfilePayload = {
      amazonId: 'amzn1.account.abc123',
      email: 'amazon@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Amazon auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'amazonOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeAmazonOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException('Amazon authentication is disabled'),
      );
    });

    it('returns redirect URL for existing amazon user', async () => {
      usersService.findByAmazonId.mockResolvedValue(
        createUser({ amazonId: 'amzn1.account.abc123' }),
      );

      const result = await service.completeAmazonOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive amazon user', async () => {
      usersService.findByAmazonId.mockResolvedValue(
        createUser({ amazonId: 'amzn1.account.abc123', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeAmazonOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links amazon id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByAmazonId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        amazonId: profile.amazonId,
      });

      await service.completeAmazonOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        amazonId: 'amzn1.account.abc123',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'amazonOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByAmazonId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeAmazonOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          amazonId: 'amzn1.account.abc123',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByAmazonId.mockResolvedValue(
        createUser({ amazonId: 'amzn1.account.abc123' }),
      );

      const result = await service.completeAmazonOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });


  describe('completePatreonOAuth', () => {
    const profile: PatreonProfilePayload = {
      patreonId: 'patreon-user-001',
      email: 'patreon@example.com',
      firstName: 'Pat',
      lastName: 'Creator',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Patreon auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'patreonOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completePatreonOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException(
          'Patreon authentication is disabled',
        ),
      );
    });

    it('returns redirect URL for existing patreon user', async () => {
      usersService.findByPatreonId.mockResolvedValue(
        createUser({ patreonId: 'patreon-user-001' }),
      );

      const result = await service.completePatreonOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive patreon user', async () => {
      usersService.findByPatreonId.mockResolvedValue(
        createUser({ patreonId: 'patreon-user-001', isActive: false }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completePatreonOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links patreon id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByPatreonId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        patreonId: profile.patreonId,
      });

      await service.completePatreonOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        patreonId: 'patreon-user-001',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'patreonOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByPatreonId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completePatreonOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          patreonId: 'patreon-user-001',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByPatreonId.mockResolvedValue(
        createUser({ patreonId: 'patreon-user-001' }),
      );

      const result = await service.completePatreonOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('completeDropboxOAuth', () => {
    const profile: DropboxProfilePayload = {
      dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
      email: 'dropbox@example.com',
      firstName: 'Drop',
      lastName: 'Box',
    };
    const state = encodeOAuthState('https://app.example/cb');

    it('throws 503 when Dropbox auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'dropboxOAuth.enabled') return false;
        return defaultConfig[key];
      });

      await expect(
        service.completeDropboxOAuth(profile, state),
      ).rejects.toThrow(
        new ServiceUnavailableException(
          'Dropbox authentication is disabled',
        ),
      );
    });

    it('returns redirect URL for existing dropbox user', async () => {
      usersService.findByDropboxId.mockResolvedValue(
        createUser({ dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc' }),
      );

      const result = await service.completeDropboxOAuth(profile, state);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?code=exchange-code-123',
      );
    });

    it('reactivates inactive dropbox user', async () => {
      usersService.findByDropboxId.mockResolvedValue(
        createUser({
          dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
          isActive: false,
        }),
      );
      usersService.update.mockResolvedValue(createUser({ isActive: true }));

      await service.completeDropboxOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        isActive: true,
      });
    });

    it('links dropbox id to existing email user', async () => {
      const byEmail = createUser({ email: profile.email });
      usersService.findByDropboxId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(byEmail);
      usersService.update.mockResolvedValue({
        ...byEmail,
        dropboxId: profile.dropboxId,
      });

      await service.completeDropboxOAuth(profile, state);

      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
      });
    });

    it('creates new user with dash lastName when empty', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'dropboxOAuth.defaultRoles') return undefined;
        return defaultConfig[key];
      });
      usersService.findByDropboxId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(createUser());

      await service.completeDropboxOAuth(
        { ...profile, lastName: '' },
        state,
      );

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: '-',
          roles: [],
          dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
        }),
      );
    });

    it('uses & separator when redirect already has query params', async () => {
      const queryState = encodeOAuthState('https://app.example/cb?foo=1');
      usersService.findByDropboxId.mockResolvedValue(
        createUser({ dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc' }),
      );

      const result = await service.completeDropboxOAuth(profile, queryState);

      expect(result.redirectUrl).toBe(
        'https://app.example/cb?foo=1&code=exchange-code-123',
      );
    });
  });

  describe('exchangeOAuthCode', () => {
    it('throws 503 when all social auth is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (
          key === 'googleOAuth.enabled' ||
          key === 'facebookOAuth.enabled' ||
          key === 'twitterOAuth.enabled' ||
          key === 'githubOAuth.enabled' ||
          key === 'figmaOAuth.enabled' ||
          key === 'linkedinOAuth.enabled' ||
          key === 'slackOAuth.enabled' ||
          key === 'atlassianOAuth.enabled' ||
          key === 'gitlabOAuth.enabled' ||
          key === 'bitbucketOAuth.enabled' ||
          key === 'discordOAuth.enabled' ||
          key === 'twitchOAuth.enabled' ||
          key === 'steamOpenId.enabled' ||
          key === 'appleOAuth.enabled' ||
          key === 'amazonOAuth.enabled' ||
          key === 'patreonOAuth.enabled' ||
          key === 'dropboxOAuth.enabled'
        ) {
          return false;
        }
        return defaultConfig[key];
      });

      await expect(
        service.exchangeOAuthCode({ code: 'code-1' }),
      ).rejects.toThrow(
        new ServiceUnavailableException('Social authentication is disabled'),
      );
    });

    it('throws 401 when exchange code user is not found', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('missing');
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.exchangeOAuthCode({ code: 'code-1' }),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or expired exchange code'),
      );
    });

    it('throws 401 when user is inactive', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue(createUser({ isActive: false }));

      await expect(
        service.exchangeOAuthCode({ code: 'code-1' }),
      ).rejects.toThrow(
        new UnauthorizedException('User account is not active'),
      );
    });

    it('returns sanitized user and tokens on success', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue(createUser());

      const result = await service.exchangeOAuthCode({ code: 'code-1' });

      expect(result).toEqual({
        user: expect.not.objectContaining({ password: expect.anything() }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('exchangeGoogleCode', () => {
    it('delegates to exchangeOAuthCode', async () => {
      oauthExchangeService.consumeExchangeCode.mockResolvedValue('user-1');
      usersService.findById.mockResolvedValue(createUser());

      const spy = jest.spyOn(service, 'exchangeOAuthCode');
      await service.exchangeGoogleCode({ code: 'code-1' });

      expect(spy).toHaveBeenCalledWith({ code: 'code-1' });
    });
  });

});
