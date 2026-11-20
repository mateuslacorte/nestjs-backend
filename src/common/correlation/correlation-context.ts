import { AsyncLocalStorage } from 'async_hooks';

interface CorrelationStore {
    correlationId: string;
}

const storage = new AsyncLocalStorage<CorrelationStore>();

export class CorrelationContext {
    static run(correlationId: string, fn: () => void): void {
        storage.run({ correlationId }, fn);
    }

    static get(): string | undefined {
        return storage.getStore()?.correlationId;
    }
}
