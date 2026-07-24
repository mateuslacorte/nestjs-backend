import { HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { CatchAllController } from './catchall.controller';
import { SecurityService } from './security.service';
import { WikiRenderService } from '../../wiki/wiki-render.service';

jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

type MockRes = {
  status: jest.Mock;
  json: jest.Mock;
};

function createRes(): MockRes {
  const res: MockRes = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function createReq(
  overrides: Partial<{
    originalUrl: string;
    url: string;
    ip: string;
    headers: Record<string, string | string[] | undefined>;
    socket: { remoteAddress?: string };
  }> = {},
): Request {
  return {
    originalUrl: overrides.originalUrl ?? '/unknown',
    url: overrides.url ?? '/unknown',
    ip: overrides.ip,
    headers: overrides.headers ?? {},
    socket: overrides.socket ?? {},
  } as unknown as Request;
}

describe('CatchAllController', () => {
  let securityService: { registerInvalidRouteAttempt: jest.Mock };
  let wikiRender: {
    shouldRenderWikiNotFound: jest.Mock;
    renderNotFound: jest.Mock;
  };
  let controller: CatchAllController;
  let warnSpy: jest.SpyInstance;
  const originalGraphqlPath = process.env.GRAPHQL_PATH;

  beforeEach(() => {
    securityService = {
      registerInvalidRouteAttempt: jest.fn().mockResolvedValue({
        blocked: false,
        attempts: 1,
      }),
    };
    wikiRender = {
      shouldRenderWikiNotFound: jest.fn().mockReturnValue(false),
      renderNotFound: jest.fn(),
    };
    controller = new CatchAllController(
      securityService as unknown as SecurityService,
      wikiRender as unknown as WikiRenderService,
    );
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    delete process.env.GRAPHQL_PATH;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    if (originalGraphqlPath === undefined) {
      delete process.env.GRAPHQL_PATH;
    } else {
      process.env.GRAPHQL_PATH = originalGraphqlPath;
    }
  });

  describe('handleNotFound', () => {
    it('delegates GraphQL path to next()', async () => {
      const req = createReq({ originalUrl: '/graphql?query=1' });
      const res = createRes();
      const next = jest.fn() as NextFunction;

      await controller.handleNotFound(req, res as unknown as Response, next);

      expect(next).toHaveBeenCalled();
      expect(securityService.registerInvalidRouteAttempt).not.toHaveBeenCalled();
    });

    it('respects custom GRAPHQL_PATH', async () => {
      process.env.GRAPHQL_PATH = '/api/gql';
      const req = createReq({ originalUrl: '/api/gql' });
      const res = createRes();
      const next = jest.fn() as NextFunction;

      await controller.handleNotFound(req, res as unknown as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('renders wiki 404 without registering an attempt', async () => {
      wikiRender.shouldRenderWikiNotFound.mockReturnValue(true);
      const req = createReq({ originalUrl: '/wiki/missing' });
      const res = createRes();
      const next = jest.fn() as NextFunction;

      await controller.handleNotFound(req, res as unknown as Response, next);

      expect(wikiRender.renderNotFound).toHaveBeenCalledWith(req, res);
      expect(securityService.registerInvalidRouteAttempt).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it.each([
      '/favicon.ico',
      '/favicon.svg',
      '/favicon-96x96.png',
      '/apple-touch-icon.png',
      '/site.webmanifest',
      '/web-app-manifest-192x192.png',
      '/web-app-manifest-512x512.png',
      '/robots.txt',
      '/health',
      '/HEALTH',
      '/robots.txt?x=1',
    ])('returns 404 without registering for ignored path %s', async (path) => {
      const req = createReq({ originalUrl: path });
      const res = createRes();
      const next = jest.fn() as NextFunction;

      await controller.handleNotFound(req, res as unknown as Response, next);

      expect(securityService.registerInvalidRouteAttempt).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Rota não encontrada',
          path,
          timestamp: expect.any(String),
        }),
      );
    });

    it('registers an attempt and returns 404 when not blocked', async () => {
      const req = createReq({
        originalUrl: '/admin/secret',
        headers: { 'user-agent': 'curl/8.0' },
        ip: '10.0.0.5',
      });
      const res = createRes();
      const next = jest.fn() as NextFunction;

      await controller.handleNotFound(req, res as unknown as Response, next);

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '10.0.0.5',
        '/admin/secret',
        'curl/8.0',
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('returns 403 and warns when the IP is blocked', async () => {
      securityService.registerInvalidRouteAttempt.mockResolvedValue({
        blocked: true,
        attempts: 2,
      });
      const req = createReq({
        originalUrl: '/hack',
        ip: '1.2.3.4',
      });
      const res = createRes();
      const next = jest.fn() as NextFunction;

      await controller.handleNotFound(req, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message:
            'Acesso bloqueado. Seu IP foi registrado por comportamento suspeito.',
          timestamp: expect.any(String),
        }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] Acesso bloqueado para IP 1.2.3.4'),
      );
    });

    it('falls back to req.url when originalUrl is missing', async () => {
      const req = createReq({
        originalUrl: undefined as unknown as string,
        url: '/fallback-path',
        ip: '127.0.0.1',
      });
      // Force originalUrl falsy
      (req as { originalUrl?: string }).originalUrl = '';
      const res = createRes();
      const next = jest.fn() as NextFunction;

      await controller.handleNotFound(req, res as unknown as Response, next);

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '127.0.0.1',
        '/fallback-path',
        undefined,
      );
    });
  });

  describe('getClientIp', () => {
    it('uses the first x-forwarded-for value (string)', async () => {
      const req = createReq({
        originalUrl: '/probe',
        headers: { 'x-forwarded-for': ' 9.9.9.9, 8.8.8.8 ' },
      });
      const res = createRes();

      await controller.handleNotFound(
        req,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '9.9.9.9',
        '/probe',
        undefined,
      );
    });

    it('uses the first x-forwarded-for value (array)', async () => {
      const req = createReq({
        originalUrl: '/probe',
        headers: { 'x-forwarded-for': ['2.2.2.2', '3.3.3.3'] },
      });
      const res = createRes();

      await controller.handleNotFound(
        req,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '2.2.2.2',
        '/probe',
        undefined,
      );
    });

    it('falls back to x-real-ip string', async () => {
      const req = createReq({
        originalUrl: '/probe',
        headers: { 'x-real-ip': '4.4.4.4' },
      });
      const res = createRes();

      await controller.handleNotFound(
        req,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '4.4.4.4',
        '/probe',
        undefined,
      );
    });

    it('falls back to first x-real-ip when header is an array', async () => {
      const req = createReq({
        originalUrl: '/probe',
        headers: { 'x-real-ip': ['5.5.5.5', '6.6.6.6'] },
      });
      const res = createRes();

      await controller.handleNotFound(
        req,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '5.5.5.5',
        '/probe',
        undefined,
      );
    });

    it('falls back to req.ip', async () => {
      const req = createReq({
        originalUrl: '/probe',
        ip: '7.7.7.7',
      });
      const res = createRes();

      await controller.handleNotFound(
        req,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '7.7.7.7',
        '/probe',
        undefined,
      );
    });

    it('falls back to socket.remoteAddress', async () => {
      const req = createReq({
        originalUrl: '/probe',
        ip: undefined,
        socket: { remoteAddress: '::1' },
      });
      const res = createRes();

      await controller.handleNotFound(
        req,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '::1',
        '/probe',
        undefined,
      );
    });

    it('returns unknown when no IP source is available', async () => {
      const req = createReq({
        originalUrl: '/probe',
        ip: undefined,
        socket: {},
      });
      const res = createRes();

      await controller.handleNotFound(
        req,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        'unknown',
        '/probe',
        undefined,
      );
    });
  });
});
