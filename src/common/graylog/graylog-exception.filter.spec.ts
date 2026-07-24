import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { WikiRenderService } from '../../wiki/wiki-render.service';
import { GraylogExceptionFilter } from './graylog-exception.filter';
import { GraylogService } from './graylog.service';

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

function createHost(
  requestOverrides: Partial<Request> = {},
  responseOverrides: Partial<MockResponse> = {},
): {
  host: ArgumentsHost;
  request: Request;
  response: MockResponse;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = {
    status,
    json,
    ...responseOverrides,
  };

  const request = {
    url: '/api/users',
    originalUrl: '/api/users',
    method: 'GET',
    body: { q: 1 },
    query: { page: '1' },
    params: { id: '42' },
    headers: {
      'user-agent': 'jest',
      host: 'localhost',
      authorization: 'Bearer secret',
      cookie: 'session=abc',
      'x-custom': 'drop-me',
    },
    ...requestOverrides,
  } as unknown as Request;

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response as unknown as Response,
    }),
  } as unknown as ArgumentsHost;

  return { host, request, response };
}

describe('GraylogExceptionFilter', () => {
  let filter: GraylogExceptionFilter;
  let graylogService: { error: jest.Mock };
  let wikiRender: {
    shouldRenderWikiNotFound: jest.Mock;
    shouldRenderWikiServerError: jest.Mock;
    renderNotFound: jest.Mock;
    renderServerError: jest.Mock;
  };

  beforeEach(() => {
    graylogService = { error: jest.fn() };
    wikiRender = {
      shouldRenderWikiNotFound: jest.fn().mockReturnValue(false),
      shouldRenderWikiServerError: jest.fn().mockReturnValue(false),
      renderNotFound: jest.fn(),
      renderServerError: jest.fn(),
    };
    filter = new GraylogExceptionFilter(
      graylogService as unknown as GraylogService,
      wikiRender as unknown as WikiRenderService,
    );
  });

  describe('status and message resolution', () => {
    it('uses HttpException status and message', () => {
      const { host, response } = createHost();
      filter.catch(new BadRequestException('bad input'), host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          path: '/api/users',
          message: 'bad input',
        }),
      );
      expect(typeof (response.json.mock.calls[0][0] as { timestamp: string }).timestamp).toBe(
        'string',
      );
    });

    it('defaults plain Error to 500 with Error.message', () => {
      const { host, response } = createHost();
      filter.catch(new Error('unexpected'), host);

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'unexpected',
        }),
      );
    });

    it('defaults non-Error exceptions to Internal server error', () => {
      const { host, response } = createHost();
      filter.catch('string-failure', host);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('graylog logging', () => {
    it('always logs via graylogService.error with request context and safe headers', () => {
      const { host } = createHost();
      const err = new NotFoundException('missing');
      filter.catch(err, host);

      expect(graylogService.error).toHaveBeenCalledWith(err, {
        path: '/api/users',
        method: 'GET',
        body: { q: 1 },
        query: { page: '1' },
        params: { id: '42' },
        status: HttpStatus.NOT_FOUND,
        headers: {
          'user-agent': 'jest',
          host: 'localhost',
          authorization: '[PRESENT]',
        },
      });
    });

    it('passes string message to error when exception is not an Error', () => {
      const { host } = createHost();
      filter.catch(42, host);

      expect(graylogService.error).toHaveBeenCalledWith(
        'Internal server error',
        expect.objectContaining({ status: 500 }),
      );
    });

    it('omits non-whitelisted headers and marks authorization as present', () => {
      const { host } = createHost({
        headers: {
          authorization: 'Bearer x',
          cookie: 'secret',
          'content-type': 'application/json',
          'x-request-id': 'req-1',
          'x-custom': 'nope',
        },
      } as Partial<Request>);

      filter.catch(new Error('x'), host);

      const [, ctx] = graylogService.error.mock.calls[0] as [
        unknown,
        { headers: Record<string, string> },
      ];
      expect(ctx.headers).toEqual({
        'content-type': 'application/json',
        'x-request-id': 'req-1',
        authorization: '[PRESENT]',
      });
      expect(ctx.headers.cookie).toBeUndefined();
      expect(ctx.headers['x-custom']).toBeUndefined();
    });

    it('omits authorization key when header is absent', () => {
      const { host } = createHost({
        headers: {
          host: 'localhost',
          'user-agent': 'jest',
        },
      } as Partial<Request>);

      filter.catch(new Error('x'), host);

      const [, ctx] = graylogService.error.mock.calls[0] as [
        unknown,
        { headers: Record<string, string> },
      ];
      expect(ctx.headers).toEqual({
        host: 'localhost',
        'user-agent': 'jest',
      });
      expect(ctx.headers.authorization).toBeUndefined();
    });
  });

  describe('wiki vs JSON responses', () => {
    it('renders wiki not-found and skips JSON when wiki says so', () => {
      wikiRender.shouldRenderWikiNotFound.mockReturnValue(true);
      const { host, request, response } = createHost({
        originalUrl: '/docs/missing',
      } as Partial<Request>);

      filter.catch(new NotFoundException(), host);

      expect(wikiRender.renderNotFound).toHaveBeenCalledWith(
        request,
        response,
      );
      expect(response.status).not.toHaveBeenCalled();
      expect(response.json).not.toHaveBeenCalled();
      expect(wikiRender.renderServerError).not.toHaveBeenCalled();
    });

    it('renders wiki server-error and skips JSON when wiki says so', () => {
      wikiRender.shouldRenderWikiServerError.mockReturnValue(true);
      const { host, request, response } = createHost({
        originalUrl: '/docs',
      } as Partial<Request>);

      filter.catch(new Error('crash'), host);

      expect(wikiRender.renderServerError).toHaveBeenCalledWith(
        request,
        response,
      );
      expect(response.status).not.toHaveBeenCalled();
      expect(response.json).not.toHaveBeenCalled();
    });

    it('falls back to JSON when wiki flags are false', () => {
      const { host, response } = createHost();
      filter.catch(new NotFoundException('gone'), host);

      expect(wikiRender.renderNotFound).not.toHaveBeenCalled();
      expect(wikiRender.renderServerError).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(response.json).toHaveBeenCalled();
    });

    it('uses request.url when originalUrl is missing for wiki path checks', () => {
      wikiRender.shouldRenderWikiNotFound.mockReturnValue(true);
      const { host, request } = createHost({
        url: '/wiki-page',
        originalUrl: undefined,
      } as Partial<Request>);

      filter.catch(new NotFoundException(), host);

      expect(wikiRender.shouldRenderWikiNotFound).toHaveBeenCalledWith(
        request,
        '/wiki-page',
      );
    });
  });
});
