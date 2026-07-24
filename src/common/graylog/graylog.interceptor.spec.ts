import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { NO_LOG_KEY } from './decorators/no-log.decorator';
import { GraylogInterceptor } from './graylog.interceptor';
import { GraylogService } from './graylog.service';

function createExecutionContext(
  overrides: {
    noLog?: boolean;
    method?: string;
    url?: string;
    body?: unknown;
    query?: unknown;
    params?: unknown;
    headers?: Record<string, string | undefined>;
    ip?: string;
    statusCode?: number;
  } = {},
): ExecutionContext {
  const request = {
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/api/users',
    body: overrides.body ?? { name: 'Ada' },
    query: overrides.query ?? { page: '1' },
    params: overrides.params ?? { id: '1' },
    headers: overrides.headers ?? { 'user-agent': 'jest' },
    ip: overrides.ip,
  };

  const response = {
    statusCode: overrides.statusCode ?? 200,
  };

  const handler = jest.fn();
  const klass = jest.fn();

  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('GraylogInterceptor', () => {
  let interceptor: GraylogInterceptor;
  let graylogService: { log: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    graylogService = { log: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    interceptor = new GraylogInterceptor(
      graylogService as unknown as GraylogService,
      reflector as unknown as Reflector,
    );
  });

  it('skips logging when @NoLog metadata is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createExecutionContext();
    const next: CallHandler = { handle: () => of({ ok: true }) };

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({ ok: true });
    expect(graylogService.log).not.toHaveBeenCalled();
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(NO_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('logs request and response on successful handle', async () => {
    const context = createExecutionContext({
      method: 'POST',
      url: '/api/items',
      statusCode: 201,
      headers: { 'user-agent': 'Mozilla/5.0' },
      ip: '127.0.0.1',
    });
    const next: CallHandler = { handle: () => of({ id: 9 }) };

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({ id: 9 });
    expect(graylogService.log).toHaveBeenCalledTimes(2);

    expect(graylogService.log).toHaveBeenNthCalledWith(
      1,
      'Request: POST /api/items',
      expect.objectContaining({
        type: 'request',
        method: 'POST',
        url: '/api/items',
        body: { name: 'Ada' },
        query: { page: '1' },
        params: { id: '1' },
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
      }),
    );

    expect(graylogService.log).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^Response: POST \/api\/items \d+ms$/),
      expect.objectContaining({
        type: 'response',
        method: 'POST',
        url: '/api/items',
        status: 201,
        data: { id: 9 },
      }),
    );
    expect(
      (graylogService.log.mock.calls[1][1] as { responseTime: number })
        .responseTime,
    ).toBeGreaterThanOrEqual(0);
  });

  it('logs errorResponse at error level when the observable errors', async () => {
    const context = createExecutionContext({
      method: 'DELETE',
      url: '/api/items/1',
    });
    const next: CallHandler = {
      handle: () => throwError(() => new Error('fail')),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow('fail');

    expect(graylogService.log).toHaveBeenCalledTimes(2);
    expect(graylogService.log).toHaveBeenNthCalledWith(
      1,
      'Request: DELETE /api/items/1',
      expect.objectContaining({ type: 'request' }),
    );
    expect(graylogService.log).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^Error Response: DELETE \/api\/items\/1 \d+ms$/),
      expect.objectContaining({
        type: 'errorResponse',
        method: 'DELETE',
        url: '/api/items/1',
      }),
      'error',
    );
  });

  it('defaults missing user-agent and ip to empty strings', async () => {
    const context = createExecutionContext({
      headers: {},
      ip: undefined,
    });
    const next: CallHandler = { handle: () => of(null) };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(graylogService.log).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        userAgent: '',
        ip: '',
      }),
    );
  });
});
