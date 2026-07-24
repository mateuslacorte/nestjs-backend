import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  CACHE_INVALIDATE,
  CACHE_KEY,
  ENABLE_CACHE,
  NO_CACHE,
} from '../decorators/cache.decorator';
import { CacheService } from '../cache.service';
import { MongooseCacheInterceptor } from './mongoose-cache.interceptor';

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

describe('MongooseCacheInterceptor', () => {
  let interceptor: MongooseCacheInterceptor;
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
    interceptor = new MongooseCacheInterceptor(
      cacheService as unknown as CacheService,
      reflector as unknown as Reflector,
    );
  });

  it('passes through when NO_CACHE is set', async () => {
    metadata[NO_CACHE] = true;
    const next: CallHandler = { handle: () => of('raw') };

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext('UserMongoRepository', 'findById'), next),
      ),
    ).resolves.toBe('raw');
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('invalidates configured patterns after success', async () => {
    metadata[CACHE_INVALIDATE] = ['mongoose:users:*'];
    const next: CallHandler = { handle: () => of(true) };

    await firstValueFrom(
      interceptor.intercept(createContext('UserMongoRepository', 'clear'), next),
    );

    expect(cacheService.delPattern).toHaveBeenCalledWith('mongoose:users:*');
  });

  it('invalidates related cache for write methods with mongoose prefix', async () => {
    const next: CallHandler = { handle: () => of({ id: '1' }) };

    await firstValueFrom(
      interceptor.intercept(
        createContext('UserMongoRepository', 'create', ['1']),
        next,
      ),
    );

    expect(cacheService.delPattern).toHaveBeenCalledWith('mongoose:*:user:*');
    expect(cacheService.delPattern).toHaveBeenCalledWith(
      'mongoose:*:user:findById:1*',
    );
  });

  it('does not treat upsert as a write method (unlike TypeORM)', async () => {
    metadata[ENABLE_CACHE] = true;
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await firstValueFrom(
      interceptor.intercept(createContext('UserMongoRepository', 'upsert'), next),
    );

    expect(cacheService.delPattern).not.toHaveBeenCalled();
    expect(cacheService.get).toHaveBeenCalledWith(
      expect.stringContaining('mongoose:'),
    );
  });

  it('passes through when ENABLE_CACHE is not set', async () => {
    const next: CallHandler = { handle: () => of('raw') };

    await expect(
      firstValueFrom(
        interceptor.intercept(createContext('UserMongoRepository', 'findById'), next),
      ),
    ).resolves.toBe('raw');
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('returns cached value on truthy HIT', async () => {
    metadata[ENABLE_CACHE] = true;
    cacheService.get.mockResolvedValue({ id: 'hit' });
    const handle = jest.fn(() => of({ id: 'miss' }));

    await expect(
      firstValueFrom(
        interceptor.intercept(
          createContext('UserMongoRepository', 'findById', ['1']),
          { handle },
        ),
      ),
    ).resolves.toEqual({ id: 'hit' });
    expect(handle).not.toHaveBeenCalled();
  });

  it('executes next and SETs on MISS with mongoose key prefix', async () => {
    metadata[ENABLE_CACHE] = true;
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = { handle: () => of({ id: '9' }) };

    await expect(
      firstValueFrom(
        interceptor.intercept(
          createContext('UserMongoRepository', 'findById', ['9']),
          next,
        ),
      ),
    ).resolves.toEqual({ id: '9' });

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('mongoose:'),
      { id: '9' },
      undefined,
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
        interceptor.intercept(
          createContext('UserMongoRepository', 'findById'),
          next,
        ),
      ),
    ).rejects.toThrow('boom');
  });

  it('invalidates findById pattern when write arg is an object with id', async () => {
    const next: CallHandler = { handle: () => of({ id: 'obj-1' }) };

    await firstValueFrom(
      interceptor.intercept(
        createContext('UserMongoRepository', 'create', [{ id: 'obj-1' }]),
        next,
      ),
    );

    expect(cacheService.delPattern).toHaveBeenCalledWith(
      'mongoose:*:user:findById:obj-1*',
    );
  });

  it('parses module path from Error.stack on read miss', async () => {
    metadata[ENABLE_CACHE] = true;
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = { handle: () => of({ id: '9' }) };

    await withMockedErrorStack(
      [
        'Error',
        '    at Object.<anonymous> (/proj/src/modules/users/repositories/mongo.repository.ts:10:5)',
      ].join('\n'),
      () =>
        firstValueFrom(
          interceptor.intercept(
            createContext('UserMongoRepository', 'findById', ['9']),
            next,
          ),
        ),
    );

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('mongoose:users:'),
      { id: '9' },
      undefined,
    );
  });

  it('uses generateKey when CACHE_KEY metadata is present', async () => {
    metadata[ENABLE_CACHE] = true;
    metadata[CACHE_KEY] = 'by-email';
    cacheService.get.mockResolvedValue(null);
    const next: CallHandler = { handle: () => of({ email: 'a@b.com' }) };

    await firstValueFrom(
      interceptor.intercept(
        createContext('UserMongoRepository', 'findByEmail', ['a@b.com']),
        next,
      ),
    );

    expect(cacheService.generateKey).toHaveBeenCalledWith(
      expect.stringMatching(/^mongoose:/),
      'by-email',
      'a@b.com',
    );
  });
});
