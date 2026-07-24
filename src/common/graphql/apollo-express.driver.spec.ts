import { HttpStatus } from '@nestjs/common';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { GraphQLSchema } from 'graphql';
import { ApolloExpressDriver } from './apollo-express.driver';
import { ApolloExpressDriverConfig } from './apollo-express-driver.config';

type MockExpressAdapter = {
  getType: jest.Mock;
  use: jest.Mock;
  getHttpServer: jest.Mock;
  getInstance: jest.Mock;
};

type MockApp = {
  use: jest.Mock;
};

const mockApolloInstances: Array<{
  options: Record<string, unknown>;
  start: jest.Mock;
  stop: jest.Mock;
}> = [];

jest.mock('@apollo/server', () => {
  const ApolloServer = jest.fn().mockImplementation(function (
    this: {
      options: Record<string, unknown>;
      start: jest.Mock;
      stop: jest.Mock;
    },
    options: Record<string, unknown>,
  ) {
    this.options = options;
    this.start = jest.fn().mockResolvedValue(undefined);
    this.stop = jest.fn().mockResolvedValue(undefined);
    mockApolloInstances.push(this);
    return this;
  });

  return { ApolloServer };
});

jest.mock('@apollo/server/plugin/drainHttpServer', () => ({
  ApolloServerPluginDrainHttpServer: jest.fn(() => ({
    __plugin: 'drainHttpServer',
  })),
}));

jest.mock('@apollo/server/plugin/landingPage/default', () => ({
  ApolloServerPluginLandingPageLocalDefault: jest.fn(() => ({
    __plugin: 'landingEnabled',
  })),
}));

jest.mock('@apollo/server/plugin/disabled', () => ({
  ApolloServerPluginLandingPageDisabled: jest.fn(() => ({
    __plugin: 'landingDisabled',
  })),
}));

jest.mock('@as-integrations/express5', () => ({
  expressMiddleware: jest.fn(() => 'express-middleware'),
}));

jest.mock('cors', () => jest.fn(() => 'cors-middleware'));

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';

const MockApolloServer = ApolloServer as unknown as jest.Mock;
const mockExpressMiddleware = expressMiddleware as unknown as jest.Mock;
const mockCors = cors as unknown as jest.Mock;

function createExpressAdapter(
  overrides: Partial<MockExpressAdapter> = {},
): MockExpressAdapter & { app: MockApp } {
  const app: MockApp = { use: jest.fn() };
  return {
    getType: jest.fn().mockReturnValue('express'),
    use: jest.fn(),
    getHttpServer: jest.fn().mockReturnValue({ __httpServer: true }),
    getInstance: jest.fn().mockReturnValue(app),
    app,
    ...overrides,
  };
}

function createDriver(
  httpAdapter = createExpressAdapter(),
): ApolloExpressDriver {
  const driver = Object.create(
    ApolloExpressDriver.prototype,
  ) as ApolloExpressDriver;
  Object.defineProperty(driver, 'httpAdapterHost', {
    value: { httpAdapter },
    configurable: true,
  });
  Object.defineProperty(driver, 'applicationConfig', {
    value: undefined,
    configurable: true,
  });
  return driver;
}

function createHttpException(
  status: number,
  message = 'http error',
  response: Record<string, unknown> = { statusCode: status, message },
) {
  return {
    status,
    message,
    response: { statusCode: status, ...response },
  };
}

function findPlugin(
  plugins: unknown[] | undefined,
  name: string,
): Record<string, unknown> | undefined {
  return (plugins ?? []).find(
    (plugin) =>
      plugin &&
      typeof plugin === 'object' &&
      (plugin as { __plugin?: string }).__plugin === name,
  ) as Record<string, unknown> | undefined;
}

function findPreservePlugin(
  plugins: unknown[] | undefined,
): {
  requestDidStart: () => Promise<{
    willSendResponse: (ctx: unknown) => Promise<void>;
  }>;
} | undefined {
  return (plugins ?? []).find(
    (plugin) =>
      plugin &&
      typeof plugin === 'object' &&
      typeof (plugin as { requestDidStart?: unknown }).requestDidStart ===
        'function' &&
      !(plugin as { __plugin?: string }).__plugin,
  ) as
    | {
        requestDidStart: () => Promise<{
          willSendResponse: (ctx: unknown) => Promise<void>;
        }>;
      }
    | undefined;
}

describe('ApolloExpressDriver', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let driver: ApolloExpressDriver;
  let adapter: ReturnType<typeof createExpressAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApolloInstances.length = 0;
    process.env.NODE_ENV = 'test';
    adapter = createExpressAdapter();
    driver = createDriver(adapter);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('mergeDefaultOptions — sandbox / NODE_ENV', () => {
    it('enables sandbox landing plugin when playground is true', async () => {
      const merged = await driver.mergeDefaultOptions({ playground: true });

      expect(ApolloServerPluginLandingPageLocalDefault).toHaveBeenCalledWith({
        embed: true,
      });
      expect(findPlugin(merged.plugins, 'landingEnabled')).toBeDefined();
      expect(findPlugin(merged.plugins, 'landingDisabled')).toBeUndefined();
    });

    it('disables sandbox landing plugin when playground is false', async () => {
      const merged = await driver.mergeDefaultOptions({ playground: false });

      expect(ApolloServerPluginLandingPageDisabled).toHaveBeenCalled();
      expect(findPlugin(merged.plugins, 'landingDisabled')).toBeDefined();
      expect(findPlugin(merged.plugins, 'landingEnabled')).toBeUndefined();
    });

    it('enables sandbox when playground is undefined and NODE_ENV is not production', async () => {
      process.env.NODE_ENV = 'development';
      const merged = await driver.mergeDefaultOptions({});

      expect(findPlugin(merged.plugins, 'landingEnabled')).toBeDefined();
    });

    it('disables sandbox when playground is undefined and NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      const merged = await driver.mergeDefaultOptions({});

      expect(findPlugin(merged.plugins, 'landingDisabled')).toBeDefined();
    });

    it('defaults path to /graphql when omitted', async () => {
      const merged = await driver.mergeDefaultOptions({});
      expect(merged.path).toBe('/graphql');
    });

    it('preserves an explicit path', async () => {
      const merged = await driver.mergeDefaultOptions({ path: '/api/graphql' });
      expect(merged.path).toBe('/api/graphql');
    });
  });

  describe('preserve HTTP status plugin', () => {
    it('adds preserve plugin by default', async () => {
      const merged = await driver.mergeDefaultOptions({});
      expect(findPreservePlugin(merged.plugins)).toBeDefined();
    });

    it('adds preserve plugin when preserveHttpStatusForExecutionErrors is true', async () => {
      const merged = await driver.mergeDefaultOptions({
        preserveHttpStatusForExecutionErrors: true,
      });
      expect(findPreservePlugin(merged.plugins)).toBeDefined();
    });

    it('omits preserve plugin when preserveHttpStatusForExecutionErrors is false', async () => {
      const merged = await driver.mergeDefaultOptions({
        preserveHttpStatusForExecutionErrors: false,
      });
      expect(findPreservePlugin(merged.plugins)).toBeUndefined();
    });

    it('sets http.status to 200 when single result includes data', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const plugin = findPreservePlugin(merged.plugins);
      const hooks = await plugin!.requestDidStart();
      const response = {
        body: { kind: 'single', singleResult: { data: { ok: true } } },
        http: { status: 400 },
      };

      await hooks.willSendResponse({ response });
      expect(response.http.status).toBe(200);
    });

    it('does not change status when single result has no data', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const plugin = findPreservePlugin(merged.plugins);
      const hooks = await plugin!.requestDidStart();
      const response = {
        body: { kind: 'single', singleResult: { errors: [] } },
        http: { status: 400 },
      };

      await hooks.willSendResponse({ response });
      expect(response.http.status).toBe(400);
    });

    it('does not change status when response.http is missing', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const plugin = findPreservePlugin(merged.plugins);
      const hooks = await plugin!.requestDidStart();
      const response = {
        body: { kind: 'single', singleResult: { data: {} } },
      };

      await hooks.willSendResponse({ response });
      expect(response).not.toHaveProperty('http');
    });

    it('does not change status when body kind is not single', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const plugin = findPreservePlugin(merged.plugins);
      const hooks = await plugin!.requestDidStart();
      const response = {
        body: { kind: 'incremental', singleResult: { data: {} } },
        http: { status: 400 },
      };

      await hooks.willSendResponse({ response });
      expect(response.http.status).toBe(400);
    });
  });

  describe('formatError / HTTP exception transform', () => {
    const baseFormatted = {
      message: 'formatted',
      extensions: { code: 'ORIGINAL' },
    };

    it('leaves non-HTTP exceptions unchanged', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const result = merged.formatError!(baseFormatted, new Error('plain'));
      expect(result).toEqual(baseFormatted);
    });

    it.each([
      [HttpStatus.BAD_REQUEST, ApolloServerErrorCode.BAD_REQUEST],
      [HttpStatus.UNPROCESSABLE_ENTITY, ApolloServerErrorCode.BAD_USER_INPUT],
      [HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED'],
      [HttpStatus.FORBIDDEN, 'FORBIDDEN'],
    ] as const)(
      'maps HTTP %i to Apollo code %s',
      async (status, code) => {
        const merged = await driver.mergeDefaultOptions({});
        const exception = createHttpException(status, `status-${status}`);

        const result = merged.formatError!(baseFormatted, exception);

        expect(result.message).toBe(`status-${status}`);
        expect(result.extensions).toEqual(
          expect.objectContaining({
            code,
            originalError: exception.response,
          }),
        );
        expect(result.extensions).not.toHaveProperty('status');
      },
    );

    it('maps unknown HTTP status to INTERNAL_SERVER_ERROR with extensions.status', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const exception = createHttpException(HttpStatus.NOT_FOUND, 'missing');

      const result = merged.formatError!(baseFormatted, exception);

      expect(result.extensions).toEqual(
        expect.objectContaining({
          code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
          status: HttpStatus.NOT_FOUND,
          originalError: exception.response,
        }),
      );
    });

    it('falls back to formatted message when exception message is missing', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const exception = {
        status: 400,
        response: { statusCode: 400 },
      };

      const result = merged.formatError!(baseFormatted, exception);
      expect(result.message).toBe('formatted');
    });

    it('composes with a custom formatError that receives the transformed error', async () => {
      const custom = jest.fn((formatted) => ({
        ...formatted,
        message: `custom:${formatted.message}`,
      }));

      const merged = await driver.mergeDefaultOptions({
        formatError: custom,
      });
      const exception = createHttpException(400, 'bad');

      const result = merged.formatError!(baseFormatted, exception);

      expect(custom).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'bad',
          extensions: expect.objectContaining({
            code: ApolloServerErrorCode.BAD_REQUEST,
          }),
        }),
        exception,
      );
      expect(result.message).toBe('custom:bad');
    });

    it('does not install formatError when autoTransformHttpErrors is false', async () => {
      const merged = await driver.mergeDefaultOptions({
        autoTransformHttpErrors: false,
      });
      expect(merged.formatError).toBeUndefined();
    });

    it('does not treat errors missing status or statusCode as HTTP exceptions', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const result = merged.formatError!(baseFormatted, {
        response: { statusCode: 400 },
      });
      expect(result).toEqual(baseFormatted);
    });
  });

  describe('context wrapping / assignReqProperty', () => {
    it('defaults context to { req } from request-like arg', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const req = { headers: {} };
      await expect(merged.context!({ req })).resolves.toEqual({ req });
    });

    it('defaults context to the raw arg when req is absent', async () => {
      const merged = await driver.mergeDefaultOptions({});
      const request = { id: 'raw' };
      await expect(merged.context!(request)).resolves.toEqual({
        req: request,
      });
    });

    it('wraps a function context and assigns req when missing', async () => {
      const merged = await driver.mergeDefaultOptions({
        context: async () => ({ userId: 1 }),
      });
      const req = { id: 'r1' };

      await expect(merged.context!({ req })).resolves.toEqual({
        userId: 1,
        req,
      });
    });

    it('wraps a function context using the whole arg when req is absent', async () => {
      const merged = await driver.mergeDefaultOptions({
        context: async () => ({ userId: 1 }),
      });
      const raw = { id: 'raw' };

      await expect(merged.context!(raw)).resolves.toEqual({
        userId: 1,
        req: raw,
      });
    });

    it('leaves an existing object req on function context results', async () => {
      const existingReq = { id: 'existing' };
      const merged = await driver.mergeDefaultOptions({
        context: async () => ({ req: existingReq, userId: 2 }),
      });

      await expect(
        merged.context!({ req: { id: 'incoming' } }),
      ).resolves.toEqual({
        req: existingReq,
        userId: 2,
      });
    });

    it('wraps an object context and assigns req', async () => {
      const merged = await driver.mergeDefaultOptions({
        context: { role: 'admin' },
      });
      const req = { id: 'r2' };

      await expect(merged.context!({ req })).resolves.toEqual({
        role: 'admin',
        req,
      });
    });

    it('wraps an object context using the whole arg when req is absent', async () => {
      const merged = await driver.mergeDefaultOptions({
        context: { role: 'admin' },
      });
      const raw = { id: 'raw' };

      await expect(merged.context!(raw)).resolves.toEqual({
        role: 'admin',
        req: raw,
      });
    });

    it('returns { req } when function context resolves to a falsy value', async () => {
      const merged = await driver.mergeDefaultOptions({
        context: async () => null,
      });
      const req = { id: 'r3' };

      await expect(merged.context!({ req })).resolves.toEqual({ req });
    });

    it('returns non-object context values as-is', async () => {
      const merged = await driver.mergeDefaultOptions({
        context: async () => 'string-ctx',
      });

      await expect(merged.context!({ req: { id: 1 } })).resolves.toBe(
        'string-ctx',
      );
    });
  });

  describe('start / stop / instance', () => {
    const schema = {} as GraphQLSchema;

    it('throws when http adapter is not express', async () => {
      adapter.getType.mockReturnValue('fastify');

      await expect(
        driver.start({ path: '/graphql', schema }),
      ).rejects.toThrow(
        'ApolloExpressDriver only supports Express (got: fastify)',
      );
    });

    it('throws when schema is missing', async () => {
      await expect(driver.start({ path: '/graphql' })).rejects.toThrow(
        'ApolloExpressDriver requires a GraphQL schema',
      );
    });

    it('starts Apollo Server, mounts middleware, and exposes instance', async () => {
      const options: ApolloExpressDriverConfig = {
        path: '/graphql',
        schema,
        introspection: true,
        cors: { origin: true },
        context: async ({ req }: { req: unknown }) => ({ req }),
        plugins: [{ __plugin: 'custom' } as never],
      };

      await driver.start(options);

      expect(MockApolloServer).toHaveBeenCalledTimes(1);
      const ctorOptions = MockApolloServer.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(ctorOptions.schema).toBe(schema);
      expect(ctorOptions.introspection).toBe(true);
      expect(ctorOptions.path).toBeUndefined();
      expect(ctorOptions.playground).toBeUndefined();
      expect(ctorOptions.cors).toBeUndefined();
      expect(ctorOptions.context).toBeUndefined();
      expect(ctorOptions.plugins).toEqual(
        expect.arrayContaining([
          { __plugin: 'custom' },
          { __plugin: 'drainHttpServer' },
        ]),
      );

      expect(adapter.use).toHaveBeenCalledWith(
        '/graphql',
        expect.any(Function),
      );
      expect(mockCors).toHaveBeenCalledWith({ origin: true });
      expect(adapter.app.use).toHaveBeenCalledWith(
        '/graphql',
        'cors-middleware',
      );
      expect(mockExpressMiddleware).toHaveBeenCalledWith(
        mockApolloInstances[0],
        expect.objectContaining({ context: options.context }),
      );
      expect(adapter.app.use).toHaveBeenCalledWith(
        '/graphql',
        'express-middleware',
      );
      expect(driver.instance).toBe(mockApolloInstances[0]);
    });

    it('skips cors middleware when cors option is absent', async () => {
      await driver.start({ path: '/graphql', schema });

      expect(mockCors).not.toHaveBeenCalled();
      expect(adapter.app.use).toHaveBeenCalledTimes(1);
      expect(adapter.app.use).toHaveBeenCalledWith(
        '/graphql',
        'express-middleware',
      );
    });

    it('body middleware initializes undefined body to {} and calls next', async () => {
      await driver.start({ path: '/graphql', schema });
      const bodyMw = adapter.use.mock.calls[0][1] as (
        req: { body?: unknown },
        res: unknown,
        next: () => void,
      ) => void;
      const next = jest.fn();
      const req: { body?: unknown } = {};

      bodyMw(req, {}, next);
      expect(req.body).toEqual({});
      expect(next).toHaveBeenCalled();
    });

    it('body middleware leaves an existing body untouched', async () => {
      await driver.start({ path: '/graphql', schema });
      const bodyMw = adapter.use.mock.calls[0][1] as (
        req: { body?: unknown },
        res: unknown,
        next: () => void,
      ) => void;
      const next = jest.fn();
      const req = { body: { query: '{ hi }' } };

      bodyMw(req, {}, next);
      expect(req.body).toEqual({ query: '{ hi }' });
      expect(next).toHaveBeenCalled();
    });

    it('omits Nest-only keys and undefined Apollo values from server options', async () => {
      await driver.start({
        path: '/graphql',
        schema,
        playground: true,
        autoTransformHttpErrors: true,
        preserveHttpStatusForExecutionErrors: true,
        introspection: true,
        includeStacktraceInErrorResponses: undefined,
      });

      const ctorOptions = MockApolloServer.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(ctorOptions).not.toHaveProperty('path');
      expect(ctorOptions).not.toHaveProperty('playground');
      expect(ctorOptions).not.toHaveProperty('autoTransformHttpErrors');
      expect(ctorOptions).not.toHaveProperty(
        'preserveHttpStatusForExecutionErrors',
      );
      expect(ctorOptions).not.toHaveProperty(
        'includeStacktraceInErrorResponses',
      );
      expect(ctorOptions.introspection).toBe(true);
    });

    it('stop calls apolloServer.stop after start', async () => {
      await driver.start({ path: '/graphql', schema });
      await driver.stop();
      expect(mockApolloInstances[0].stop).toHaveBeenCalledTimes(1);
    });

    it('stop is a no-op when server was never started', async () => {
      await expect(driver.stop()).resolves.toBeUndefined();
      expect(driver.instance).toBeUndefined();
    });
  });
});
