import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { context, propagation, trace } from '@opentelemetry/api';
import { addOtelPropagationInterceptor } from './otel-http.interceptor';

jest.mock('@opentelemetry/api', () => ({
  trace: { getActiveSpan: jest.fn() },
  propagation: { inject: jest.fn() },
  context: { active: jest.fn() },
}));

const mockGetActiveSpan = trace.getActiveSpan as jest.Mock;
const mockInject = propagation.inject as jest.Mock;
const mockActive = context.active as jest.Mock;

function makeInstance(): {
  instance: AxiosInstance;
  capturedHandler: () => (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
} {
  let handler!: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  const instance = {
    interceptors: {
      request: {
        use: jest.fn((fn: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig) => {
          handler = fn;
          return 0;
        }),
      },
    },
  } as unknown as AxiosInstance;
  return { instance, capturedHandler: () => handler };
}

describe('addOtelPropagationInterceptor', () => {
  const originalOtelEnabled = process.env.OTEL_ENABLED;

  beforeEach(() => {
    mockActive.mockReturnValue({});
  });

  afterEach(() => {
    if (originalOtelEnabled === undefined) {
      delete process.env.OTEL_ENABLED;
    } else {
      process.env.OTEL_ENABLED = originalOtelEnabled;
    }
  });

  it('registers a request interceptor on the axios instance', () => {
    const { instance } = makeInstance();
    addOtelPropagationInterceptor(instance);
    expect(
      (instance.interceptors.request.use as jest.Mock).mock.calls.length,
    ).toBe(1);
  });

  it('injects traceparent header when OTEL_ENABLED=true and span is active', () => {
    process.env.OTEL_ENABLED = 'true';
    const { instance, capturedHandler } = makeInstance();
    addOtelPropagationInterceptor(instance);

    const mockSpan = {};
    mockGetActiveSpan.mockReturnValue(mockSpan);
    mockInject.mockImplementation(
      (_ctx: unknown, carrier: Record<string, string>) => {
        carrier['traceparent'] = '00-traceid-spanid-01';
      },
    );

    const config = { headers: {} } as InternalAxiosRequestConfig;
    const result = capturedHandler()(config);

    expect(mockGetActiveSpan).toHaveBeenCalled();
    expect(mockInject).toHaveBeenCalledWith({}, config.headers);
    expect((result.headers as Record<string, string>)['traceparent']).toBe(
      '00-traceid-spanid-01',
    );
  });

  it('skips injection when OTEL_ENABLED=true but no active span', () => {
    process.env.OTEL_ENABLED = 'true';
    const { instance, capturedHandler } = makeInstance();
    addOtelPropagationInterceptor(instance);

    mockGetActiveSpan.mockReturnValue(undefined);

    const config = { headers: {} } as InternalAxiosRequestConfig;
    capturedHandler()(config);

    expect(mockGetActiveSpan).toHaveBeenCalled();
    expect(mockInject).not.toHaveBeenCalled();
  });

  it('skips span lookup and injection when OTEL_ENABLED is not set', () => {
    delete process.env.OTEL_ENABLED;
    const { instance, capturedHandler } = makeInstance();
    addOtelPropagationInterceptor(instance);

    const config = { headers: {} } as InternalAxiosRequestConfig;
    capturedHandler()(config);

    expect(mockGetActiveSpan).not.toHaveBeenCalled();
    expect(mockInject).not.toHaveBeenCalled();
  });

  it('skips span lookup and injection when OTEL_ENABLED=false', () => {
    process.env.OTEL_ENABLED = 'false';
    const { instance, capturedHandler } = makeInstance();
    addOtelPropagationInterceptor(instance);

    const config = { headers: {} } as InternalAxiosRequestConfig;
    capturedHandler()(config);

    expect(mockGetActiveSpan).not.toHaveBeenCalled();
    expect(mockInject).not.toHaveBeenCalled();
  });
});
