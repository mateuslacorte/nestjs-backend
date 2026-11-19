/**
 * OpenTelemetry bootstrap — must be the FIRST import in main.ts so instrumentation
 * patches are applied before NestJS / Fastify / ioredis / pg / mongoose load.
 *
 * Enable with:  OTEL_ENABLED=true
 * Collector:    OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces  (default)
 * Service name: OTEL_SERVICE_NAME=nestjs-backend  (default)
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import type { SpanProcessor } from '@opentelemetry/sdk-trace';
import type { Context } from '@opentelemetry/api';
import { CorrelationContext } from './common/correlation/correlation-context';

class CorrelationSpanProcessor implements SpanProcessor {
  onStart(span: { setAttribute(key: string, value: string): void }, _parentContext: Context): void {
    const id = CorrelationContext.get();
    if (id) span.setAttribute('correlation.id', id);
  }

  onEnd(): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

let sdk: NodeSDK | null = null;

if (process.env.OTEL_ENABLED === 'true') {
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'nestjs-backend',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        'http://localhost:4318/v1/traces',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation creates enormous noise — disable it
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
    spanProcessors: [new CorrelationSpanProcessor()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk!
      .shutdown()
      .catch((err) => console.error('OTel shutdown error', err));
  });
}

export { sdk };
