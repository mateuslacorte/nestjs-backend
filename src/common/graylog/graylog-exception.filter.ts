import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import {
    AppRequest,
    AppReply,
    requestOriginalUrl,
} from '@common/http/app-http';
import { GraylogService } from './graylog.service';
import { WikiRenderService } from '../../wiki/wiki-render.service';

@Catch()
export class GraylogExceptionFilter implements ExceptionFilter {
    /* istanbul ignore next -- Nest DI constructor parameter emit */
    constructor(
        private readonly graylogService: GraylogService,
        private readonly wikiRender: WikiRenderService,
    ) {}

    async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
        const context = host.switchToHttp();
        const response = context.getResponse<AppReply>();
        const request = context.getRequest<AppRequest>();
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

        const path = requestOriginalUrl(request);

        // Wiki HTML errors only; API / health / GraphQL keep JSON responses.
        if (
            status === HttpStatus.NOT_FOUND &&
            this.wikiRender.shouldRenderWikiNotFound(request, path)
        ) {
            await this.wikiRender.renderNotFound(request, response);
            return;
        }

        if (
            status >= HttpStatus.INTERNAL_SERVER_ERROR &&
            this.wikiRender.shouldRenderWikiServerError(request, path)
        ) {
            await this.wikiRender.renderServerError(request, response);
            return;
        }

        response.status(status).send({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }

    private extractSafeHeaders(headers: AppRequest['headers']): Record<string, string> {
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
