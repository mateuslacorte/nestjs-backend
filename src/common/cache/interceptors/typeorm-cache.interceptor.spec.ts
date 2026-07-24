import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  CACHE_INVALIDATE,
  CACHE_KEY,
  CACHE_TTL,
  ENABLE_CACHE,
  NO_CACHE,
} from '../decorators/cache.decorator';
import { CacheService } from '../cache.service';
import { TypeOrmCacheInterceptor } from './typeorm-cache.interceptor';

function createContext(
  className: string,
  methodName: string,
  args: unknown[] = [],
): ExecutionContext {
  const handler = { name: methodName };
  const klass = { name: className };

  return {
    getHandler: () => handler,
    getClass: () => klass,
    getArgs: () => args,
  } as unknown as ExecutionContext;
}

function withMockedErrorStack<T>(
  stackBody: string,
  run: () => Promise<T>,
): Promise<T> {
  const RealError = global.Error;
  global.Error = class extends RealError {
    constructor(message?: string) {
      super(message);
      this.stack = stackBody;
    }
  } as ErrorConstructor;
  return run().finally(() => {
    global.Error = RealError;
  });
}

describe('TypeOrmCacheInterceptor', () => {
  let interceptor: TypeOrmCacheInterceptor;
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    delPattern: jest.Mock;
    generateKey: jest.Mock;
  };
  let reflector: { getAllAndOverride: jest.Mock };
  let metadata: Record<string, unknown>;

  beforeEach(() => {
    metadata = {};
    cacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
      generateKey: jest.fn((prefix: string, ...params: unknown[]) =>
        [prefix, ...params].join(':'),
      ),
    };
    reflector = {
      getAllAndOverride: jest.fn((key: string) => metadata[key]),
    };
    interceptor = new TypeOrmCacheInterceptor(
      cacheService as unknown as CacheService,
      reflector as unknown as Reflector,
    );
  });

  it('passes through when NO_CACHE is set', async () => {
    metadata[NO_CACHE] = true;
    const next: CallHandler = { handle: () => of('raw') };

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext('UserPostgresRepository', 'findById'), next),
      ),
    ).resolves.toBe('raw');
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('invalidates configured patterns after success', async () => {
    metadata[CACHE_INVALIDATE] = ['typeorm:users:*'];
    const next: CallHandler = { handle: () => of(true) };

    await firstValueFrom(
      interceptor.intercept(createContext('UserPostgresRepository', 'clear'), next),
    );

    expect(cacheService.delPattern).toHaveBeenCalledWith('typeorm:users:*');
  });

  it('invalidates related cache for write methods including upsert', async () => {
    const next: CallHandler = { handle: () => of({ id: '1' }) };

    await firstValueFrom(
      interceptor.intercept(
        createContext('UserPostgresRepository', 'upsert', [{ id: '1' }]),
        next,
      ),
    );

    expect(cacheService.delPattern).toHaveBeenCalledWith('typeorm:*:user:*');
    expect(cacheService.delPattern).toHaveBeenCalledWith(
      'typeorm:*:user:findById:1*',
    );
  });

  it('passes through when ENABLE_CACHE is not set', async () => {
    const next: CallHandler = { handle: jest.fn(() => of('raw')) };

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext('UserPostgresRepository', 'findById'), next),
      ),
    ).resolves.toBe('raw');
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('returns cached value on truthy HIT without calling next', async () => {
    metadata[ENABLE_CACHE] = true;
    cacheService.get.mockResolvedValue({ id: 'hit' });
    const handle = jest.fn(() => of({ id: 'miss' }));
    const next: CallHandler = { handle };

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext('UserPostgresRepository', 'findById', ['1']), next),
      ),
    ).resolves.toEqual({ id: 'hit' });
    expect(handle).not.toHaveBeenCalled();
  });

  it('executes next and SETs on MISS', async () => {
    metadata[ENABLE_CACHE] = true;
    metadata[CACHE_TTL] = 120;
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = { handle: () => of({ id: '9' }) };

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext('UserPostgresRepository', 'findById', ['9']), next),
      ),
    ).resolves.toEqual({ id: '9' });

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('typeorm:'),
      { id: '9' },
      120,
    );
  });

  it('uses generateKey when CACHE_KEY metadata is present', async () => {
    metadata[ENABLE_CACHE] = true;
    metadata[CACHE_KEY] = 'by-email';
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = { handle: () => of({ email: 'a@b.com' }) };

    await firstValueFrom(
      interceptor.intercept(
        createContext('UserPostgresRepository', 'findByEmail', ['a@b.com']),
        next,
      ),
    );

    expect(cacheService.generateKey).toHaveBeenCalledWith(
      expect.stringMatching(/^typeorm:/),
      'by-email',
      'a@b.com',
    );
  });

  it('propagates errors from next.handle on miss path', async () => {
    metadata[ENABLE_CACHE] = true;
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext('UserPostgresRepository', 'findById'), next),
      ),
    ).rejects.toThrow('boom');
  });

  it('invalidates findById pattern when write arg is a string id', async () => {
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await firstValueFrom(
      interceptor.intercept(
        createContext('UserPostgresRepository', 'delete', ['u-99']),
        next,
      ),
    );

    expect(cacheService.delPattern).toHaveBeenCalledWith(
      'typeorm:*:user:findById:u-99*',
    );
  });

  it('parses module path from Error.stack on read miss', async () => {
    metadata[ENABLE_CACHE] = true;
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = { handle: () => of({ id: '9' }) };

    await withMockedErrorStack(
      [
        'Error',
        '    at Object.<anonymous> (/proj/src/modules/units/repositories/postgres.repository.ts:10:5)',
      ].join('\n'),
      () =>
        firstValueFrom(
          interceptor.intercept(
            createContext('UserPostgresRepository', 'findById', ['9']),
            next,
          ),
        ),
    );

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('typeorm:units:'),
      { id: '9' },
      undefined,
    );
  });
});
