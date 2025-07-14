import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogtailService } from './logtail.service';

@Injectable()
export class LogtailInterceptor implements NestInterceptor {
    constructor(private readonly logtailService: LogtailService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const { method, url, body, query, params, headers } = req;
        const userAgent = headers['user-agent'] || '';
        const ip = req.ip || '';

        // Log the request
        this.logtailService.log(`Request: ${method} ${url}`, {
            type: 'request',
            method,
            url,
            body,
            query,
            params,
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

    private sanitizeData(data: any): any {
        // Implement data sanitization to avoid logging sensitive information
        if (!data) return data;

        try {
            // Create a shallow copy
            const sanitized = { ...data };

            // Remove sensitive fields
            const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
            sensitiveFields.forEach(field => {
                if (field in sanitized) {
                    sanitized[field] = '[REDACTED]';
                }
            });

            return sanitized;
        } catch (e) {
            return '[Complex Data]';
        }
    }
}