import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { GraylogService } from './graylog.service';

@Catch()
export class GraylogExceptionFilter implements ExceptionFilter {
    constructor(private readonly graylogService: GraylogService) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();
        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception instanceof Error ? exception.message : 'Internal server error';

        this.graylogService.error(
            exception instanceof Error ? exception : message,
            {
                path: request.url,
                method: request.method,
                body: request.body,
                query: request.query,
                params: request.params,
                headers: this.extractSafeHeaders(request.headers),
                status,
            },
        );

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }

    private extractSafeHeaders(headers: Request['headers']): Record<string, string> {
        const safeHeaderNames = [
            'user-agent',
            'host',
            'content-type',
            'content-length',
            'accept',
            'accept-language',
            'accept-encoding',
            'origin',
            'referer',
            'x-forwarded-for',
            'x-real-ip',
            'x-request-id',
        ];
        const result: Record<string, string> = {};

        for (const name of safeHeaderNames) {
            if (headers[name]) {
                result[name] = String(headers[name]);
            }
        }

        if (headers.authorization) {
            result.authorization = '[PRESENT]';
        }

        return result;
    }
}
