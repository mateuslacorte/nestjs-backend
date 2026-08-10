import {
  PATH_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRequest, AppReply } from '@common/http/app-http';
import { IS_PUBLIC_KEY } from '@modules/auth/decorators/public.decorator';
import { NO_LOG_KEY } from '@common/graylog/decorators/no-log.decorator';
import { WikiController } from './wiki.controller';
import { WikiRenderService } from './wiki-render.service';

describe('WikiController', () => {
  let wikiRender: {
    renderPage: jest.Mock;
    renderNotFound: jest.Mock;
    renderServerError: jest.Mock;
  };
  let controller: WikiController;
  let req: AppRequest;
  let reply: AppReply;

  beforeEach(() => {
    wikiRender = {
      renderPage: jest.fn(),
      renderNotFound: jest.fn(),
      renderServerError: jest.fn(),
    };
    controller = new WikiController(
      wikiRender as unknown as WikiRenderService,
    );
    req = { path: '/' } as AppRequest;
    reply = {} as AppReply;
  });

  describe('class metadata', () => {
    const reflector = new Reflector();

    it('is mounted at root', () => {
      expect(Reflect.getMetadata(PATH_METADATA, WikiController)).toBe('/');
    });

    it('is Public and NoLog at class level', () => {
      expect(reflector.get(IS_PUBLIC_KEY, WikiController)).toBe(true);
      expect(reflector.get(NO_LOG_KEY, WikiController)).toBe(true);
    });
  });

  describe('page routes', () => {
    const cases: Array<{
      method: keyof WikiController;
      route: string | undefined;
      view: string;
      namespace: string;
      page: string;
    }> = [
      {
        method: 'getHome',
        route: '/',
        view: 'pages/home',
        namespace: 'home',
        page: 'home',
      },
      {
        method: 'getArchitecture',
        route: 'architecture',
        view: 'pages/architecture',
        namespace: 'architecture',
        page: 'architecture',
      },
      {
        method: 'getBackend',
        route: 'backend',
        view: 'pages/backend',
        namespace: 'backend',
        page: 'backend',
      },
      {
        method: 'getBackendInstall',
        route: 'backend/install',
        view: 'pages/backend-install',
        namespace: 'backendInstall',
        page: 'backend-install',
      },
      {
        method: 'getBackendMigrations',
        route: 'backend/migrations',
        view: 'pages/backend-migrations',
        namespace: 'backendMigrations',
        page: 'backend-migrations',
      },
      {
        method: 'getAuth',
        route: 'auth',
        view: 'pages/auth',
        namespace: 'auth',
        page: 'auth',
      },
      {
        method: 'getAuthActiveDirectory',
        route: 'auth/active-directory',
        view: 'pages/auth-active-directory',
        namespace: 'authActiveDirectory',
        page: 'auth-active-directory',
      },
      {
        method: 'getAuthActiveDirectoryLdap',
        route: 'auth/active-directory/ldap',
        view: 'pages/auth-active-directory-ldap',
        namespace: 'authActiveDirectoryLdap',
        page: 'auth-active-directory-ldap',
      },
      {
        method: 'getAuthActiveDirectoryLdaps',
        route: 'auth/active-directory/ldaps',
        view: 'pages/auth-active-directory-ldaps',
        namespace: 'authActiveDirectoryLdaps',
        page: 'auth-active-directory-ldaps',
      },
      {
        method: 'getAuthSocial',
        route: 'auth/social',
        view: 'pages/auth-social',
        namespace: 'authSocial',
        page: 'auth-social',
      },
      {
        method: 'getAuthSocialGoogle',
        route: 'auth/social/google',
        view: 'pages/auth-social-google',
        namespace: 'authSocialGoogle',
        page: 'auth-social-google',
      },
      {
        method: 'getAuthSocialFacebook',
        route: 'auth/social/facebook',
        view: 'pages/auth-social-facebook',
        namespace: 'authSocialFacebook',
        page: 'auth-social-facebook',
      },
      {
        method: 'getAuthSocialTwitter',
        route: 'auth/social/twitter',
        view: 'pages/auth-social-twitter',
        namespace: 'authSocialTwitter',
        page: 'auth-social-twitter',
      },
      {
        method: 'getAuthSocialGithub',
        route: 'auth/social/github',
        view: 'pages/auth-social-github',
        namespace: 'authSocialGithub',
        page: 'auth-social-github',
      },
      {
        method: 'getAuthSocialFigma',
        route: 'auth/social/figma',
        view: 'pages/auth-social-figma',
        namespace: 'authSocialFigma',
        page: 'auth-social-figma',
      },
      {
        method: 'getAuthSocialLinkedin',
        route: 'auth/social/linkedin',
        view: 'pages/auth-social-linkedin',
        namespace: 'authSocialLinkedin',
        page: 'auth-social-linkedin',
      },
      {
        method: 'getAuthSocialSlack',
        route: 'auth/social/slack',
        view: 'pages/auth-social-slack',
        namespace: 'authSocialSlack',
        page: 'auth-social-slack',
      },
      {
        method: 'getAuthSocialAtlassian',
        route: 'auth/social/atlassian',
        view: 'pages/auth-social-atlassian',
        namespace: 'authSocialAtlassian',
        page: 'auth-social-atlassian',
      },
      {
        method: 'getAuthSocialGitlab',
        route: 'auth/social/gitlab',
        view: 'pages/auth-social-gitlab',
        namespace: 'authSocialGitlab',
        page: 'auth-social-gitlab',
      },
      {
        method: 'getAuthSocialBitbucket',
        route: 'auth/social/bitbucket',
        view: 'pages/auth-social-bitbucket',
        namespace: 'authSocialBitbucket',
        page: 'auth-social-bitbucket',
      },
      {
        method: 'getAuthSocialDiscord',
        route: 'auth/social/discord',
        view: 'pages/auth-social-discord',
        namespace: 'authSocialDiscord',
        page: 'auth-social-discord',
      },
      {
        method: 'getAuthSocialTwitch',
        route: 'auth/social/twitch',
        view: 'pages/auth-social-twitch',
        namespace: 'authSocialTwitch',
        page: 'auth-social-twitch',
      },
      {
        method: 'getAuthSocialAmazon',
        route: 'auth/social/amazon',
        view: 'pages/auth-social-amazon',
        namespace: 'authSocialAmazon',
        page: 'auth-social-amazon',
      },
      {
        method: 'getAuthSocialPatreon',
        route: 'auth/social/patreon',
        view: 'pages/auth-social-patreon',
        namespace: 'authSocialPatreon',
        page: 'auth-social-patreon',
      },
      {
        method: 'getAuthSocialDropbox',
        route: 'auth/social/dropbox',
        view: 'pages/auth-social-dropbox',
        namespace: 'authSocialDropbox',
        page: 'auth-social-dropbox',
      },
      {
        method: 'getAuthSocialMetamask',
        route: 'auth/social/metamask',
        view: 'pages/auth-social-metamask',
        namespace: 'authSocialMetamask',
        page: 'auth-social-metamask',
      },
      {
        method: 'getAuthSocialSteam',
        route: 'auth/social/steam',
        view: 'pages/auth-social-steam',
        namespace: 'authSocialSteam',
        page: 'auth-social-steam',
      },
      {
        method: 'getAuthSocialApple',
        route: 'auth/social/apple',
        view: 'pages/auth-social-apple',
        namespace: 'authSocialApple',
        page: 'auth-social-apple',
      },
      {
        method: 'getEmail',
        route: 'email',
        view: 'pages/email',
        namespace: 'email',
        page: 'email',
      },
      {
        method: 'getWhatsapp',
        route: 'whatsapp',
        view: 'pages/whatsapp',
        namespace: 'whatsapp',
        page: 'whatsapp',
      },
      {
        method: 'getWebsocket',
        route: 'websocket',
        view: 'pages/websocket',
        namespace: 'websocket',
        page: 'websocket',
      },
      {
        method: 'getWsui',
        route: 'wsui',
        view: 'pages/wsui',
        namespace: 'wsui',
        page: 'wsui',
      },
      {
        method: 'getSecurity',
        route: 'security',
        view: 'pages/security',
        namespace: 'security',
        page: 'security',
      },
      {
        method: 'getSecurityAudit',
        route: 'security/audit',
        view: 'pages/security-audit',
        namespace: 'securityAudit',
        page: 'security-audit',
      },
      {
        method: 'getTests',
        route: 'tests',
        view: 'pages/tests',
        namespace: 'tests',
        page: 'tests',
      },
    ];

    it.each(cases)(
      '$method is GET $route and delegates to renderPage',
      ({ method, route, view, namespace, page }) => {
        expect(
          Reflect.getMetadata(METHOD_METADATA, WikiController.prototype[method]),
        ).toBe(RequestMethod.GET);
        expect(
          Reflect.getMetadata(PATH_METADATA, WikiController.prototype[method]),
        ).toBe(route);

        (controller[method] as (
          req: AppRequest,
          reply: AppReply,
          lang?: string,
        ) => void)(req, reply, 'pt-BR');

        expect(wikiRender.renderPage).toHaveBeenCalledWith(
          req,
          reply,
          'pt-BR',
          view,
          namespace,
          page,
        );
      },
    );
  });

  describe('error previews', () => {
    it('getNotFoundPreview delegates to renderNotFound', () => {
      controller.getNotFoundPreview(req, reply);
      expect(wikiRender.renderNotFound).toHaveBeenCalledWith(req, reply);
    });

    it('getServerErrorPreview delegates to renderServerError', () => {
      controller.getServerErrorPreview(req, reply);
      expect(wikiRender.renderServerError).toHaveBeenCalledWith(req, reply);
    });
  });
});
