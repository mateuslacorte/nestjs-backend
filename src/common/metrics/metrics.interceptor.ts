import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    private readonly requestCounter: Counter<string>;
    private readonly requestDuration: Histogram<string>;

    // `unknown` avoids TypeScript emitDecoratorMetadata typeof-conditional branches
    constructor(
        @InjectMetric('http_requests_total') requestCounter: unknown,
        @InjectMetric('http_request_duration_seconds') requestDuration: unknown,
    ) {
        this.requestCounter = requestCounter as Counter<string>;
        this.requestDuration = requestDuration as Histogram<string>;
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest<{
            method: string;
            url?: string;
            routerPath?: string;
        }>();
        const res = context.switchToHttp().getResponse<{ statusCode: number }>();
        const start = process.hrtime.bigint();

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Number(process.hrtime.bigint() - start) / 1e9;
                    const route = req.routerPath ?? req.url ?? 'unknown';
                    const statusCode = String(res.statusCode);
                    this.requestCounter.inc({ method: req.method, route, status_code: statusCode });
                    this.requestDuration.observe({ method: req.method, route }, duration);
                },
                error: (err: { status?: number; statusCode?: number } | null) => {
                    const duration = Number(process.hrtime.bigint() - start) / 1e9;
                    const route = req.routerPath ?? req.url ?? 'unknown';
                    const statusCode = String(err?.status ?? err?.statusCode ?? 500);
                    this.requestCounter.inc({ method: req.method, route, status_code: statusCode });
                    this.requestDuration.observe({ method: req.method, route }, duration);
                },
            }),
        );
    }
}
