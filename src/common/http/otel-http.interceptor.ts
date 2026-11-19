import { context, propagation, trace } from '@opentelemetry/api';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export function addOtelPropagationInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      if (process.env.OTEL_ENABLED !== 'true') {
        return config;
      }
      const span = trace.getActiveSpan();
      if (!span) {
        return config;
      }
      propagation.inject(
        context.active(),
        config.headers as unknown as Record<string, unknown>,
      );
      return config;
    },
  );
}
