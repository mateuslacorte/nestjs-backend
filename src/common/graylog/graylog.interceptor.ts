import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NO_LOG_KEY } from './decorators/no-log.decorator';
import { GraylogService } from './graylog.service';

@Injectable()
export class GraylogInterceptor implements NestInterceptor {
    constructor(
        private readonly graylogService: GraylogService,
        private readonly reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const noLog = this.reflector.getAllAndOverride<boolean>(NO_LOG_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (noLog) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const { method, url, body, query, params, headers } = request;
        const startedAt = Date.now();

        this.graylogService.log(`Request: ${method} ${url}`, {
            type: 'request',
            method,
            url,
            body,
            query,
            params,
            userAgent: headers['user-agent'] || '',
            ip: request.ip || '',
        });

        return next.handle().pipe(
            tap({
                next: (data) => {
                    this.graylogService.log(`Response: ${method} ${url} ${Date.now() - startedAt}ms`, {
                        type: 'response',
                        method,
                        url,
                        responseTime: Date.now() - startedAt,
                        status: context.switchToHttp().getResponse().statusCode,
                        data,
                    });
                },
                error: () => {
                    this.graylogService.log(`Error Response: ${method} ${url} ${Date.now() - startedAt}ms`, {
                        type: 'errorResponse',
                        method,
                        url,
                        responseTime: Date.now() - startedAt,
                    }, 'error');
                },
            }),
        );
    }
}
