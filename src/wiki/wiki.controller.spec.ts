import {
  PATH_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import * as path from 'path';
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
  let req: Request;
  let res: Response & { sendFile: jest.Mock };

  beforeEach(() => {
    wikiRender = {
      renderPage: jest.fn(),
      renderNotFound: jest.fn(),
      renderServerError: jest.fn(),
    };
    controller = new WikiController(
      wikiRender as unknown as WikiRenderService,
    );
    req = { path: '/' } as Request;
    res = { sendFile: jest.fn() } as unknown as Response & {
      sendFile: jest.Mock;
    };
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
        method: 'getAuth',
        route: 'auth',
        view: 'pages/auth',
        namespace: 'auth',
        page: 'auth',
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
          req: Request,
          res: Response,
          lang?: string,
        ) => void)(req, res, 'pt-BR');

        expect(wikiRender.renderPage).toHaveBeenCalledWith(
          req,
          res,
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
      controller.getNotFoundPreview(req, res);
      expect(wikiRender.renderNotFound).toHaveBeenCalledWith(req, res);
    });

    it('getServerErrorPreview delegates to renderServerError', () => {
      controller.getServerErrorPreview(req, res);
      expect(wikiRender.renderServerError).toHaveBeenCalledWith(req, res);
    });
  });

  describe('serveStatic', () => {
    it('sends a file from the wiki public directory', () => {
      controller.serveStatic('favicon.ico', res);

      expect(res.sendFile).toHaveBeenCalledWith(
        path.join(__dirname, 'public', 'favicon.ico'),
      );
    });

    it('supports nested static paths', () => {
      controller.serveStatic('og/default.jpg', res);

      expect(res.sendFile).toHaveBeenCalledWith(
        path.join(__dirname, 'public', 'og/default.jpg'),
      );
    });
  });
});
