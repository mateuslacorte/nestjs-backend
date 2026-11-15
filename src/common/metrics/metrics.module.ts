import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
    makeCounterProvider,
    makeHistogramProvider,
    PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
    imports: [
        PrometheusModule.register({
            defaultMetrics: { enabled: true },
        }),
    ],
    providers: [
        makeCounterProvider({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
        }),
        makeHistogramProvider({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route'],
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        }),
        MetricsInterceptor,
        {
            provide: APP_INTERCEPTOR,
            useClass: MetricsInterceptor,
        },
    ],
    exports: [PrometheusModule],
})
export class MetricsModule {}
