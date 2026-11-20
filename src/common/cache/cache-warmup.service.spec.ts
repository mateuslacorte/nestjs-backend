import { CACHE_WARMERS, CacheWarmupService } from './cache-warmup.service';
import { CacheWarmer } from './interfaces/cache-warmer.interface';

function makeWarmer(name: string, impl: () => Promise<void>): CacheWarmer & { constructor: { name: string } } {
  const w: CacheWarmer = { warm: jest.fn(impl) };
  Object.defineProperty(w, 'constructor', { value: { name }, configurable: true });
  return w as CacheWarmer & { constructor: { name: string } };
}

describe('CacheWarmupService', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Silence logger in tests
  });

  function build(warmers: CacheWarmer[]): CacheWarmupService {
    const svc = new CacheWarmupService(warmers);
    logSpy = jest.spyOn(svc['logger'], 'log').mockImplementation();
    errorSpy = jest.spyOn(svc['logger'], 'error').mockImplementation();
    return svc;
  }

  afterEach(() => {
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
  });

  describe('onApplicationBootstrap', () => {
    it('does nothing when warmers array is empty', async () => {
      const svc = build([]);
      await svc.onApplicationBootstrap();
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('calls warm() on every warmer in parallel', async () => {
      const a = makeWarmer('WarmerA', async () => {});
      const b = makeWarmer('WarmerB', async () => {});
      const svc = build([a, b]);

      await svc.onApplicationBootstrap();

      expect(a.warm).toHaveBeenCalledTimes(1);
      expect(b.warm).toHaveBeenCalledTimes(1);
    });

    it('logs success for each fulfilled warmer', async () => {
      const a = makeWarmer('WarmerA', async () => {});
      const svc = build([a]);

      await svc.onApplicationBootstrap();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('WarmerA'));
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('logs error for each failed warmer without throwing', async () => {
      const err = new Error('boom');
      const a = makeWarmer('FailingWarmer', async () => { throw err; });
      const svc = build([a]);

      await expect(svc.onApplicationBootstrap()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('FailingWarmer'),
        err,
      );
    });

    it('handles partial failure: logs success and error individually', async () => {
      const err = new Error('partial');
      const good = makeWarmer('GoodWarmer', async () => {});
      const bad = makeWarmer('BadWarmer', async () => { throw err; });
      const svc = build([good, bad]);

      await expect(svc.onApplicationBootstrap()).resolves.toBeUndefined();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GoodWarmer'));
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('BadWarmer'),
        err,
      );
    });

    it('logs startup message with warmer count', async () => {
      const a = makeWarmer('A', async () => {});
      const b = makeWarmer('B', async () => {});
      const svc = build([a, b]);

      await svc.onApplicationBootstrap();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
    });

    it('continues after multiple failures without throwing', async () => {
      const e1 = new Error('first');
      const e2 = new Error('second');
      const a = makeWarmer('Fail1', async () => { throw e1; });
      const b = makeWarmer('Fail2', async () => { throw e2; });
      const svc = build([a, b]);

      await expect(svc.onApplicationBootstrap()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('CACHE_WARMERS token', () => {
    it('exports the injection token string', () => {
      expect(CACHE_WARMERS).toBe('CACHE_WARMERS');
    });
  });
});
