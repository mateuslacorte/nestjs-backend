import { BulkheadService } from './bulkhead.service';
import { BulkheadRejectedException } from './bulkhead-rejected.exception';
import { HttpStatus } from '@nestjs/common';

function makeService(limit?: number): BulkheadService {
  if (limit !== undefined) {
    process.env.BULKHEAD_MAX_CONCURRENT = String(limit);
  } else {
    delete process.env.BULKHEAD_MAX_CONCURRENT;
  }
  return new BulkheadService();
}

/** Returns a promise + its external resolve/reject handles. */
function deferred<T = void>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('BulkheadService', () => {
  afterEach(() => {
    delete process.env.BULKHEAD_MAX_CONCURRENT;
  });

  describe('constructor / defaults', () => {
    it('defaults limit to 50 when env var is absent', () => {
      const svc = makeService();
      expect(svc.getStats().limit).toBe(50);
    });

    it('reads limit from BULKHEAD_MAX_CONCURRENT', () => {
      const svc = makeService(10);
      expect(svc.getStats().limit).toBe(10);
    });
  });

  describe('getStats', () => {
    it('returns active=0 and correct limit when idle', () => {
      const svc = makeService(5);
      expect(svc.getStats()).toEqual({ active: 0, limit: 5 });
    });

    it('reflects in-flight count while tasks are running', async () => {
      const svc = makeService(5);
      const d = deferred();

      const inflight = svc.execute(() => d.promise);

      expect(svc.getStats().active).toBe(1);

      d.resolve(undefined);
      await inflight;

      expect(svc.getStats().active).toBe(0);
    });
  });

  describe('execute — happy path', () => {
    it('runs the function and returns its result', async () => {
      const svc = makeService(2);
      const result = await svc.execute(() => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it('allows concurrent executions up to the limit', async () => {
      const svc = makeService(2);
      const d1 = deferred<number>();
      const d2 = deferred<number>();

      const p1 = svc.execute(() => d1.promise);
      const p2 = svc.execute(() => d2.promise);

      expect(svc.getStats().active).toBe(2);

      d1.resolve(1);
      d2.resolve(2);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe(1);
      expect(r2).toBe(2);
      expect(svc.getStats().active).toBe(0);
    });

    it('releases the slot after a task resolves, allowing the next one', async () => {
      const svc = makeService(1);
      const d = deferred<string>();

      const first = svc.execute(() => d.promise);
      expect(svc.getStats().active).toBe(1);

      d.resolve('done');
      await first;

      const second = await svc.execute(() => Promise.resolve('second'));
      expect(second).toBe('second');
    });
  });

  describe('execute — rejection', () => {
    it('throws BulkheadRejectedException (HTTP 503) when all slots are taken', async () => {
      const svc = makeService(1);
      const d = deferred();

      svc.execute(() => d.promise);

      await expect(svc.execute(() => Promise.resolve())).rejects.toBeInstanceOf(BulkheadRejectedException);

      d.resolve(undefined);
    });

    it('BulkheadRejectedException carries HTTP 503 status', () => {
      const ex = new BulkheadRejectedException();
      expect(ex.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('slot is released even when the fn throws', async () => {
      const svc = makeService(1);
      const err = new Error('boom');

      await expect(svc.execute(() => Promise.reject(err))).rejects.toBe(err);

      expect(svc.getStats().active).toBe(0);
      await expect(svc.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');
    });
  });

  describe('execute — concurrency boundary', () => {
    it('rejects exactly at the limit, not before', async () => {
      const limit = 3;
      const svc = makeService(limit);
      const deferreds = Array.from({ length: limit }, () => deferred());

      const inflights = deferreds.map(d => svc.execute(() => d.promise));
      expect(svc.getStats().active).toBe(limit);

      await expect(svc.execute(() => Promise.resolve())).rejects.toBeInstanceOf(BulkheadRejectedException);

      deferreds.forEach(d => d.resolve(undefined));
      await Promise.all(inflights);
      expect(svc.getStats().active).toBe(0);
    });

    it('accepts new tasks after slots free up', async () => {
      const svc = makeService(2);
      const d1 = deferred<number>();
      const d2 = deferred<number>();

      const p1 = svc.execute(() => d1.promise);
      svc.execute(() => d2.promise);

      await expect(svc.execute(() => Promise.resolve(99))).rejects.toBeInstanceOf(BulkheadRejectedException);

      d1.resolve(1);
      await p1;

      const extra = await svc.execute(() => Promise.resolve(99));
      expect(extra).toBe(99);

      d2.resolve(2);
    });
  });
});
