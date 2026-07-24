import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WikiRenderService } from './wiki-render.service';
import { WikiI18nService } from './i18n/wiki-i18n.service';
import {
  WIKI_LOCALE_COOKIE,
  buildWikiLocaleCookie,
} from './i18n/wiki-locale';
import { WIKI_SEO } from './seo/wiki-seo';

describe('WikiRenderService', () => {
  let i18n: { t: jest.Mock; get: jest.Mock };
  let configService: { get: jest.Mock };
  let service: WikiRenderService;

  function createReq(overrides: Partial<Request> = {}): Request {
    const headers: Record<string, string | string[] | undefined> = {
      accept: 'text/html',
      ...(overrides.headers as Record<string, string | string[] | undefined>),
    };
    return {
      headers,
      path: '/',
      protocol: 'http',
      originalUrl: '/',
      url: '/',
      get: jest.fn((name: string) => {
        if (name.toLowerCase() === 'host') {
          return 'docs.example.com';
        }
        return undefined;
      }),
      ...overrides,
      headers: {
        ...headers,
        ...(overrides.headers as object),
      },
    } as unknown as Request;
  }

  function createRes(): Response & {
    render: jest.Mock;
    redirect: jest.Mock;
    status: jest.Mock;
    setHeader: jest.Mock;
  } {
    const res = {
      render: jest.fn(),
      redirect: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res as unknown as Response & {
      render: jest.Mock;
      redirect: jest.Mock;
      status: jest.Mock;
      setHeader: jest.Mock;
    };
  }

  beforeEach(() => {
    i18n = {
      t: jest.fn((locale: string, key: string) => `${locale}:${key}`),
      get: jest.fn((locale: string, key: string) => ({ locale, key })),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'graphql.path': '/graphql',
          'app.apiPrefix': 'api/v1',
          'app.publicUrl': 'https://wiki.example.com',
          'app.host': 'localhost',
          'app.port': 3000,
        };
        return values[key];
      }),
    };
    service = new WikiRenderService(
      i18n as unknown as WikiI18nService,
      configService as unknown as ConfigService,
    );
  });

  describe('prefersHtml', () => {
    it('returns true for text/html or */* or empty accept', () => {
      expect(service.prefersHtml(createReq({ headers: { accept: 'text/html' } }))).toBe(
        true,
      );
      expect(service.prefersHtml(createReq({ headers: { accept: '*/*' } }))).toBe(
        true,
      );
      expect(service.prefersHtml(createReq({ headers: { accept: '' } }))).toBe(
        true,
      );
      expect(
        service.prefersHtml(createReq({ headers: { accept: undefined } })),
      ).toBe(true);
    });

    it('returns false for application/json without text/html', () => {
      expect(
        service.prefersHtml(
          createReq({ headers: { accept: 'application/json' } }),
        ),
      ).toBe(false);
    });

    it('returns true when accept includes both json and html', () => {
      expect(
        service.prefersHtml(
          createReq({
            headers: { accept: 'application/json, text/html;q=0.9' },
          }),
        ),
      ).toBe(true);
    });

    it('returns false for unrelated accept types', () => {
      expect(
        service.prefersHtml(createReq({ headers: { accept: 'image/png' } })),
      ).toBe(false);
    });
  });

  describe('isInfrastructurePath', () => {
    it('detects api, health, graphql, and swagger paths', () => {
      expect(service.isInfrastructurePath('/api')).toBe(true);
      expect(service.isInfrastructurePath('/api/v1/users')).toBe(true);
      expect(service.isInfrastructurePath('/health')).toBe(true);
      expect(service.isInfrastructurePath('/graphql')).toBe(true);
      expect(service.isInfrastructurePath('/graphql/playground')).toBe(true);
      expect(service.isInfrastructurePath('/swagger')).toBe(true);
      expect(service.isInfrastructurePath('/swagger-json')).toBe(true);
    });

    it('ignores query strings', () => {
      expect(service.isInfrastructurePath('/api/v1/users?x=1')).toBe(true);
      expect(service.isInfrastructurePath('/home?lang=pt-BR')).toBe(false);
    });

    it('uses configured graphql path', () => {
      configService.get.mockImplementation((key: string) =>
        key === 'graphql.path' ? '/gql' : undefined,
      );
      expect(service.isInfrastructurePath('/gql')).toBe(true);
      expect(service.isInfrastructurePath('/graphql')).toBe(false);
    });

    it('returns false for wiki pages', () => {
      expect(service.isInfrastructurePath('/')).toBe(false);
      expect(service.isInfrastructurePath('/auth')).toBe(false);
    });
  });

  describe('shouldRenderWikiNotFound / shouldRenderWikiServerError', () => {
    it('renders wiki errors for html wiki paths', () => {
      const req = createReq({ headers: { accept: 'text/html' } });
      expect(service.shouldRenderWikiNotFound(req, '/missing')).toBe(true);
      expect(service.shouldRenderWikiServerError(req, '/boom')).toBe(true);
    });

    it('skips infrastructure paths', () => {
      const req = createReq({ headers: { accept: 'text/html' } });
      expect(service.shouldRenderWikiNotFound(req, '/api/v1/x')).toBe(false);
      expect(service.shouldRenderWikiServerError(req, '/health')).toBe(false);
    });

    it('skips json clients', () => {
      const req = createReq({ headers: { accept: 'application/json' } });
      expect(service.shouldRenderWikiNotFound(req, '/missing')).toBe(false);
    });
  });

  describe('resolveLocale', () => {
    it('reads locale from cookie', () => {
      const req = createReq({
        headers: {
          cookie: `${WIKI_LOCALE_COOKIE}=pt-BR`,
          'accept-language': 'en',
        },
      });
      expect(service.resolveLocale(req)).toBe('pt-BR');
    });

    it('falls back to Accept-Language', () => {
      const req = createReq({
        headers: { 'accept-language': 'pt-BR' },
      });
      expect(service.resolveLocale(req)).toBe('pt-BR');
    });
  });

  describe('buildLocals', () => {
    it('builds template locals with seo, helpers, and locale switcher', () => {
      const req = createReq({ path: '/auth' });
      const locals = service.buildLocals(req, 'en-US', {
        titleKey: 'auth.meta.title',
        currentPage: 'auth',
        requestPath: '/auth',
      });

      expect(i18n.t).toHaveBeenCalledWith('en-US', 'auth.meta.title');
      expect(locals).toEqual(
        expect.objectContaining({
          locale: 'en-US',
          htmlLang: 'en-US',
          title: 'en-US:auth.meta.title',
          currentPage: 'auth',
          apiBasePath: '/api/v1',
          swaggerPath: '/swagger',
          healthPath: '/health',
          graphqlPath: '/graphql',
        }),
      );
      expect(locals.wikiPath()).toBe('/');
      expect(locals.wikiPath('/auth')).toBe('/auth');
      expect(locals.t('x')).toBe('en-US:x');
      expect(locals.tm('y')).toEqual({ locale: 'en-US', key: 'y' });
      expect(locals.locales).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'en-US',
            active: true,
            href: '?lang=en-US',
          }),
          expect.objectContaining({
            code: 'pt-BR',
            active: false,
            href: '?lang=pt-BR',
          }),
        ]),
      );
      expect(locals.seo.canonicalUrl).toBe('https://wiki.example.com/auth');
      expect(locals.seo.robots).toBe('index, follow');
      expect(locals.seo.og.locale).toBe('en_US');
      expect(locals.seo.og.localeAlternate).toBe('pt_BR');
      expect(locals.seo.description).toBe(WIKI_SEO.pages.auth.description);
    });

    it('sets noindex for error and wsui pages', () => {
      const req = createReq();
      for (const page of ['error-404', 'error-500', 'wsui'] as const) {
        const locals = service.buildLocals(req, 'pt-BR', {
          titleKey: 'x',
          currentPage: page,
        });
        expect(locals.seo.robots).toBe('noindex, nofollow');
        expect(locals.seo.og.locale).toBe('pt_BR');
      }
    });

    it('uses default description when page seo is missing', () => {
      const locals = service.buildLocals(createReq(), 'en-US', {
        titleKey: 'x',
        currentPage: 'unknown-page',
      });
      expect(locals.seo.description).toBe(WIKI_SEO.defaultDescription);
    });

    it('canonicalizes root path with trailing slash', () => {
      const locals = service.buildLocals(createReq({ path: '/' }), 'en-US', {
        titleKey: 'home.meta.title',
        currentPage: 'home',
        requestPath: '/',
      });
      expect(locals.seo.canonicalUrl).toBe('https://wiki.example.com/');
    });

    it('resolves origin from forwarded proto and host when publicUrl unset', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'app.publicUrl') return undefined;
        if (key === 'app.apiPrefix') return 'api/v1';
        if (key === 'graphql.path') return '/graphql';
        return undefined;
      });
      const req = createReq({
        path: '/email',
        headers: { 'x-forwarded-proto': 'https, http' },
      });
      const locals = service.buildLocals(req, 'en-US', {
        titleKey: 'email.meta.title',
        currentPage: 'email',
        requestPath: '/email',
      });
      expect(locals.seo.canonicalUrl).toBe('https://docs.example.com/email');
    });

    it('resolves origin from app.host/port when host header missing', () => {
      configService.get.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'app.publicUrl': undefined,
          'app.host': '127.0.0.1',
          'app.port': 4000,
          'app.apiPrefix': 'api/v1',
          'graphql.path': '/graphql',
        };
        return values[key];
      });
      const req = createReq({
        path: '/x',
        get: jest.fn().mockReturnValue(undefined),
      } as Partial<Request>);
      const locals = service.buildLocals(req, 'en-US', {
        titleKey: 'x',
        currentPage: 'home',
        requestPath: '/x',
      });
      expect(locals.seo.canonicalUrl).toBe('http://127.0.0.1:4000/x');
    });

    it('uses full URL app.host as-is', () => {
      configService.get.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          'app.publicUrl': undefined,
          'app.host': 'https://custom.example/',
          'app.port': 3000,
          'app.apiPrefix': 'api/v1',
          'graphql.path': '/graphql',
        };
        return values[key];
      });
      const req = createReq({
        get: jest.fn().mockReturnValue(undefined),
      } as Partial<Request>);
      const locals = service.buildLocals(req, 'en-US', {
        titleKey: 'x',
        currentPage: 'home',
        requestPath: '/y',
      });
      expect(locals.seo.canonicalUrl).toBe('https://custom.example/y');
    });
  });

  describe('renderPage', () => {
    it('sets locale cookie and redirects when lang query is valid', () => {
      const req = createReq({ path: '/auth' });
      const res = createRes();

      service.renderPage(req, res, 'pt-BR', 'pages/auth', 'auth', 'auth');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        buildWikiLocaleCookie('pt-BR'),
      );
      expect(res.redirect).toHaveBeenCalledWith(302, '/auth');
      expect(res.render).not.toHaveBeenCalled();
    });

    it('renders the view with locals when lang is absent/invalid', () => {
      const req = createReq({ path: '/auth' });
      const res = createRes();

      service.renderPage(req, res, 'fr-FR', 'pages/auth', 'auth', 'auth');

      expect(res.redirect).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        'pages/auth',
        expect.objectContaining({
          currentPage: 'auth',
          title: 'en-US:auth.meta.title',
        }),
      );
    });
  });

  describe('renderNotFound', () => {
    it('renders 404 page with status and request path', () => {
      const req = createReq({ originalUrl: '/missing?x=1', url: '/missing' });
      const res = createRes();

      service.renderNotFound(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        'pages/error-404',
        expect.objectContaining({
          currentPage: 'error-404',
          statusCode: 404,
          requestPath: '/missing?x=1',
        }),
      );
    });
  });

  describe('renderServerError', () => {
    it('renders 500 page with status and request path', () => {
      const req = createReq({ originalUrl: '/boom', url: '/boom' });
      const res = createRes();

      service.renderServerError(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        'pages/error-500',
        expect.objectContaining({
          currentPage: 'error-500',
          statusCode: 500,
          requestPath: '/boom',
        }),
      );
    });
  });
});
