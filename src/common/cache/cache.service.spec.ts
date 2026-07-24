import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

type MockRedis = {
  ping: jest.Mock;
  get: jest.Mock;
  setex: jest.Mock;
  del: jest.Mock;
  scan: jest.Mock;
  keys: jest.Mock;
};

function createRedis(): MockRedis {
  return {
    ping: jest.fn(),
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    keys: jest.fn(),
  };
}

function createConfigService(ttl = 3600): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: number) =>
      key === 'redis.ttl' ? ttl : defaultValue,
    ),
  } as unknown as ConfigService;
}

describe('CacheService', () => {
  let redis: MockRedis;
  let service: CacheService;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    redis = createRedis();
    service = new CacheService(redis as never, createConfigService(3600));

    errorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
    warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
    logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
    debugSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
    debugSpy.mockRestore();
  });

  describe('ping', () => {
    it('returns true when Redis replies PONG', async () => {
      redis.ping.mockResolvedValue('PONG');
      await expect(service.ping()).resolves.toBe(true);
    });

    it('returns false for any other reply', async () => {
      redis.ping.mockResolvedValue('NOPE');
      await expect(service.ping()).resolves.toBe(false);
    });
  });

  describe('get', () => {
    it('parses JSON on hit', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ id: 1 }));
      await expect(service.get<{ id: number }>('k')).resolves.toEqual({
        id: 1,
      });
    });

    it('returns null on miss', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.get('k')).resolves.toBeNull();
    });

    it('returns null when JSON is invalid', async () => {
      redis.get.mockResolvedValue('{bad');
      await expect(service.get('k')).resolves.toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns null when Redis throws', async () => {
      redis.get.mockRejectedValue(new Error('down'));
      await expect(service.get('k')).resolves.toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('uses default TTL when ttl is omitted', async () => {
      redis.setex.mockResolvedValue('OK');
      await service.set('k', { a: 1 });
      expect(redis.setex).toHaveBeenCalledWith('k', 3600, '{"a":1}');
    });

    it('uses custom TTL when provided', async () => {
      redis.setex.mockResolvedValue('OK');
      await service.set('k', 'v', 90);
      expect(redis.setex).toHaveBeenCalledWith('k', 90, '"v"');
    });

    it('falls back to default TTL when ttl is falsy (0)', async () => {
      redis.setex.mockResolvedValue('OK');
      await service.set('k', 'v', 0);
      expect(redis.setex).toHaveBeenCalledWith('k', 3600, '"v"');
    });

    it('swallows Redis errors', async () => {
      redis.setex.mockRejectedValue(new Error('fail'));
      await expect(service.set('k', 1)).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('deletes a key', async () => {
      redis.del.mockResolvedValue(1);
      await service.del('k');
      expect(redis.del).toHaveBeenCalledWith('k');
    });

    it('swallows Redis errors', async () => {
      redis.del.mockRejectedValue(new Error('fail'));
      await expect(service.del('k')).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('delPattern', () => {
    it('scans multiple pages and deletes matching keys', async () => {
      redis.scan
        .mockResolvedValueOnce(['1', ['users:1', 'other:2']])
        .mockResolvedValueOnce(['0', ['users:3']]);
      redis.del.mockResolvedValue(2);

      await service.delPattern('users:*');

      expect(redis.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'users:*',
        'COUNT',
        100,
      );
      expect(redis.del).toHaveBeenCalledWith('users:1', 'users:3');
    });

    it('does nothing when no keys match', async () => {
      redis.scan.mockResolvedValue(['0', []]);
      await service.delPattern('missing:*');
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('deletes in batches of 100', async () => {
      const keys = Array.from({ length: 150 }, (_, i) => `k:${i}`);
      redis.scan.mockResolvedValue(['0', keys]);
      redis.del.mockResolvedValue(100);

      await service.delPattern('k:*');

      expect(redis.del).toHaveBeenCalledTimes(2);
      expect(redis.del.mock.calls[0][0]).toBe('k:0');
      expect(redis.del.mock.calls[0]).toHaveLength(100);
      expect(redis.del.mock.calls[1]).toHaveLength(50);
    });

    it('falls back to KEYS when SCAN fails', async () => {
      redis.scan.mockRejectedValue(new Error('scan fail'));
      redis.keys.mockResolvedValue(['a:1', 'a:2']);
      redis.del.mockResolvedValue(2);

      await service.delPattern('a:*');

      expect(warnSpy).toHaveBeenCalled();
      expect(redis.keys).toHaveBeenCalledWith('a:*');
      expect(redis.del).toHaveBeenCalledWith('a:1', 'a:2');
    });

    it('skips delete when KEYS fallback returns no matches', async () => {
      redis.scan.mockRejectedValue(new Error('scan fail'));
      redis.keys.mockResolvedValue([]);

      await service.delPattern('empty:*');

      expect(warnSpy).toHaveBeenCalled();
      expect(redis.keys).toHaveBeenCalledWith('empty:*');
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('rethrows the original error when KEYS fallback also fails', async () => {
      const scanError = new Error('scan fail');
      redis.scan.mockRejectedValue(scanError);
      redis.keys.mockRejectedValue(new Error('keys fail'));

      await expect(service.delPattern('x:*')).rejects.toBe(scanError);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('generateKey', () => {
    it('joins prefix with stringified params', () => {
      expect(service.generateKey('pref', 'a', 1, { b: 2 })).toBe(
        'pref:a:1:{"b":2}',
      );
    });

    it('stringifies null object params', () => {
      expect(service.generateKey('pref', null)).toBe('pref:null');
    });
  });
});
