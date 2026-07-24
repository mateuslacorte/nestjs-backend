import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { hostname } from 'os';
import { GraylogService } from './graylog.service';

type MockAxiosClient = {
  post: jest.Mock;
};

jest.mock('axios', () => {
  const mockClient = {
    post: jest.fn(),
  };

  return {
    create: jest.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

const mockClient = (axios as unknown as { __mockClient: MockAxiosClient })
  .__mockClient;
const mockCreate = axios.create as unknown as jest.Mock;

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function createConfigService(
  overrides: Partial<{
    enabled: boolean;
    host: string;
    facility: string;
    endpoint: string;
    timeout: number;
  }> = {},
): ConfigService {
  const values: Record<string, unknown> = {
    'graylog.enabled': overrides.enabled ?? true,
    'graylog.host': overrides.host ?? 'test-host',
    'graylog.facility': overrides.facility ?? 'test-facility',
    'graylog.endpoint': overrides.endpoint ?? 'http://graylog.test/gelf',
    'graylog.timeout': overrides.timeout ?? 5000,
  };

  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createConfigServiceMissing(): ConfigService {
  return {
    get: jest.fn(() => undefined),
  } as unknown as ConfigService;
}

function lastPayload(): Record<string, unknown> {
  expect(mockClient.post).toHaveBeenCalled();
  return mockClient.post.mock.calls[
    mockClient.post.mock.calls.length - 1
  ][1] as Record<string, unknown>;
}

describe('GraylogService', () => {
  let service: GraylogService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockImplementation(() => mockClient);
    mockClient.post.mockResolvedValue({ data: {} });

    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    consoleInfoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    consoleDebugSpy = jest
      .spyOn(console, 'debug')
      .mockImplementation(() => undefined);

    service = new GraylogService(createConfigService());
  });

  afterEach(() => {
    service.onModuleDestroy();
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('constructor / client wiring', () => {
    it('creates axios client with config endpoint, timeout, and JSON headers', () => {
      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: 'http://graylog.test/gelf',
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('falls back to defaults when config keys are missing', () => {
      mockCreate.mockClear();
      const fallback = new GraylogService(createConfigServiceMissing());

      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: 'http://localhost:12201/gelf',
        timeout: 3000,
        headers: { 'Content-Type': 'application/json' },
      });

      fallback.log('hello');
      const payload = lastPayload();
      expect(payload.host).toBe(hostname());
      expect(payload._facility).toBe('nestjs');

      fallback.onModuleDestroy();
    });
  });

  describe('enabled gating', () => {
    it('does not post when graylog.enabled is false', () => {
      const disabled = new GraylogService(
        createConfigService({ enabled: false }),
      );

      disabled.log('noop');
      disabled.write('noop');
      disabled.error('noop');

      expect(mockClient.post).not.toHaveBeenCalled();
      disabled.onModuleDestroy();
    });
  });

  describe('log', () => {
    it('sends a GELF payload with expected shape', () => {
      service.log('hello world', { requestId: 'abc' });

      expect(mockClient.post).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          version: '1.1',
          host: 'test-host',
          short_message: 'hello world',
          level: 6,
          _facility: 'test-facility',
          _level_name: 'info',
          _context: JSON.stringify({ requestId: 'abc' }),
          _requestId: 'abc',
        }),
      );
      expect(typeof lastPayload().timestamp).toBe('number');
    });

    it.each([
      ['error', 3],
      ['warn', 4],
      ['info', 6],
      ['verbose', 7],
      ['debug', 7],
    ] as const)('maps level %s to syslog %i', (level, syslog) => {
      service.log('msg', undefined, level);
      expect(lastPayload().level).toBe(syslog);
      expect(lastPayload()._level_name).toBe(level);
    });

    it('truncates short_message and sets full_message when message exceeds 250 chars', () => {
      const long = 'x'.repeat(300);
      service.log(long);

      const payload = lastPayload();
      expect(payload.short_message).toBe('x'.repeat(250));
      expect(payload.full_message).toBe(long);
    });

    it('omits full_message when message is short and no stack provided', () => {
      service.log('short');
      expect(lastPayload().full_message).toBeUndefined();
    });

    it('sanitizes non-alphanumeric context keys when flattening', () => {
      service.log('msg', { 'weird key!': 'value' });
      expect(lastPayload()._weird_key_).toBe('value');
    });

    it('does not flatten nested object context fields as GELF extras', () => {
      service.log('msg', { nested: { a: 1 }, flag: true });
      const payload = lastPayload();
      expect(payload._flag).toBe(true);
      expect(payload._nested).toBeUndefined();
    });

    it('formats null and undefined messages', () => {
      service.log(null);
      expect(lastPayload().short_message).toBe('null');

      service.log(undefined);
      expect(lastPayload().short_message).toBe('undefined');
    });

    it('serializes object messages via safeSerialize', () => {
      service.log({ hello: 'world' });
      expect(lastPayload().short_message).toBe(
        JSON.stringify({ hello: 'world' }),
      );
    });
  });

  describe('safeSerialize via public API', () => {
    it('redacts sensitive fields case-insensitively', () => {
      service.log('msg', {
        Password: 'secret',
        TOKEN: 't',
        secret: 's',
        Authorization: 'Bearer x',
        Cookie: 'c',
        cookies: 'jar',
        safe: 'ok',
      });

      const context = JSON.parse(String(lastPayload()._context));
      expect(context.Password).toBe('[REDACTED]');
      expect(context.TOKEN).toBe('[REDACTED]');
      expect(context.secret).toBe('[REDACTED]');
      expect(context.Authorization).toBe('[REDACTED]');
      expect(context.Cookie).toBe('[REDACTED]');
      expect(context.cookies).toBe('[REDACTED]');
      expect(context.safe).toBe('ok');
    });

    it('replaces circular references with [Circular]', () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      service.log('msg', circular);

      const context = JSON.parse(String(lastPayload()._context));
      expect(context.self).toBe('[Circular]');
    });

    it('replaces values beyond max depth with [Max Depth]', () => {
      const deep = {
        a: { b: { c: { d: { e: { f: { g: 'too deep' } } } } } },
      };
      service.log('msg', deep);

      const context = JSON.parse(String(lastPayload()._context));
      expect(context.a.b.c.d.e.f).toBe('[Max Depth]');
    });

    it('serializes Buffer as [Buffer] and Date as ISO string', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      service.log('msg', { buf: Buffer.from('hi'), when: date });

      const context = JSON.parse(String(lastPayload()._context));
      expect(context.buf).toBe('[Buffer]');
      expect(context.when).toBe(date.toISOString());
    });

    it('truncates arrays to 100 items', () => {
      const items = Array.from({ length: 120 }, (_, i) => i);
      service.log('msg', items);

      const context = JSON.parse(String(lastPayload()._context));
      expect(context).toHaveLength(100);
    });

    it('omits function values from serialized objects', () => {
      service.log('msg', { keep: 1, fn: () => 1 });

      const context = JSON.parse(String(lastPayload()._context));
      expect(context.keep).toBe(1);
      expect(context.fn).toBeUndefined();
    });

    it('returns [Serialization Error] when serialize throws', () => {
      const entriesSpy = jest.spyOn(Object, 'entries').mockImplementation(() => {
        throw new Error('boom');
      });

      try {
        service.log('msg', { a: 1 });
        expect(JSON.parse(String(lastPayload()._context))).toBe(
          '[Serialization Error]',
        );
      } finally {
        entriesSpy.mockRestore();
      }
    });
  });

  describe('write', () => {
    it.each([
      ['error', 'error'],
      ['warn', 'warn'],
      ['debug', 'debug'],
      ['info', 'log'],
      ['verbose', 'log'],
    ] as const)(
      'writes locally with console.%s for level %s then posts',
      (level, consoleMethod) => {
        const spies: Record<string, jest.SpyInstance> = {
          error: consoleErrorSpy,
          warn: consoleWarnSpy,
          debug: consoleDebugSpy,
          log: consoleLogSpy,
        };

        service.write('local', { ctx: true }, level);

        expect(spies[consoleMethod]).toHaveBeenCalledWith('local', {
          ctx: true,
        });
        expect(lastPayload()._level_name).toBe(level);
      },
    );
  });

  describe('error', () => {
    it('sends Error message with stack as full_message', () => {
      const err = new Error('boom');
      service.error(err, { path: '/x' });

      const payload = lastPayload();
      expect(payload.short_message).toBe('boom');
      expect(payload.full_message).toBe(err.stack);
      expect(payload._level_name).toBe('error');
      expect(payload.level).toBe(3);
    });

    it('sends string errors without stack full_message', () => {
      service.error('plain failure');
      const payload = lastPayload();
      expect(payload.short_message).toBe('plain failure');
      expect(payload.full_message).toBeUndefined();
    });
  });

  describe('axios failure handling', () => {
    it('logs to original console.error when post rejects with Error', async () => {
      mockClient.post.mockReturnValue(
        Promise.reject(new Error('network down')),
      );

      service.log('will fail');
      await flushPromises();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Graylog] Falha ao enviar log: network down',
      );
    });

    it('stringifies non-Error rejection reasons', async () => {
      mockClient.post.mockReturnValue(Promise.reject('timeout'));

      service.log('will fail');
      await flushPromises();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Graylog] Falha ao enviar log: timeout',
      );
    });
  });

  describe('console override lifecycle', () => {
    it('forwards console.log/info/warn/debug into Graylog onModuleInit', () => {
      service.onModuleInit();
      mockClient.post.mockClear();

      console.log('from log');
      expect(lastPayload().short_message).toBe('from log');
      expect(JSON.parse(String(lastPayload()._context))).toEqual({
        source: 'console.log',
      });

      console.info('from info');
      expect(lastPayload().short_message).toBe('from info');

      console.warn('from warn');
      expect(lastPayload()._level_name).toBe('warn');

      console.debug('from debug');
      expect(lastPayload()._level_name).toBe('debug');
    });

    it('routes console.error(Error) through error() with stack', () => {
      service.onModuleInit();
      mockClient.post.mockClear();

      const err = new Error('console boom');
      console.error(err);

      const payload = lastPayload();
      expect(payload.short_message).toBe('console boom');
      expect(payload.full_message).toBe(err.stack);
      expect(JSON.parse(String(payload._context))).toEqual({
        source: 'console.error',
      });
    });

    it('routes console.error(non-Error) through log at error level', () => {
      service.onModuleInit();
      mockClient.post.mockClear();

      console.error('plain', 123);
      expect(lastPayload().short_message).toBe('plain 123');
      expect(lastPayload()._level_name).toBe('error');
    });

    it('returns [Object] when formatArg cannot JSON.stringify a value', () => {
      service.onModuleInit();
      mockClient.post.mockClear();

      console.log({ n: 1n });

      expect(lastPayload().short_message).toBe('[Object]');
    });

    it('restores original console methods onModuleDestroy', () => {
      const beforeLog = console.log;
      service.onModuleInit();
      expect(console.log).not.toBe(beforeLog);

      service.onModuleDestroy();
      // After destroy, assigned originals from bound copies — not same ref as
      // pre-init spy, but subsequent calls should not post to Graylog.
      mockClient.post.mockClear();
      console.log('after destroy');
      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });
});
