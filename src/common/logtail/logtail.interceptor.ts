import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogtailService } from './logtail.service';
import { NO_LOG_KEY } from './decorators/no-log.decorator';

@Injectable()
export class LogtailInterceptor implements NestInterceptor {
    constructor(
        private readonly logtailService: LogtailService,
        private readonly reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // Verificar se a rota tem o decorator @NoLog()
        const noLog = this.reflector.getAllAndOverride<boolean>(NO_LOG_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Se tiver o decorator, não logar nada e apenas passar a requisição
        if (noLog) {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest();
        const { method, url, body, query, params, headers } = req;
        const userAgent = headers['user-agent'] || '';
        const ip = req.ip || '';

        // Log the request (sanitize body para evitar circular references)
        this.logtailService.log(`Request: ${method} ${url}`, {
            type: 'request',
            method,
            url,
            body: this.sanitizeData(body),
            query: this.sanitizeData(query),
            params: this.sanitizeData(params),
            userAgent,
            ip,
        });

        const now = Date.now();
        return next.handle().pipe(
            tap({
                next: (data) => {
                    const responseTime = Date.now() - now;
                    // Log the successful response
                    this.logtailService.log(`Response: ${method} ${url} ${responseTime}ms`, {
                        type: 'response',
                        method,
                        url,
                        responseTime,
                        status: context.switchToHttp().getResponse().statusCode,
                        data: this.sanitizeData(data),
                    });
                },
                error: (error) => {
                    const responseTime = Date.now() - now;
                    // Error is already logged by the exception filter, just log response time
                    this.logtailService.log(`Error Response: ${method} ${url} ${responseTime}ms`, {
                        type: 'errorResponse',
                        method,
                        url,
                        responseTime,
                    });
                },
            }),
        );
    }

    /**
     * Sanitiza dados removendo referências circulares e campos sensíveis
     */
    private sanitizeData(data: any, maxDepth: number = 5): any {
        if (!data) return data;

        const seen = new WeakSet();
        const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie', 'cookies'];

        const sanitize = (value: any, depth: number): any => {
            if (depth > maxDepth) {
                return '[Max Depth]';
            }

            if (value === null || value === undefined) {
                return value;
            }

            if (typeof value !== 'object') {
                return value;
            }

            // Detectar referência circular
            if (seen.has(value)) {
                return '[Circular]';
            }

            // Arrays
            if (Array.isArray(value)) {
                seen.add(value);
                return value.slice(0, 100).map(item => sanitize(item, depth + 1));
            }

            // Date
            if (value instanceof Date) {
                return value.toISOString();
            }

            // Buffer
            if (Buffer.isBuffer(value)) {
                return '[Buffer]';
            }

            // Streams
            if (value.pipe || value._readableState || value._writableState) {
                return '[Stream]';
            }

            // Objetos
            seen.add(value);
            const result: any = {};

            for (const key of Object.keys(value)) {
                try {
                    if (sensitiveFields.includes(key.toLowerCase())) {
                        result[key] = '[REDACTED]';
                        continue;
                    }

                    const val = value[key];

                    if (typeof val === 'function') {
                        continue;
                    }

                    result[key] = sanitize(val, depth + 1);
                } catch (e) {
                    result[key] = '[Error]';
                }
            }

            return result;
        };

        try {
            return sanitize(data, 0);
        } catch (e) {
            return '[Serialization Error]';
        }
    }
}