import { EventEmitter } from 'events';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('returns the same breaker instance for the same name', () => {
      const b1 = service.getOrCreate('my-cb');
      const b2 = service.getOrCreate('my-cb');
      expect(b1).toBe(b2);
    });

    it('returns different breakers for different names', () => {
      const b1 = service.getOrCreate('cb-a');
      const b2 = service.getOrCreate('cb-b');
      expect(b1).not.toBe(b2);
    });

    it('applies custom options on first creation', () => {
      const breaker = service.getOrCreate('custom-opts', { timeout: 1000, volumeThreshold: 2 });
      expect(breaker.options.timeout).toBe(1000);
      expect(breaker.options.volumeThreshold).toBe(2);
    });
  });

  describe('stats', () => {
    it('returns null for a breaker that was never created', () => {
      expect(service.stats('never-created')).toBeNull();
    });

    it('returns stats object for a known breaker', () => {
      service.getOrCreate('stats-cb');
      expect(service.stats('stats-cb')).not.toBeNull();
    });
  });

  describe('fire', () => {
    it('calls the function and returns its result', async () => {
      const result = await service.fire('fire-cb', () => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it('propagates errors thrown by the function', async () => {
      const err = new Error('downstream failure');
      await expect(
        service.fire('fire-err-cb', () => Promise.reject(err)),
      ).rejects.toBe(err);
    });
  });

  describe('Prometheus metrics', () => {
    let incSpy: jest.SpyInstance;

    beforeEach(() => {
      incSpy = jest.spyOn(service['eventsCounter'], 'inc');
    });

    it.each([
      ['open', 'open'],
      ['halfOpen', 'half_open'],
      ['close', 'close'],
      ['reject', 'reject'],
      ['timeout', 'timeout'],
    ] as const)(
      'increments eventsCounter with state=%s when breaker emits %s',
      (event, expectedState) => {
        const breaker = service.getOrCreate(`metric-cb-${event}`);
        (breaker as unknown as EventEmitter).emit(event);
        expect(incSpy).toHaveBeenCalledWith({
          name: `metric-cb-${event}`,
          state: expectedState,
        });
      },
    );

    it('does not increment eventsCounter on fallback event', () => {
      const breaker = service.getOrCreate('fallback-cb');
      (breaker as unknown as EventEmitter).emit('fallback', 'some-result');
      expect(incSpy).not.toHaveBeenCalled();
    });
  });
});
