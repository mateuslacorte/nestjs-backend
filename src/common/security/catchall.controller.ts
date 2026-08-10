import {
    Controller,
    All,
    Req,
    Res,
    HttpStatus,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
    AppRequest,
    AppReply,
    requestOriginalUrl,
} from '@common/http/app-http';
import { SecurityService } from './security.service';
import { Public } from '@modules/auth/decorators/public.decorator';
import { NoLog } from '@common/graylog/decorators/no-log.decorator';
import { WikiRenderService } from '../../wiki/wiki-render.service';
import { getClientIp } from './utils/client-ip.util';

@ApiExcludeController()
@NoLog() // Do not log requests for nonexistent routes
@Controller()
export class CatchAllController {
    constructor(
        private readonly securityService: SecurityService,
        private readonly wikiRender: WikiRenderService,
    ) {}

    /**
     * Catches all nonexistent routes
     * Records the attempt and blocks suspicious IPs (except the wiki surface)
     */
    @All('*')
    @Public()
    async handleNotFound(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
    ) {
        const ip = getClientIp(req);
        const path = requestOriginalUrl(req);
        const userAgent = req.headers['user-agent'];

        // Wiki: HTML 404 without recording a suspicious attempt
        if (this.wikiRender.shouldRenderWikiNotFound(req, path)) {
            return this.wikiRender.renderNotFound(req, reply);
        }

        // Ignore known exact routes (favicon, robots, /health)
        const pathOnly = path.split('?')[0].toLowerCase();
        const ignoredPaths = [
            '/favicon.ico',
            '/favicon.svg',
            '/favicon-96x96.png',
            '/apple-touch-icon.png',
            '/site.webmanifest',
            '/web-app-manifest-192x192.png',
            '/web-app-manifest-512x512.png',
            '/robots.txt',
            '/health',
        ];
        if (ignoredPaths.includes(pathOnly)) {
            return this.sendNotFound(req, reply, path);
        }

        // Register the attempt
        const result = await this.securityService.registerInvalidRouteAttempt(
            ip,
            path,
            typeof userAgent === 'string' ? userAgent : undefined,
        );

        // Already blocked or just became blocked
        if (result.blocked) {
            console.warn(`[SECURITY] Access blocked for IP ${ip} at ${path}`);
            return reply.status(HttpStatus.FORBIDDEN).send({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Access blocked. Your IP was flagged for suspicious behavior.',
                timestamp: new Date().toISOString(),
            });
        }

        return this.sendNotFound(req, reply, path);
    }

    private sendNotFound(_req: AppRequest, reply: AppReply, path: string) {
        return reply.status(HttpStatus.NOT_FOUND).send({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Route not found',
            path,
            timestamp: new Date().toISOString(),
        });
    }

}
