import { AsyncLocalStorage } from 'async_hooks';

interface CorrelationStore {
  correlationId: string;
}

const storage = new AsyncLocalStorage<CorrelationStore>();

export class CorrelationContext {
  static run<T>(id: string, fn: () => T): T {
    return storage.run({ correlationId: id }, fn);
  }

  static get(): string | undefined {
    return storage.getStore()?.correlationId;
  }
}
