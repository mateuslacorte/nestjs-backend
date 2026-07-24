import 'reflect-metadata';
import {
  CACHE_INVALIDATE,
  CACHE_KEY,
  CACHE_TTL,
  ENABLE_CACHE,
  EnableCache,
  CacheInvalidate,
  CacheKey,
  CacheTTL,
  NO_CACHE,
  NoCache,
  invalidateRelatedCache,
} from './cache.decorator';
import { CacheService } from '../cache.service';

function createCacheServiceMock(): jest.Mocked<
  Pick<CacheService, 'get' | 'set' | 'delPattern' | 'generateKey'>
> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    delPattern: jest.fn().mockResolvedValue(undefined),
    generateKey: jest.fn((prefix: string, ...params: unknown[]) =>
      [prefix, ...params].join(':'),
    ),
  };
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

/** EnableCache reads metadata from target+propertyName (not Nest SetMetadata's method target). */
function defineMethodMeta(
  ctor: { prototype: object },
  propertyName: string,
  key: string,
  value: unknown,
): void {
  Reflect.defineMetadata(key, value, ctor.prototype, propertyName);
}

describe('cache decorators metadata', () => {
  it('SetMetadata factories store values on the method function', () => {
    class Sample {
      @CacheKey('custom')
      @CacheTTL(120)
      @NoCache()
      @CacheInvalidate('a:*', 'b:*')
      method() {
        return 'ok';
      }
    }

    expect(Reflect.getMetadata(CACHE_KEY, Sample.prototype.method)).toBe(
      'custom',
    );
    expect(Reflect.getMetadata(CACHE_TTL, Sample.prototype.method)).toBe(120);
    expect(Reflect.getMetadata(NO_CACHE, Sample.prototype.method)).toBe(true);
    expect(
      Reflect.getMetadata(CACHE_INVALIDATE, Sample.prototype.method),
    ).toEqual(['a:*', 'b:*']);
  });

  it('EnableCache marks ENABLE_CACHE on the prototype property', () => {
    class Sample {
      @EnableCache()
      method() {
        return 'ok';
      }
    }

    expect(Reflect.getMetadata(ENABLE_CACHE, Sample.prototype, 'method')).toBe(
      true,
    );
  });
});

describe('EnableCache', () => {
  let cacheService: ReturnType<typeof createCacheServiceMock>;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    cacheService = createCacheServiceMock();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('runs original method when cacheService is missing', async () => {
    class UserPostgresRepository {
      @EnableCache()
      async findById(id: string) {
        return { id };
      }
    }

    const repo = new UserPostgresRepository();
    await expect(repo.findById('1')).resolves.toEqual({ id: '1' });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('skips cache when NoCache metadata is on the prototype property', async () => {
    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async findById(id: string) {
        return { id };
      }
    }
    defineMethodMeta(UserPostgresRepository, 'findById', NO_CACHE, true);

    const repo = new UserPostgresRepository();
    await expect(repo.findById('1')).resolves.toEqual({ id: '1' });
    expect(cacheService.get).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('runs CacheInvalidate patterns after the method', async () => {
    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async clear() {
        return true;
      }
    }
    defineMethodMeta(UserPostgresRepository, 'clear', CACHE_INVALIDATE, [
      'typeorm:users:user:*',
      'extra:*',
    ]);

    const repo = new UserPostgresRepository();
    await expect(repo.clear()).resolves.toBe(true);
    expect(cacheService.delPattern).toHaveBeenCalledWith(
      'typeorm:users:user:*',
    );
    expect(cacheService.delPattern).toHaveBeenCalledWith('extra:*');
  });

  it('invalidates related cache after write methods', async () => {
    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    const repo = new UserPostgresRepository();
    await expect(repo.create({ id: 'u1' })).resolves.toEqual({ id: 'u1' });
    expect(cacheService.delPattern).toHaveBeenCalled();
    expect(
      cacheService.delPattern.mock.calls.some(([pattern]) =>
        String(pattern).includes('typeorm:'),
      ),
    ).toBe(true);
    expect(
      cacheService.delPattern.mock.calls.some(([pattern]) =>
        String(pattern).includes('findById:u1'),
      ),
    ).toBe(true);
  });

  it('does not fail the write when invalidation throws', async () => {
    cacheService.delPattern.mockRejectedValue(new Error('redis down'));

    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async update(id: string) {
        return { id };
      }
    }

    const repo = new UserPostgresRepository();
    await expect(repo.update('u2')).resolves.toEqual({ id: 'u2' });
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns cached value on HIT without calling set', async () => {
    cacheService.get.mockResolvedValue({ id: 'cached' });

    class UserPostgresRepository {
      cacheService = cacheService;
      findByIdImpl = jest.fn(async (id: string) => ({ id }));

      @EnableCache()
      async findById(id: string) {
        return this.findByIdImpl(id);
      }
    }

    const repo = new UserPostgresRepository();
    await expect(repo.findById('1')).resolves.toEqual({ id: 'cached' });
    expect(repo.findByIdImpl).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('executes and SETs on MISS with TTL metadata', async () => {
    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async findById(id: string) {
        return { id };
      }
    }
    defineMethodMeta(UserPostgresRepository, 'findById', CACHE_TTL, 1800);

    const repo = new UserPostgresRepository();
    await expect(repo.findById('9')).resolves.toEqual({ id: '9' });
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('typeorm:'),
      { id: '9' },
      1800,
    );
  });

  it('skips SET when result is null or undefined', async () => {
    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async findById() {
        return null;
      }

      @EnableCache()
      async findMissing() {
        return undefined;
      }
    }

    const repo = new UserPostgresRepository();
    await repo.findById();
    await repo.findMissing();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('uses generateKey when CacheKey metadata is set', async () => {
    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async findByEmail(email: string) {
        return { email };
      }
    }
    defineMethodMeta(UserPostgresRepository, 'findByEmail', CACHE_KEY, 'by-email');

    const repo = new UserPostgresRepository();
    await repo.findByEmail('a@b.com');

    expect(cacheService.generateKey).toHaveBeenCalledWith(
      expect.stringMatching(/^typeorm:/),
      'by-email',
      'a@b.com',
    );
  });

  it('uses mongoose prefix for Mongo repository class names', async () => {
    class UserMongoRepository {
      cacheService = cacheService;

      @EnableCache()
      async findById(id: string) {
        return { id };
      }
    }

    const repo = new UserMongoRepository();
    await repo.findById('1');

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('mongoose:'),
      { id: '1' },
      undefined,
    );
  });

  it('extracts invalidation id from string, id, and _id args', async () => {
    class UserMongoRepository {
      cacheService = cacheService;

      @EnableCache()
      async delete(id: string) {
        return id;
      }

      @EnableCache()
      async remove(doc: { _id: string }) {
        return doc;
      }
    }

    const repo = new UserMongoRepository();
    await repo.delete('abc');
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('findById:abc'),
      ),
    ).toBe(true);

    cacheService.delPattern.mockClear();
    await repo.remove({ _id: 'oid' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('findById:oid'),
      ),
    ).toBe(true);
  });

  it('infers and pluralizes unmapped class names for write invalidation', async () => {
    class WidgetPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    await new WidgetPostgresRepository().create({ id: 'w1' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:widgets:'),
      ),
    ).toBe(true);
  });

  it('pluralizes y→ies for unmapped Category* class names', async () => {
    class CategoryPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    await new CategoryPostgresRepository().create({ id: 'c1' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:categories:'),
      ),
    ).toBe(true);
  });

  it('pluralizes x→es for unmapped Box* class names', async () => {
    class BoxPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    await new BoxPostgresRepository().create({ id: 'b1' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:boxes:'),
      ),
    ).toBe(true);
  });

  it('pluralizes s→es for unmapped Bus* class names', async () => {
    class BusPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    await new BusPostgresRepository().create({ id: 'bus-1' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:buses:'),
      ),
    ).toBe(true);
  });

  it('pluralizes ch→es for unmapped Batch* class names', async () => {
    class BatchPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    await new BatchPostgresRepository().create({ id: 'batch-1' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:batches:'),
      ),
    ).toBe(true);
  });

  it('pluralizes sh→es for unmapped Flash* class names', async () => {
    class FlashPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    await new FlashPostgresRepository().create({ id: 'f1' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:flashes:'),
      ),
    ).toBe(true);
  });

  it('keeps already-plural inferred names when strip yields a pluralModules entry', async () => {
    // "assemblies" is in pluralModules; className does not include map key "assembly"
    class AssembliesPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: { id: string }) {
        return payload;
      }
    }

    await new AssembliesPostgresRepository().create({ id: 'a1' });
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:assemblies:'),
      ),
    ).toBe(true);
  });

  it('parses repository path from Error.stack for module name', async () => {
    class WidgetPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async findById(id: string) {
        return { id };
      }
    }

    await withMockedErrorStack(
      [
        'Error',
        '    at Object.<anonymous> (/proj/src/modules/widgets/repositories/postgres.repository.ts:10:5)',
      ].join('\n'),
      () => new WidgetPostgresRepository().findById('1'),
    );

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('typeorm:widgets:'),
      { id: '1' },
      undefined,
    );
  });

  it('parses service path from Error.stack for module name', async () => {
    class WidgetPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async findById(id: string) {
        return { id };
      }
    }

    await withMockedErrorStack(
      [
        'Error',
        '    at Object.<anonymous> (/proj/src/modules/widgets/widgets.service.ts:10:5)',
      ].join('\n'),
      () => new WidgetPostgresRepository().findById('2'),
    );

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('typeorm:widgets:'),
      { id: '2' },
      undefined,
    );
  });

  it('swallows outer invalidation failure when invalidateRelatedCache throws', async () => {
    // Throw outside the per-pattern try inside invalidateRelatedCache
    // so the EnableCache outer catch (line ~139) runs.
    const explodingArg = new Proxy(
      {},
      {
        has() {
          throw new Error('outer boom');
        },
      },
    );

    class UserPostgresRepository {
      cacheService = cacheService;

      @EnableCache()
      async create(payload: unknown) {
        return payload;
      }
    }

    await expect(
      new UserPostgresRepository().create(explodingArg),
    ).resolves.toBe(explodingArg);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao invalidar cache'),
      expect.any(Error),
    );
  });
});

describe('invalidateRelatedCache', () => {
  let cacheService: ReturnType<typeof createCacheServiceMock>;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    cacheService = createCacheServiceMock();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('re-infers module name when passed unknown', async () => {
    await invalidateRelatedCache(
      cacheService as unknown as CacheService,
      'WidgetPostgresRepository',
      'create',
      [{ id: '1' }],
      'unknown',
    );

    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:widgets:'),
      ),
    ).toBe(true);
  });

  it('re-infers module name when moduleName is omitted', async () => {
    await withMockedErrorStack(
      [
        'Error',
        '    at Object.<anonymous> (/proj/src/modules/widgets/repositories/postgres.repository.ts:10:5)',
      ].join('\n'),
      () =>
        invalidateRelatedCache(
          cacheService as unknown as CacheService,
          'WidgetPostgresRepository',
          'create',
          [],
        ),
    );

    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('typeorm:widgets:'),
      ),
    ).toBe(true);
  });
});
