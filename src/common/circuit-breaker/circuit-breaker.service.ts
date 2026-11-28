import { Injectable } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { Counter, register } from '@prometheus-io/client';

const CB_METRIC_NAME = 'circuit_breaker_state_changes_total';

export interface BreakerOptions {
  /** ms before a pending call is aborted (default: 5 000) */
  timeout?: number;
  /** % of failures before opening the circuit (default: 50) */
  errorThresholdPercentage?: number;
  /** ms to wait in open state before moving to half-open (default: 30 000) */
  resetTimeout?: number;
  /** min calls needed before error % is evaluated (default: 5) */
  volumeThreshold?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly breakers = new Map<string, CircuitBreaker<[() => Promise<unknown>], unknown>>();
  private readonly eventsCounter: Counter<string>;

  constructor() {
    const existing = register.getSingleMetric(CB_METRIC_NAME);
    this.eventsCounter = existing
      ? (existing as unknown as Counter<string>)
      : new Counter({
          name: CB_METRIC_NAME,
          help: 'Circuit breaker state change events (open, half_open, close, reject, timeout)',
          labelNames: ['name', 'state'],
        });
  }

  /**
   * Wrap an async call in the named circuit breaker.
   *
   * Example:
   *   await this.cb.fire('email-service', () => this.mailer.sendMail(opts));
   */
  async fire<T>(name: string, fn: () => Promise<T>, opts?: BreakerOptions): Promise<T> {
    const breaker = this.getOrCreate(name, opts);
    return breaker.fire(fn) as Promise<T>;
  }

  /** Returns the raw opossum breaker for custom listeners / stats. */
  getOrCreate(name: string, opts?: BreakerOptions): CircuitBreaker<[() => Promise<unknown>], unknown> {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(
        (fn: () => Promise<unknown>) => fn(),
        {
          timeout: opts?.timeout ?? 5_000,
          errorThresholdPercentage: opts?.errorThresholdPercentage ?? 50,
          resetTimeout: opts?.resetTimeout ?? 30_000,
          volumeThreshold: opts?.volumeThreshold ?? 5,
          name,
        },
      );

      breaker.on('open', () => {
        console.warn(`Circuit [${name}] OPEN — calls rejected until reset`);
        this.eventsCounter.inc({ name, state: 'open' });
      });
      breaker.on('halfOpen', () => {
        console.log(`Circuit [${name}] HALF-OPEN — probing`);
        this.eventsCounter.inc({ name, state: 'half_open' });
      });
      breaker.on('close', () => {
        console.log(`Circuit [${name}] CLOSED — healthy`);
        this.eventsCounter.inc({ name, state: 'close' });
      });
      breaker.on('reject', () => {
        console.warn(`Circuit [${name}] rejected (open)`);
        this.eventsCounter.inc({ name, state: 'reject' });
      });
      breaker.on('timeout', () => {
        console.warn(`Circuit [${name}] timed out`);
        this.eventsCounter.inc({ name, state: 'timeout' });
      });
      breaker.on('fallback', (result: unknown) =>
        console.debug(`Circuit [${name}] fallback returned: ${JSON.stringify(result)}`),
      );

      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  stats(name: string) {
    return this.breakers.get(name)?.stats ?? null;
  }
}
