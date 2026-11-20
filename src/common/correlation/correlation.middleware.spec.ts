import { Request, Response } from 'express';
import { CorrelationMiddleware, CORRELATION_ID_HEADER } from './correlation.middleware';
import { CorrelationContext } from './correlation-context';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeReq(headers: Record<string, string> = {}): Request {
    return { headers } as unknown as Request;
}

function makeRes(): { setHeader: jest.Mock; headers: Record<string, string> } {
    const headers: Record<string, string> = {};
    return {
        setHeader: jest.fn((name: string, value: string) => {
            headers[name] = value;
        }),
        headers,
    };
}

describe('CorrelationMiddleware', () => {
    let middleware: CorrelationMiddleware;

    beforeEach(() => {
        middleware = new CorrelationMiddleware();
    });

    it('reuses the X-Correlation-ID header when present', (done) => {
        const incoming = 'my-trace-id-123';
        const req = makeReq({ [CORRELATION_ID_HEADER]: incoming });
        const res = makeRes();

        middleware.use(req as unknown as Request, res as unknown as Response, () => {
            expect(CorrelationContext.get()).toBe(incoming);
            expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, incoming);
            done();
        });
    });

    it('generates a UUID v4 when X-Correlation-ID header is absent', (done) => {
        const req = makeReq();
        const res = makeRes();

        middleware.use(req as unknown as Request, res as unknown as Response, () => {
            const id = CorrelationContext.get();
            expect(id).toMatch(UUID_RE);
            expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, id);
            done();
        });
    });

    it('sets X-Correlation-ID on the response', (done) => {
        const req = makeReq({ [CORRELATION_ID_HEADER]: 'abc-def' });
        const res = makeRes();

        middleware.use(req as unknown as Request, res as unknown as Response, () => {
            expect(res.headers[CORRELATION_ID_HEADER]).toBe('abc-def');
            done();
        });
    });

    it('provides a different id per concurrent request', (done) => {
        const id1 = 'req-one';
        const id2 = 'req-two';
        let captured1: string | undefined;
        let captured2: string | undefined;
        let count = 0;

        const finish = () => {
            count++;
            if (count === 2) {
                expect(captured1).toBe(id1);
                expect(captured2).toBe(id2);
                done();
            }
        };

        middleware.use(makeReq({ [CORRELATION_ID_HEADER]: id1 }) as unknown as Request, makeRes() as unknown as Response, () => {
            captured1 = CorrelationContext.get();
            finish();
        });

        middleware.use(makeReq({ [CORRELATION_ID_HEADER]: id2 }) as unknown as Request, makeRes() as unknown as Response, () => {
            captured2 = CorrelationContext.get();
            finish();
        });
    });
});

describe('CorrelationContext', () => {
    it('returns undefined outside of a run() scope', () => {
        expect(CorrelationContext.get()).toBeUndefined();
    });

    it('returns the correlationId inside run()', (done) => {
        CorrelationContext.run('test-id', () => {
            expect(CorrelationContext.get()).toBe('test-id');
            done();
        });
    });
});
