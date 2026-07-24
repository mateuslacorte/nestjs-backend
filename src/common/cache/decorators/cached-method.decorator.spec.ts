import 'reflect-metadata';
import { applyCacheToMethod } from './cached-method.decorator';
import { CacheService } from '../cache.service';

function createCacheServiceMock(): jest.Mocked<
  Pick<CacheService, 'get' | 'set' | 'delPattern' | 'generateKey'>
> {
  return {
    get: jest.fn(),
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

describe('applyCacheToMethod', () => {
  let cacheService: ReturnType<typeof createCacheServiceMock>;

  beforeEach(() => {
    cacheService = createCacheServiceMock();
  });

  function wrapMethod(
    propertyName: string,
    impl: (...args: unknown[]) => unknown,
    metadata: Record<string, unknown> = { 'cache:enable': true },
  ) {
    class UserPostgresRepository {
      async method(...args: unknown[]) {
        return impl(...args);
      }
    }

    Object.defineProperty(UserPostgresRepository.prototype, propertyName, {
      value: UserPostgresRepository.prototype.method,
      writable: true,
      configurable: true,
    });

    const descriptor = Object.getOwnPropertyDescriptor(
      UserPostgresRepository.prototype,
      propertyName,
    )!;

    for (const [key, value] of Object.entries(metadata)) {
      Reflect.defineMetadata(
        key,
        value,
        UserPostgresRepository.prototype,
        propertyName,
      );
    }

    applyCacheToMethod(
      UserPostgresRepository.prototype,
      propertyName,
      descriptor,
      cacheService as unknown as CacheService,
      {},
    );

    Object.defineProperty(
      UserPostgresRepository.prototype,
      propertyName,
      descriptor,
    );

    return new UserPostgresRepository() as unknown as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >;
  }

  it('passes through when noCache metadata is set', async () => {
    const impl = jest.fn(async () => 'raw');
    const instance = wrapMethod('findById', impl, {
      'cache:enable': true,
      'cache:no-cache': true,
    });

    await expect(instance.findById('1')).resolves.toBe('raw');
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('invalidates patterns after execution', async () => {
    const instance = wrapMethod('clear', async () => true, {
      'cache:enable': true,
      'cache:invalidate': ['pat:*'],
    });

    await expect(instance.clear()).resolves.toBe(true);
    expect(cacheService.delPattern).toHaveBeenCalledWith('pat:*');
  });

  it('invalidates related cache for write methods', async () => {
    const instance = wrapMethod('create', async (payload) => payload, {
      'cache:enable': true,
    });

    await instance.create({ id: '1' });
    expect(cacheService.delPattern).toHaveBeenCalled();
  });

  it('passes through when enableCache metadata is missing', async () => {
    const impl = jest.fn(async () => 'raw');
    const instance = wrapMethod('findById', impl, {});

    await expect(instance.findById('1')).resolves.toBe('raw');
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('returns cached value on truthy HIT', async () => {
    cacheService.get.mockResolvedValue({ id: 'hit' });
    const impl = jest.fn(async () => ({ id: 'miss' }));
    const instance = wrapMethod('findById', impl);

    await expect(instance.findById('1')).resolves.toEqual({ id: 'hit' });
    expect(impl).not.toHaveBeenCalled();
  });

  it('treats falsy cached values as miss and re-sets', async () => {
    cacheService.get.mockResolvedValue(0);
    const impl = jest.fn(async () => 0);
    const instance = wrapMethod('count', impl);

    await expect(instance.count()).resolves.toBe(0);
    expect(impl).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalled();
  });

  it('executes and sets on MISS', async () => {
    cacheService.get.mockResolvedValue(null);
    const instance = wrapMethod('findById', async (id) => ({ id }), {
      'cache:enable': true,
      'cache:ttl': 60,
    });

    await expect(instance.findById('9')).resolves.toEqual({ id: '9' });
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('typeorm:'),
      { id: '9' },
      60,
    );
  });

  it('uses custom cache key via generateKey', async () => {
    cacheService.get.mockResolvedValue(null);
    const instance = wrapMethod('findByEmail', async (email) => ({ email }), {
      'cache:enable': true,
      'cache:key': 'by-email',
    });

    await instance.findByEmail('a@b.com');
    expect(cacheService.generateKey).toHaveBeenCalledWith(
      expect.stringMatching(/^typeorm:/),
      'by-email',
      'a@b.com',
    );
  });

  it('invalidates findById pattern when write arg is a string id', async () => {
    const instance = wrapMethod('delete', async (id) => id, {
      'cache:enable': true,
    });

    await instance.delete('abc');
    expect(cacheService.delPattern).toHaveBeenCalledWith(
      'typeorm:*:user:findById:abc*',
    );
  });

  it('uses mongoose prefix for Mongo repository class names', async () => {
    class UserMongoRepository {
      async findById(...args: unknown[]) {
        return args[0];
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      UserMongoRepository.prototype,
      'findById',
    )!;
    Reflect.defineMetadata(
      'cache:enable',
      true,
      UserMongoRepository.prototype,
      'findById',
    );
    applyCacheToMethod(
      UserMongoRepository.prototype,
      'findById',
      descriptor,
      cacheService as unknown as CacheService,
      {},
    );
    Object.defineProperty(UserMongoRepository.prototype, 'findById', descriptor);

    cacheService.get.mockResolvedValue(null);
    await new UserMongoRepository().findById('1');

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('mongoose:'),
      '1',
      undefined,
    );
  });

  it('skips findById invalidation pattern when write has no id arg', async () => {
    const instance = wrapMethod('create', async () => ({ ok: true }), {
      'cache:enable': true,
    });

    await instance.create();
    expect(cacheService.delPattern).toHaveBeenCalledWith('typeorm:*:user:*');
    expect(
      cacheService.delPattern.mock.calls.some(([p]) =>
        String(p).includes('findById:'),
      ),
    ).toBe(false);
  });

  it('parses module path from Error.stack on read miss', async () => {
    cacheService.get.mockResolvedValue(null);

    const instance = wrapMethod('findById', async (id) => ({ id }), {
      'cache:enable': true,
    });

    await withMockedErrorStack(
      [
        'Error',
        '    at Object.<anonymous> (/proj/src/modules/foo/repositories/bar.repository.ts:12:3)',
      ].join('\n'),
      () => instance.findById('9'),
    );

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('typeorm:foo:'),
      { id: '9' },
      undefined,
    );
  });
});
