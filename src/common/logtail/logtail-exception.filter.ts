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

        // Extrair apenas headers seguros (sem referências circulares)
        const safeHeaders = this.extractSafeHeaders(request.headers);

        // Log the exception to BetterStack
        this.logtailService.error(exception, {
            path: request.url,
            method: request.method,
            body: this.sanitizeBody(request.body),
            query: request.query,
            params: request.params,
            headers: safeHeaders,
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

    /**
     * Extrai apenas headers seguros para logging
     */
    private extractSafeHeaders(headers: any): Record<string, string> {
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

        // Indicar se tem authorization sem expor o valor
        if (headers['authorization']) {
            result['authorization'] = '[PRESENT]';
        }

        return result;
    }

    /**
     * Sanitiza o body para evitar circular references
     */
    private sanitizeBody(body: any): any {
        if (!body) return body;

        try {
            // Tenta serializar, se falhar retorna placeholder
            JSON.stringify(body);
            return body;
        } catch (e) {
            return '[Complex Body - Circular Reference]';
        }
    }
}