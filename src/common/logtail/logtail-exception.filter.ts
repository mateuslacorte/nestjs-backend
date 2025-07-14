import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { LogtailService } from './logtail.service';
import { Request, Response } from 'express';

@Catch()
export class LogtailExceptionFilter implements ExceptionFilter {
    constructor(private readonly logtailService: LogtailService) {}

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.message
                : exception.message || 'Internal server error';

        // Log the exception to BetterStack
        this.logtailService.error(exception, {
            path: request.url,
            method: request.method,
            body: request.body,
            query: request.query,
            params: request.params,
            headers: request.headers,
            status,
        });

        // Send response to client
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }
}