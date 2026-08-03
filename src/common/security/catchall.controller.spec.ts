import { HttpStatus } from '@nestjs/common';
import { AppRequest, AppReply } from '@common/http/app-http';
import { CatchAllController } from './catchall.controller';
import { SecurityService } from './security.service';
import { WikiRenderService } from '../../wiki/wiki-render.service';

jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

type MockReply = {
  status: jest.Mock;
  send: jest.Mock;
};

function createReply(): MockReply {
  const reply: MockReply = {
    status: jest.fn(),
    send: jest.fn(),
  };
  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply;
}

function createReq(
  overrides: Partial<{
    originalUrl: string;
    url: string;
    ip: string;
    headers: Record<string, string | string[] | undefined>;
    socket: { remoteAddress?: string };
  }> = {},
): AppRequest {
  return {
    originalUrl: overrides.originalUrl ?? '/unknown',
    url: overrides.url ?? '/unknown',
    ip: overrides.ip,
    headers: overrides.headers ?? {},
    socket: overrides.socket ?? {},
  } as unknown as AppRequest;
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
      renderNotFound: jest.fn().mockResolvedValue(undefined),
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
    it('renders wiki 404 without registering an attempt', async () => {
      wikiRender.shouldRenderWikiNotFound.mockReturnValue(true);
      const req = createReq({ originalUrl: '/wiki/missing' });
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

      expect(wikiRender.renderNotFound).toHaveBeenCalledWith(req, reply);
      expect(securityService.registerInvalidRouteAttempt).not.toHaveBeenCalled();
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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

      expect(securityService.registerInvalidRouteAttempt).not.toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Route not found',
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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        '10.0.0.5',
        '/admin/secret',
        'curl/8.0',
      );
      expect(reply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

      expect(reply.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message:
            'Access blocked. Your IP was flagged for suspicious behavior.',
          timestamp: expect.any(String),
        }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] Access blocked for IP 1.2.3.4'),
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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

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
      const reply = createReply();

      await controller.handleNotFound(req, reply as unknown as AppReply);

      expect(securityService.registerInvalidRouteAttempt).toHaveBeenCalledWith(
        'unknown',
        '/probe',
        undefined,
      );
    });
  });
});
