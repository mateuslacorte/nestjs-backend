import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRequest, AppReply } from '@common/http/app-http';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwtauth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { TwitterAuthGuard } from './guards/twitter-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { FigmaAuthGuard } from './guards/figma-auth.guard';
import { LinkedinAuthGuard } from './guards/linkedin-auth.guard';
import { SlackAuthGuard } from './guards/slack-auth.guard';
import { AtlassianAuthGuard } from './guards/atlassian-auth.guard';
import { GitlabAuthGuard } from './guards/gitlab-auth.guard';
import { BitbucketAuthGuard } from './guards/bitbucket-auth.guard';
import { DiscordAuthGuard } from './guards/discord-auth.guard';
import { TwitchAuthGuard } from './guards/twitch-auth.guard';
import { SteamAuthGuard } from './guards/steam-auth.guard';
import { RedditAuthGuard } from './guards/reddit-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { AmazonAuthGuard } from './guards/amazon-auth.guard';
import { PatreonAuthGuard } from './guards/patreon-auth.guard';
import { DropboxAuthGuard } from './guards/dropbox-auth.guard';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshtokenDto } from './dtos/refreshtoken.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ExchangeCodeDto } from './dtos/exchange-code.dto';
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
import { RedditProfilePayload } from './strategies/reddit.strategy';
import { AppleProfilePayload } from './strategies/apple.strategy';
import { AmazonProfilePayload } from './strategies/amazon.strategy';
import { PatreonProfilePayload } from './strategies/patreon.strategy';
import { DropboxProfilePayload } from './strategies/dropbox.strategy';
import { Role } from './enums/role.enum';

function encodeOAuthState(redirect: string): string {
  return Buffer.from(JSON.stringify({ r: redirect }), 'utf8').toString(
    'base64url',
  );
}

describe('AuthController', () => {
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    loginWithActiveDirectory: jest.Mock;
    issueMetamaskNonce: jest.Mock;
    loginWithMetamask: jest.Mock;
    completeGoogleOAuth: jest.Mock;
    completeFacebookOAuth: jest.Mock;
    completeTwitterOAuth: jest.Mock;
    completeGithubOAuth: jest.Mock;
    completeFigmaOAuth: jest.Mock;
    completeLinkedinOAuth: jest.Mock;
    completeSlackOAuth: jest.Mock;
    completeAtlassianOAuth: jest.Mock;
    completeGitlabOAuth: jest.Mock;
    completeBitbucketOAuth: jest.Mock;
    completeDiscordOAuth: jest.Mock;
    completeTwitchOAuth: jest.Mock;
    completeSteamOAuth: jest.Mock;
    completeRedditOAuth: jest.Mock;
    completeAmazonOAuth: jest.Mock;
    completePatreonOAuth: jest.Mock;
    completeDropboxOAuth: jest.Mock;
    completeAppleOAuth: jest.Mock;
    exchangeOAuthCode: jest.Mock;
    refreshToken: jest.Mock;
    createPasswordResetToken: jest.Mock;
    sendResetTokenEmail: jest.Mock;
    resetPassword: jest.Mock;
    changePassword: jest.Mock;
    verifyEmail: jest.Mock;
    createEmailVerificationToken: jest.Mock;
    sendEmailVerification: jest.Mock;
  };
  let controller: AuthController;
  const reflector = new Reflector();

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      loginWithActiveDirectory: jest.fn(),
      issueMetamaskNonce: jest.fn(),
      loginWithMetamask: jest.fn(),
      completeGoogleOAuth: jest.fn(),
      completeFacebookOAuth: jest.fn(),
      completeTwitterOAuth: jest.fn(),
      completeGithubOAuth: jest.fn(),
      completeFigmaOAuth: jest.fn(),
      completeLinkedinOAuth: jest.fn(),
      completeSlackOAuth: jest.fn(),
      completeAtlassianOAuth: jest.fn(),
      completeGitlabOAuth: jest.fn(),
      completeBitbucketOAuth: jest.fn(),
      completeDiscordOAuth: jest.fn(),
      completeTwitchOAuth: jest.fn(),
      completeSteamOAuth: jest.fn(),
      completeRedditOAuth: jest.fn(),
      completeAmazonOAuth: jest.fn(),
      completePatreonOAuth: jest.fn(),
      completeDropboxOAuth: jest.fn(),
      completeAppleOAuth: jest.fn(),
      exchangeOAuthCode: jest.fn(),
      refreshToken: jest.fn(),
      createPasswordResetToken: jest.fn(),
      sendResetTokenEmail: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
      verifyEmail: jest.fn(),
      createEmailVerificationToken: jest.fn(),
      sendEmailVerification: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  describe('routing metadata', () => {
    it('is mounted at /auth', () => {
      expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
    });

    it.each([
      ['register', RequestMethod.POST, 'register'],
      ['login', RequestMethod.POST, 'login'],
      ['adLogin', RequestMethod.POST, 'ad/login'],
      ['metamaskNonce', RequestMethod.POST, 'metamask/nonce'],
      ['metamaskVerify', RequestMethod.POST, 'metamask/verify'],
      ['googleAuth', RequestMethod.GET, 'google'],
      ['googleAuthCallback', RequestMethod.GET, 'google/callback'],
      ['facebookAuth', RequestMethod.GET, 'facebook'],
      ['facebookAuthCallback', RequestMethod.GET, 'facebook/callback'],
      ['twitterAuth', RequestMethod.GET, 'twitter'],
      ['twitterAuthCallback', RequestMethod.GET, 'twitter/callback'],
      ['githubAuth', RequestMethod.GET, 'github'],
      ['githubAuthCallback', RequestMethod.GET, 'github/callback'],
      ['figmaAuth', RequestMethod.GET, 'figma'],
      ['figmaAuthCallback', RequestMethod.GET, 'figma/callback'],
      ['linkedinAuth', RequestMethod.GET, 'linkedin'],
      ['linkedinAuthCallback', RequestMethod.GET, 'linkedin/callback'],
      ['slackAuth', RequestMethod.GET, 'slack'],
      ['slackAuthCallback', RequestMethod.GET, 'slack/callback'],
      ['atlassianAuth', RequestMethod.GET, 'atlassian'],
      ['atlassianAuthCallback', RequestMethod.GET, 'atlassian/callback'],
      ['gitlabAuth', RequestMethod.GET, 'gitlab'],
      ['gitlabAuthCallback', RequestMethod.GET, 'gitlab/callback'],
      ['bitbucketAuth', RequestMethod.GET, 'bitbucket'],
      ['bitbucketAuthCallback', RequestMethod.GET, 'bitbucket/callback'],
      ['discordAuth', RequestMethod.GET, 'discord'],
      ['discordAuthCallback', RequestMethod.GET, 'discord/callback'],
      ['twitchAuth', RequestMethod.GET, 'twitch'],
      ['twitchAuthCallback', RequestMethod.GET, 'twitch/callback'],
      ['amazonAuth', RequestMethod.GET, 'amazon'],
      ['amazonAuthCallback', RequestMethod.GET, 'amazon/callback'],
      ['patreonAuth', RequestMethod.GET, 'patreon'],
      ['patreonAuthCallback', RequestMethod.GET, 'patreon/callback'],
      ['dropboxAuth', RequestMethod.GET, 'dropbox'],
      ['dropboxAuthCallback', RequestMethod.GET, 'dropbox/callback'],
      ['steamAuth', RequestMethod.GET, 'steam'],
      ['steamAuthCallback', RequestMethod.GET, 'steam/callback'],
      ['redditAuth', RequestMethod.GET, 'reddit'],
      ['redditAuthCallback', RequestMethod.GET, 'reddit/callback'],
      ['appleAuth', RequestMethod.GET, 'apple'],
      ['appleAuthCallback', RequestMethod.POST, 'apple/callback'],
      ['exchangeCode', RequestMethod.POST, 'exchange'],
      ['verifyToken', RequestMethod.POST, 'verify-token'],
      ['refreshToken', RequestMethod.POST, 'refresh-token'],
      ['forgotPassword', RequestMethod.POST, 'forgot-password'],
      ['resetPassword', RequestMethod.POST, 'reset-password'],
      ['changePassword', RequestMethod.POST, 'change-password'],
      ['verifyEmail', RequestMethod.GET, 'verify-email'],
      ['resendVerification', RequestMethod.POST, 'resend-verification'],
    ] as const)(
      '%s uses the expected HTTP method and path',
      (method, httpMethod, path) => {
        expect(
          Reflect.getMetadata(
            METHOD_METADATA,
            AuthController.prototype[method],
          ),
        ).toBe(httpMethod);
        expect(
          Reflect.getMetadata(PATH_METADATA, AuthController.prototype[method]),
        ).toBe(path);
      },
    );
  });

  describe('Public metadata', () => {
    const publicMethods = [
      'register',
      'login',
      'adLogin',
      'metamaskNonce',
      'metamaskVerify',
      'googleAuth',
      'googleAuthCallback',
      'facebookAuth',
      'facebookAuthCallback',
      'twitterAuth',
      'twitterAuthCallback',
      'githubAuth',
      'githubAuthCallback',
      'figmaAuth',
      'figmaAuthCallback',
      'linkedinAuth',
      'linkedinAuthCallback',
      'slackAuth',
      'slackAuthCallback',
      'atlassianAuth',
      'atlassianAuthCallback',
      'gitlabAuth',
      'gitlabAuthCallback',
      'bitbucketAuth',
      'bitbucketAuthCallback',
      'discordAuth',
      'discordAuthCallback',
      'twitchAuth',
      'twitchAuthCallback',
      'amazonAuth',
      'amazonAuthCallback',
      'patreonAuth',
      'patreonAuthCallback',
      'dropboxAuth',
      'dropboxAuthCallback',
      'steamAuth',
      'steamAuthCallback',
      'redditAuth',
      'redditAuthCallback',
      'appleAuth',
      'appleAuthCallback',
      'exchangeCode',
      'refreshToken',
      'forgotPassword',
      'resetPassword',
      'verifyEmail',
      'resendVerification',
    ] as const;

    it.each(publicMethods)('%s is marked public', (method) => {
      expect(
        reflector.get(IS_PUBLIC_KEY, AuthController.prototype[method]),
      ).toBe(true);
    });

    it('verifyToken is not public', () => {
      expect(
        reflector.get(IS_PUBLIC_KEY, AuthController.prototype.verifyToken),
      ).toBeUndefined();
    });

    it('changePassword is not public', () => {
      expect(
        reflector.get(IS_PUBLIC_KEY, AuthController.prototype.changePassword),
      ).toBeUndefined();
    });
  });

  describe('guards', () => {
    it('verifyToken uses JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.verifyToken,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard]));
    });

    it('changePassword uses JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.changePassword,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard]));
    });

    it('googleAuth uses GoogleAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.googleAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([GoogleAuthGuard]));
    });

    it('facebookAuth uses FacebookAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.facebookAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([FacebookAuthGuard]));
    });

    it('twitterAuth uses TwitterAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.twitterAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([TwitterAuthGuard]));
    });

    it('githubAuth uses GithubAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.githubAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([GithubAuthGuard]));
    });

    it('figmaAuth uses FigmaAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.figmaAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([FigmaAuthGuard]));
    });

    it('linkedinAuth uses LinkedinAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.linkedinAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([LinkedinAuthGuard]));
    });

    it('slackAuth uses SlackAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.slackAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([SlackAuthGuard]));
    });

    it('atlassianAuth uses AtlassianAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.atlassianAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([AtlassianAuthGuard]));
    });

    it('gitlabAuth uses GitlabAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.gitlabAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([GitlabAuthGuard]));
    });

    it('bitbucketAuth uses BitbucketAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.bitbucketAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([BitbucketAuthGuard]));
    });

    it('discordAuth uses DiscordAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.discordAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([DiscordAuthGuard]));
    });

    it('twitchAuth uses TwitchAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.twitchAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([TwitchAuthGuard]));
    });

    it('amazonAuth uses AmazonAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.amazonAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([AmazonAuthGuard]));
    });

    it('amazonAuthCallback uses AmazonAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.amazonAuthCallback,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([AmazonAuthGuard]));
    });



    it('patreonAuth uses PatreonAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.patreonAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([PatreonAuthGuard]));
    });

    it('patreonAuthCallback uses PatreonAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.patreonAuthCallback,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([PatreonAuthGuard]));
    });

    it('dropboxAuth uses DropboxAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.dropboxAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([DropboxAuthGuard]));
    });

    it('dropboxAuthCallback uses DropboxAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.dropboxAuthCallback,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([DropboxAuthGuard]));
    });

    it('steamAuth uses SteamAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.steamAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([SteamAuthGuard]));
    });

    it('redditAuth uses RedditAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.redditAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([RedditAuthGuard]));
    });

    it('appleAuth uses AppleAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.appleAuth,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([AppleAuthGuard]));
    });

    it('appleAuthCallback uses AppleAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.appleAuthCallback,
      ) as unknown[];

      expect(guards).toEqual(expect.arrayContaining([AppleAuthGuard]));
    });
  });

  describe('register', () => {
    it('delegates to AuthService.register', async () => {
      const dto: RegisterDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
        confirmPassword: 'Str0ng!P@ssw0rd',
      };
      const response = { user: {}, accessToken: 'a', refreshToken: 'r' };
      authService.register.mockResolvedValue(response);

      await expect(controller.register(dto)).resolves.toBe(response);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delegates to AuthService.login', async () => {
      const dto: LoginDto = {
        email: 'jane@example.com',
        password: 'Str0ng!P@ssw0rd',
      };
      const response = { user: {}, accessToken: 'a', refreshToken: 'r' };
      authService.login.mockResolvedValue(response);

      await expect(controller.login(dto)).resolves.toBe(response);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('adLogin', () => {
    it('delegates to AuthService.loginWithActiveDirectory', async () => {
      const dto = { username: 'jdoe', password: 'Str0ng!P@ssw0rd' };
      const response = { user: {}, accessToken: 'a', refreshToken: 'r' };
      authService.loginWithActiveDirectory.mockResolvedValue(response);

      await expect(controller.adLogin(dto)).resolves.toBe(response);
      expect(authService.loginWithActiveDirectory).toHaveBeenCalledWith(dto);
    });
  });

  describe('metamaskNonce', () => {
    it('delegates to AuthService.issueMetamaskNonce', async () => {
      const response = { nonce: 'n1', expiresIn: 300 };
      authService.issueMetamaskNonce.mockResolvedValue(response);

      await expect(controller.metamaskNonce()).resolves.toBe(response);
      expect(authService.issueMetamaskNonce).toHaveBeenCalled();
    });
  });

  describe('metamaskVerify', () => {
    it('delegates to AuthService.loginWithMetamask', async () => {
      const dto = { message: 'siwe', signature: '0xsig' };
      const response = { user: {}, accessToken: 'a', refreshToken: 'r' };
      authService.loginWithMetamask.mockResolvedValue(response);

      await expect(controller.metamaskVerify(dto)).resolves.toBe(response);
      expect(authService.loginWithMetamask).toHaveBeenCalledWith(dto);
    });
  });

  describe('OAuth entrypoints', () => {
    it('googleAuth is a no-op (guard handles redirect)', () => {
      expect(controller.googleAuth()).toBeUndefined();
    });

    it('facebookAuth is a no-op (guard handles redirect)', () => {
      expect(controller.facebookAuth()).toBeUndefined();
    });

    it('twitterAuth is a no-op (guard handles redirect)', () => {
      expect(controller.twitterAuth()).toBeUndefined();
    });

    it('githubAuth is a no-op (guard handles redirect)', () => {
      expect(controller.githubAuth()).toBeUndefined();
    });

    it('figmaAuth is a no-op (guard handles redirect)', () => {
      expect(controller.figmaAuth()).toBeUndefined();
    });

    it('linkedinAuth is a no-op (guard handles redirect)', () => {
      expect(controller.linkedinAuth()).toBeUndefined();
    });

    it('slackAuth is a no-op (guard handles redirect)', () => {
      expect(controller.slackAuth()).toBeUndefined();
    });

    it('atlassianAuth is a no-op (guard handles redirect)', () => {
      expect(controller.atlassianAuth()).toBeUndefined();
    });

    it('gitlabAuth is a no-op (guard handles redirect)', () => {
      expect(controller.gitlabAuth()).toBeUndefined();
    });

    it('bitbucketAuth is a no-op (guard handles redirect)', () => {
      expect(controller.bitbucketAuth()).toBeUndefined();
    });

    it('discordAuth is a no-op (guard handles redirect)', () => {
      expect(controller.discordAuth()).toBeUndefined();
    });

    it('twitchAuth is a no-op (guard handles redirect)', () => {
      expect(controller.twitchAuth()).toBeUndefined();
    });

    it('steamAuth is a no-op (guard handles redirect)', () => {
      expect(controller.steamAuth()).toBeUndefined();
    });

    it('redditAuth is a no-op (guard handles redirect)', () => {
      expect(controller.redditAuth()).toBeUndefined();
    });

    it('appleAuth is a no-op (guard handles redirect)', () => {
      expect(controller.appleAuth()).toBeUndefined();
    });

    it('amazonAuth is a no-op (guard handles redirect)', () => {
      expect(controller.amazonAuth()).toBeUndefined();
    });


    it('patreonAuth is a no-op (guard handles redirect)', () => {
      expect(controller.patreonAuth()).toBeUndefined();
    });

    it('dropboxAuth is a no-op (guard handles redirect)', () => {
      expect(controller.dropboxAuth()).toBeUndefined();
    });
  });

  describe('googleAuthCallback', () => {
    it('redirects using AuthService.completeGoogleOAuth result', async () => {
      const profile: GoogleProfilePayload = {
        googleId: 'g-1',
        email: 'g@example.com',
        firstName: 'Go',
        lastName: 'Ogler',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeGoogleOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=abc',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.googleAuthCallback(req, reply);

      expect(authService.completeGoogleOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=abc\")"),
      );
    });

    it('passes undefined state when query.state is not a string', async () => {
      const profile: GoogleProfilePayload = {
        googleId: 'g-1',
        email: 'g@example.com',
        firstName: 'Go',
        lastName: 'Ogler',
      };
      const req = {
        user: profile,
        query: { state: ['a', 'b'] },
      } as unknown as AppRequest;

      authService.completeGoogleOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=abc',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.googleAuthCallback(req, reply);

      expect(authService.completeGoogleOAuth).toHaveBeenCalledWith(
        profile,
        undefined,
      );
    });
  });

  describe('OAuth callbacks with non-string state', () => {
    const cases: Array<{
      method: keyof AuthController;
      serviceMethod: keyof typeof authService;
      profile: Record<string, string>;
      stateSource: 'query' | 'body';
    }> = [
      {
        method: 'facebookAuthCallback',
        serviceMethod: 'completeFacebookOAuth',
        profile: {
          facebookId: 'fb-1',
          email: 'fb@example.com',
          firstName: 'F',
          lastName: 'B',
        },
        stateSource: 'query',
      },
      {
        method: 'twitterAuthCallback',
        serviceMethod: 'completeTwitterOAuth',
        profile: {
          twitterId: 'tw-1',
          email: 'tw@example.com',
          firstName: 'T',
          lastName: 'W',
        },
        stateSource: 'query',
      },
      {
        method: 'githubAuthCallback',
        serviceMethod: 'completeGithubOAuth',
        profile: {
          githubId: 'gh-1',
          email: 'gh@example.com',
          firstName: 'G',
          lastName: 'H',
        },
        stateSource: 'query',
      },
      {
        method: 'figmaAuthCallback',
        serviceMethod: 'completeFigmaOAuth',
        profile: {
          figmaId: 'fi-1',
          email: 'fi@example.com',
          firstName: 'Fi',
          lastName: 'Gma',
        },
        stateSource: 'query',
      },
      {
        method: 'linkedinAuthCallback',
        serviceMethod: 'completeLinkedinOAuth',
        profile: {
          linkedinId: 'li-1',
          email: 'li@example.com',
          firstName: 'L',
          lastName: 'I',
        },
        stateSource: 'query',
      },
      {
        method: 'slackAuthCallback',
        serviceMethod: 'completeSlackOAuth',
        profile: {
          slackId: 'sl-1',
          email: 'sl@example.com',
          firstName: 'S',
          lastName: 'L',
        },
        stateSource: 'query',
      },
      {
        method: 'atlassianAuthCallback',
        serviceMethod: 'completeAtlassianOAuth',
        profile: {
          atlassianId: 'at-1',
          email: 'at@example.com',
          firstName: 'A',
          lastName: 'T',
        },
        stateSource: 'query',
      },
      {
        method: 'gitlabAuthCallback',
        serviceMethod: 'completeGitlabOAuth',
        profile: {
          gitlabId: 'gl-1',
          email: 'gl@example.com',
          firstName: 'G',
          lastName: 'L',
        },
        stateSource: 'query',
      },
      {
        method: 'bitbucketAuthCallback',
        serviceMethod: 'completeBitbucketOAuth',
        profile: {
          bitbucketId: 'bb-1',
          email: 'bb@example.com',
          firstName: 'B',
          lastName: 'B',
        },
        stateSource: 'query',
      },
      {
        method: 'discordAuthCallback',
        serviceMethod: 'completeDiscordOAuth',
        profile: {
          discordId: 'dc-1',
          email: 'dc@example.com',
          firstName: 'D',
          lastName: 'C',
        },
        stateSource: 'query',
      },
      {
        method: 'twitchAuthCallback',
        serviceMethod: 'completeTwitchOAuth',
        profile: {
          twitchId: 'twitch-1',
          email: 'twitch@example.com',
          firstName: 'Tw',
          lastName: 'Itch',
        },
        stateSource: 'query',
      },
      {
        method: 'amazonAuthCallback',
        serviceMethod: 'completeAmazonOAuth',
        profile: {
          amazonId: 'am-1',
          email: 'am@example.com',
          firstName: 'A',
          lastName: 'M',
        },
        stateSource: 'query',
      },
      {
        method: 'patreonAuthCallback',
        serviceMethod: 'completePatreonOAuth',
        profile: {
          patreonId: 'pa-1',
          email: 'pa@example.com',
          firstName: 'P',
          lastName: 'A',
        },
        stateSource: 'query',
      },
      {
        method: 'dropboxAuthCallback',
        serviceMethod: 'completeDropboxOAuth',
        profile: {
          dropboxId: 'db-1',
          email: 'db@example.com',
          firstName: 'D',
          lastName: 'B',
        },
        stateSource: 'query',
      },
      {
        method: 'steamAuthCallback',
        serviceMethod: 'completeSteamOAuth',
        profile: {
          steamId: '76561198000000000',
          email: 'steam@example.com',
          firstName: 'S',
          lastName: 'Team',
        },
        stateSource: 'query',
      },
      {
        method: 'redditAuthCallback',
        serviceMethod: 'completeRedditOAuth',
        profile: {
          redditId: 'rd-1',
          email: 'rd@example.com',
          firstName: 'R',
          lastName: 'D',
        },
        stateSource: 'query',
      },
      {
        method: 'appleAuthCallback',
        serviceMethod: 'completeAppleOAuth',
        profile: {
          appleId: 'ap-1',
          email: 'ap@example.com',
          firstName: 'A',
          lastName: 'P',
        },
        stateSource: 'body',
      },
    ];

    it.each(cases)(
      '$method passes undefined state when state is not a string',
      async ({ method, serviceMethod, profile, stateSource }) => {
        const req = {
          user: profile,
          query: stateSource === 'query' ? { state: ['a', 'b'] } : {},
          body: stateSource === 'body' ? { state: ['a', 'b'] } : {},
        } as unknown as AppRequest;
        (authService[serviceMethod] as jest.Mock).mockResolvedValue({
          redirectUrl: 'https://app.example/cb?code=x',
        });

        const reply = {
          status: jest.fn().mockReturnThis(),
          header: jest.fn().mockReturnThis(),
          send: jest.fn().mockReturnThis(),
        } as unknown as AppReply;

        await (
          controller[method] as (
            req: AppRequest,
            reply: AppReply,
          ) => Promise<unknown>
        )(req, reply);

        expect(reply.status).toHaveBeenCalledWith(200);

        expect(authService[serviceMethod]).toHaveBeenCalledWith(
          profile,
          undefined,
        );
      },
    );
  });

  describe('facebookAuthCallback', () => {
    it('redirects using AuthService.completeFacebookOAuth result', async () => {
      const profile: FacebookProfilePayload = {
        facebookId: 'fb-1',
        email: 'fb@example.com',
        firstName: 'Face',
        lastName: 'Book',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeFacebookOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=xyz',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.facebookAuthCallback(req, reply);

      expect(authService.completeFacebookOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=xyz\")"),
      );
    });
  });

  describe('twitterAuthCallback', () => {
    it('redirects using AuthService.completeTwitterOAuth result', async () => {
      const profile: TwitterProfilePayload = {
        twitterId: 'tw-1',
        email: 'tw@example.com',
        firstName: 'Twit',
        lastName: 'Ter',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeTwitterOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=tw',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.twitterAuthCallback(req, reply);

      expect(authService.completeTwitterOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=tw\")"),
      );
    });

    it('prefers oauthState recovered from PKCE session over query.state', async () => {
      const profile: TwitterProfilePayload = {
        twitterId: 'tw-1',
        email: 'tw@example.com',
        firstName: 'Twit',
        lastName: 'Ter',
      };
      const oauthState = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        oauthState,
        query: { state: 'random-pkce-handle' },
      } as unknown as AppRequest;

      authService.completeTwitterOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=tw',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.twitterAuthCallback(req, reply);

      expect(authService.completeTwitterOAuth).toHaveBeenCalledWith(
        profile,
        oauthState,
      );
    });
  });

  describe('githubAuthCallback', () => {
    it('redirects using AuthService.completeGithubOAuth result', async () => {
      const profile: GithubProfilePayload = {
        githubId: 'gh-1',
        email: 'gh@example.com',
        firstName: 'Git',
        lastName: 'Hub',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeGithubOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=gh',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.githubAuthCallback(req, reply);

      expect(authService.completeGithubOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=gh\")"),
      );
    });
  });

  describe('figmaAuthCallback', () => {
    it('redirects using AuthService.completeFigmaOAuth result', async () => {
      const profile: FigmaProfilePayload = {
        figmaId: 'fig-1',
        email: 'fig@example.com',
        firstName: 'Fig',
        lastName: 'Ma',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeFigmaOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=fig',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.figmaAuthCallback(req, reply);

      expect(authService.completeFigmaOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=fig\")"),
      );
    });
  });

  describe('linkedinAuthCallback', () => {
    it('redirects using AuthService.completeLinkedinOAuth result', async () => {
      const profile: LinkedinProfilePayload = {
        linkedinId: 'li-1',
        email: 'li@example.com',
        firstName: 'Link',
        lastName: 'EdIn',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeLinkedinOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=li',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.linkedinAuthCallback(req, reply);

      expect(authService.completeLinkedinOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=li\")"),
      );
    });
  });

  describe('slackAuthCallback', () => {
    it('redirects using AuthService.completeSlackOAuth result', async () => {
      const profile: SlackProfilePayload = {
        slackId: 'U0R7JM',
        email: 'slack@example.com',
        firstName: 'Slack',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeSlackOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=slack',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.slackAuthCallback(req, reply);

      expect(authService.completeSlackOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=slack\")"),
      );
    });
  });

  describe('atlassianAuthCallback', () => {
    it('redirects using AuthService.completeAtlassianOAuth result', async () => {
      const profile: AtlassianProfilePayload = {
        atlassianId: '712020:abc123',
        email: 'atlassian@example.com',
        firstName: 'Atlassian',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeAtlassianOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=atlassian',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.atlassianAuthCallback(req, reply);

      expect(authService.completeAtlassianOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=atlassian\")"),
      );
    });
  });

  describe('gitlabAuthCallback', () => {
    it('redirects using AuthService.completeGitlabOAuth result', async () => {
      const profile: GitlabProfilePayload = {
        gitlabId: '12345678',
        email: 'gitlab@example.com',
        firstName: 'GitLab',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeGitlabOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=gitlab',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.gitlabAuthCallback(req, reply);

      expect(authService.completeGitlabOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=gitlab\")"),
      );
    });
  });

  describe('bitbucketAuthCallback', () => {
    it('redirects using AuthService.completeBitbucketOAuth result', async () => {
      const profile: BitbucketProfilePayload = {
        bitbucketId: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
        email: 'bitbucket@example.com',
        firstName: 'Bitbucket',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeBitbucketOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=bitbucket',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.bitbucketAuthCallback(req, reply);

      expect(authService.completeBitbucketOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=bitbucket\")"),
      );
    });
  });

  describe('discordAuthCallback', () => {
    it('redirects using AuthService.completeDiscordOAuth result', async () => {
      const profile: DiscordProfilePayload = {
        discordId: '123456789012345678',
        email: 'discord@example.com',
        firstName: 'Discord',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeDiscordOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=discord',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.discordAuthCallback(req, reply);

      expect(authService.completeDiscordOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=discord\")"),
      );
    });
  });

  describe('twitchAuthCallback', () => {
    it('redirects using AuthService.completeTwitchOAuth result', async () => {
      const profile: TwitchProfilePayload = {
        twitchId: '141981764',
        email: 'twitch@example.com',
        firstName: 'Twitch',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeTwitchOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=twitch',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.twitchAuthCallback(req, reply);

      expect(authService.completeTwitchOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=twitch\")"),
      );
    });
  });

  describe('amazonAuthCallback', () => {
    it('redirects using AuthService.completeAmazonOAuth result', async () => {
      const profile: AmazonProfilePayload = {
        amazonId: 'amzn1.account.abc123',
        email: 'amazon@example.com',
        firstName: 'Amazon',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeAmazonOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=amazon',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.amazonAuthCallback(req, reply);

      expect(authService.completeAmazonOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=amazon\")"),
      );
    });
  });


  describe('patreonAuthCallback', () => {
    it('redirects using AuthService.completePatreonOAuth result', async () => {
      const profile: PatreonProfilePayload = {
        patreonId: 'patreon-user-001',
        email: 'patreon@example.com',
        firstName: 'Patreon',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completePatreonOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=patreon',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.patreonAuthCallback(req, reply);

      expect(authService.completePatreonOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=patreon\")"),
      );
    });
  });

  describe('dropboxAuthCallback', () => {
    it('redirects using AuthService.completeDropboxOAuth result', async () => {
      const profile: DropboxProfilePayload = {
        dropboxId: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
        email: 'dropbox@example.com',
        firstName: 'Dropbox',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeDropboxOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=dropbox',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.dropboxAuthCallback(req, reply);

      expect(authService.completeDropboxOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=dropbox\")"),
      );
    });
  });

  describe('steamAuthCallback', () => {
    it('redirects using AuthService.completeSteamOAuth result', async () => {
      const profile: SteamProfilePayload = {
        steamId: '76561198000000000',
        email: '76561198000000000@users.noreply.steamcommunity.com',
        firstName: 'Steam',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeSteamOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=steam',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.steamAuthCallback(req, reply);

      expect(authService.completeSteamOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=steam\")"),
      );
    });
  });

  describe('redditAuthCallback', () => {
    it('redirects using AuthService.completeRedditOAuth result', async () => {
      const profile: RedditProfilePayload = {
        redditId: 'abc123',
        email: 'abc123@users.noreply.reddit.com',
        firstName: 'Reddit',
        lastName: 'User',
      };
      const state = encodeOAuthState('https://app.example/cb');
      const req = {
        user: profile,
        query: { state },
      } as unknown as AppRequest;

      authService.completeRedditOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=reddit',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.redditAuthCallback(req, reply);

      expect(authService.completeRedditOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=reddit\")"),
      );
    });
  });

  describe('appleAuthCallback', () => {
    it('redirects using AuthService.completeAppleOAuth result (reads state from body)', async () => {
      const profile: AppleProfilePayload = {
        appleId: 'apple-sub-001',
        email: 'user@privaterelay.appleid.com',
        firstName: 'Jane',
        lastName: 'Doe',
      };
      const state = Buffer.from(
        JSON.stringify({ r: 'https://app.example/cb' }),
        'utf8',
      ).toString('base64url');
      const req = {
        user: profile,
        body: { state },
        query: {},
      } as unknown as AppRequest;

      authService.completeAppleOAuth.mockResolvedValue({
        redirectUrl: 'https://app.example/cb?code=apple',
      });

      const reply = {
        status: jest.fn().mockReturnThis(),
        header: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as AppReply;

      await controller.appleAuthCallback(req, reply);

      expect(authService.completeAppleOAuth).toHaveBeenCalledWith(
        profile,
        state,
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.stringContaining("window.location.replace(\"https://app.example/cb?code=apple\")"),
      );
    });
  });

  describe('exchangeCode', () => {
    it('delegates to AuthService.exchangeOAuthCode', async () => {
      const dto: ExchangeCodeDto = { code: 'exchange-code' };
      const response = {
        user: { id: 'user-1', roles: [Role.USER] },
        accessToken: 'a',
        refreshToken: 'r',
      };
      authService.exchangeOAuthCode.mockResolvedValue(response);

      await expect(controller.exchangeCode(dto)).resolves.toBe(response);
      expect(authService.exchangeOAuthCode).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyToken', () => {
    it('returns valid token message with user payload', () => {
      const req = {
        user: { id: 'user-1', email: 'jane@example.com', roles: [Role.USER] },
      } as unknown as AppRequest;

      expect(controller.verifyToken(req)).toEqual({
        message: 'Token is valid',
        user: req.user,
      });
    });
  });

  describe('refreshToken', () => {
    it('delegates to AuthService.refreshToken', async () => {
      const dto: RefreshtokenDto = { refreshToken: 'refresh-token' };
      const tokens = { accessToken: 'a', refreshToken: 'r' };
      authService.refreshToken.mockResolvedValue(tokens);

      await expect(controller.refreshToken(dto)).resolves.toBe(tokens);
      expect(authService.refreshToken).toHaveBeenCalledWith(dto);
    });
  });

  describe('forgotPassword', () => {
    it('creates reset token, sends email, and returns message', async () => {
      const dto: ForgotPasswordDto = { email: 'jane@example.com' };
      authService.createPasswordResetToken.mockResolvedValue('123456');
      authService.sendResetTokenEmail.mockResolvedValue('123456');

      await expect(controller.forgotPassword(dto)).resolves.toEqual({
        message: 'Password reset instructions sent to your email',
      });
      expect(authService.createPasswordResetToken).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(authService.sendResetTokenEmail).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
    });

    it('returns the same message without sending email when user is unknown', async () => {
      const dto: ForgotPasswordDto = { email: 'missing@example.com' };
      authService.createPasswordResetToken.mockResolvedValue(null);

      await expect(controller.forgotPassword(dto)).resolves.toEqual({
        message: 'Password reset instructions sent to your email',
      });
      expect(authService.sendResetTokenEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('delegates to AuthService.resetPassword and returns message', async () => {
      const dto: ResetPasswordDto = {
        token: '123456',
        password: 'NewP@ssw0rd1',
        confirmPassword: 'NewP@ssw0rd1',
      };
      authService.resetPassword.mockResolvedValue(true);

      await expect(controller.resetPassword(dto)).resolves.toEqual({
        message: 'Password reset successfully',
      });
      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('changePassword', () => {
    it('delegates to AuthService.changePassword with authenticated user id', async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'OldP@ssw0rd1',
        newPassword: 'NewP@ssw0rd1',
        confirmNewPassword: 'NewP@ssw0rd1',
      };
      const req = { user: { id: 'user-1' } } as unknown as AppRequest;
      const response = { message: 'Password changed successfully' };
      authService.changePassword.mockResolvedValue(response);

      await expect(controller.changePassword(req, dto)).resolves.toBe(response);
      expect(authService.changePassword).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('verifyEmail', () => {
    it('returns success message when verification succeeds', async () => {
      authService.verifyEmail.mockResolvedValue(true);

      await expect(controller.verifyEmail('123456')).resolves.toEqual({
        message: 'Email verified successfully. You can now login.',
      });
      expect(authService.verifyEmail).toHaveBeenCalledWith('123456');
    });

    it('returns undefined when verification does not succeed', async () => {
      authService.verifyEmail.mockResolvedValue(false);

      await expect(controller.verifyEmail('bad')).resolves.toBeUndefined();
      expect(authService.verifyEmail).toHaveBeenCalledWith('bad');
    });
  });

  describe('resendVerification', () => {
    it('creates verification token, sends email, and returns message', async () => {
      authService.createEmailVerificationToken.mockResolvedValue('123456');
      authService.sendEmailVerification.mockResolvedValue(undefined);

      await expect(
        controller.resendVerification('jane@example.com'),
      ).resolves.toEqual({
        message: 'Email verification resent successfully',
      });
      expect(authService.createEmailVerificationToken).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(authService.sendEmailVerification).toHaveBeenCalledWith(
        'jane@example.com',
        '123456',
      );
    });
  });
});
