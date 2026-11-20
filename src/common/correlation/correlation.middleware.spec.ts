import { CorrelationMiddleware } from './correlation.middleware';
import { CorrelationContext } from './correlation-context';

function makeReq(correlationId?: string): any {
  return {
    headers: correlationId ? { 'x-correlation-id': correlationId } : {},
  };
}

function makeRes(): { setHeader: jest.Mock; header: jest.Mock } {
  return {
    setHeader: jest.fn(),
    header: jest.fn(),
  };
}

describe('CorrelationMiddleware', () => {
  let middleware: CorrelationMiddleware;

  beforeEach(() => {
    middleware = new CorrelationMiddleware();
  });

  it('reuses an existing X-Correlation-ID header', (done) => {
    const req = makeReq('my-correlation-id');
    const res = makeRes();

    middleware.use(req, res, () => {
      expect(CorrelationContext.get()).toBe('my-correlation-id');
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'my-correlation-id');
      done();
    });
  });

  it('generates a UUID v4 when X-Correlation-ID header is absent', (done) => {
    const req = makeReq();
    const res = makeRes();

    middleware.use(req, res, () => {
      const id = CorrelationContext.get();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', id);
      done();
    });
  });

  it('generates a UUID when header value is an empty string', (done) => {
    const req = makeReq('  ');
    const res = makeRes();

    middleware.use(req, res, () => {
      const id = CorrelationContext.get();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/);
      done();
    });
  });

  it('sets X-Correlation-ID on the response header', (done) => {
    const req = makeReq('test-id');
    const res = makeRes();

    middleware.use(req, res, () => {
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-id');
      done();
    });
  });

  it('falls back to res.header when setHeader is not available', (done) => {
    const req = makeReq('fallback-id');
    const res = { header: jest.fn() };

    middleware.use(req, res, () => {
      expect(res.header).toHaveBeenCalledWith('X-Correlation-ID', 'fallback-id');
      done();
    });
  });

  it('runs next without throwing when res has no header methods', (done) => {
    const req = makeReq('noop-id');
    const res = {};

    expect(() => {
      middleware.use(req, res, () => done());
    }).not.toThrow();
  });

  it('trims whitespace from an existing correlation ID header', (done) => {
    const req = makeReq('  trimmed-id  ');
    const res = makeRes();

    middleware.use(req, res, () => {
      expect(CorrelationContext.get()).toBe('trimmed-id');
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'trimmed-id');
      done();
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
