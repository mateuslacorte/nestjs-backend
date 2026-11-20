import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';

function makeCounter() {
    return { inc: jest.fn() } as unknown as Counter<string>;
}

function makeHistogram() {
    return { observe: jest.fn() } as unknown as Histogram<string>;
}

function makeHttpContext(overrides: {
    method?: string;
    url?: string;
    routerPath?: string;
    statusCode?: number;
    omitUrl?: boolean;
} = {}): ExecutionContext {
    const req: Record<string, unknown> = {
        method: overrides.method ?? 'GET',
    };
    if (!overrides.omitUrl) {
        req['url'] = overrides.url ?? '/api/test';
    }
    if (overrides.routerPath !== undefined) {
        req['routerPath'] = overrides.routerPath;
    }
    const res = { statusCode: overrides.statusCode ?? 200 };
    return {
        getType: () => 'http',
        switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => res,
        }),
    } as unknown as ExecutionContext;
}

function makeNonHttpContext(type = 'graphql'): ExecutionContext {
    return {
        getType: () => type,
    } as unknown as ExecutionContext;
}

describe('MetricsInterceptor', () => {
    let counter: Counter<string>;
    let histogram: Histogram<string>;
    let interceptor: MetricsInterceptor;

    beforeEach(() => {
        counter = makeCounter();
        histogram = makeHistogram();
        interceptor = new MetricsInterceptor(counter, histogram);
    });

    it('passes through non-HTTP contexts without recording metrics', async () => {
        const context = makeNonHttpContext('graphql');
        const next: CallHandler = { handle: () => of({ data: true }) };

        const result = await firstValueFrom(interceptor.intercept(context, next));

        expect(result).toEqual({ data: true });
        expect(counter.inc).not.toHaveBeenCalled();
        expect(histogram.observe).not.toHaveBeenCalled();
    });

    it('records counter and histogram on successful HTTP request with routerPath', async () => {
        const context = makeHttpContext({
            method: 'GET',
            routerPath: '/api/users/:id',
            url: '/api/users/123',
            statusCode: 200,
        });
        const next: CallHandler = { handle: () => of({ id: 1 }) };

        await firstValueFrom(interceptor.intercept(context, next));

        expect(counter.inc).toHaveBeenCalledWith({
            method: 'GET',
            route: '/api/users/:id',
            status_code: '200',
        });
        expect(histogram.observe).toHaveBeenCalledWith(
            { method: 'GET', route: '/api/users/:id' },
            expect.any(Number),
        );
    });

    it('falls back to url when routerPath is undefined', async () => {
        const context = makeHttpContext({
            method: 'POST',
            url: '/api/items',
            statusCode: 201,
        });
        const next: CallHandler = { handle: () => of({ created: true }) };

        await firstValueFrom(interceptor.intercept(context, next));

        expect(counter.inc).toHaveBeenCalledWith({
            method: 'POST',
            route: '/api/items',
            status_code: '201',
        });
        expect(histogram.observe).toHaveBeenCalledWith(
            { method: 'POST', route: '/api/items' },
            expect.any(Number),
        );
    });

    it('records 500 status_code when error has no status property', async () => {
        const context = makeHttpContext({ method: 'DELETE', url: '/api/items/1' });
        const error = new Error('internal error');
        const next: CallHandler = { handle: () => throwError(() => error) };

        await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow(
            'internal error',
        );

        expect(counter.inc).toHaveBeenCalledWith({
            method: 'DELETE',
            route: '/api/items/1',
            status_code: '500',
        });
        expect(histogram.observe).toHaveBeenCalledWith(
            { method: 'DELETE', route: '/api/items/1' },
            expect.any(Number),
        );
    });

    it('records error status when error has status property', async () => {
        const context = makeHttpContext({ method: 'GET', routerPath: '/api/secure' });
        const error = Object.assign(new Error('Forbidden'), { status: 403 });
        const next: CallHandler = { handle: () => throwError(() => error) };

        await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow();

        expect(counter.inc).toHaveBeenCalledWith({
            method: 'GET',
            route: '/api/secure',
            status_code: '403',
        });
    });

    it('falls back to statusCode when status is absent', async () => {
        const context = makeHttpContext({ method: 'PUT', url: '/api/items/2' });
        const error = Object.assign(new Error('Not Found'), { statusCode: 404 });
        const next: CallHandler = { handle: () => throwError(() => error) };

        await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow();

        expect(counter.inc).toHaveBeenCalledWith({
            method: 'PUT',
            route: '/api/items/2',
            status_code: '404',
        });
    });

    it('falls back to unknown when both routerPath and url are absent (success)', async () => {
        const context = makeHttpContext({ method: 'GET', omitUrl: true });
        const next: CallHandler = { handle: () => of({}) };

        await firstValueFrom(interceptor.intercept(context, next));

        expect(counter.inc).toHaveBeenCalledWith(
            expect.objectContaining({ route: 'unknown' }),
        );
    });

    it('falls back to unknown when both routerPath and url are absent (error)', async () => {
        const context = makeHttpContext({ method: 'PATCH', omitUrl: true });
        const error = Object.assign(new Error('fail'), { status: 400 });
        const next: CallHandler = { handle: () => throwError(() => error) };

        await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow();

        expect(counter.inc).toHaveBeenCalledWith(
            expect.objectContaining({ route: 'unknown' }),
        );
    });

    it('records 500 status_code when error value is null', async () => {
        const context = makeHttpContext({ method: 'GET', url: '/api/test' });
        const next: CallHandler = { handle: () => throwError(() => null) };

        await expect(
            firstValueFrom(interceptor.intercept(context, next)),
        ).rejects.toBeNull();

        expect(counter.inc).toHaveBeenCalledWith(
            expect.objectContaining({ status_code: '500' }),
        );
    });

    it('records duration as a non-negative number', async () => {
        const context = makeHttpContext({ method: 'GET', routerPath: '/api/users' });
        const next: CallHandler = { handle: () => of([]) };

        await firstValueFrom(interceptor.intercept(context, next));

        const observeCall = (histogram.observe as jest.Mock).mock.calls[0];
        expect(observeCall[1]).toBeGreaterThanOrEqual(0);
    });
});
