import {
    Controller,
    All,
    Req,
    Res,
    Next,
    HttpStatus,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { Public } from '@modules/auth/decorators/public.decorator';
import { NoLog } from '@common/graylog/decorators/no-log.decorator';
import { WikiRenderService } from '../../wiki/wiki-render.service';

@ApiExcludeController()
@NoLog() // Não logar requisições para rotas inexistentes
@Controller()
export class CatchAllController {
    constructor(
        private readonly securityService: SecurityService,
        private readonly wikiRender: WikiRenderService,
    ) {}

    /**
     * Captura todas as rotas que não existem
     * Registra tentativa e bloqueia IPs suspeitos (exceto superfície da wiki)
     */
    @All('*path')
    @Public()
    async handleNotFound(
        @Req() req: Request,
        @Res() res: Response,
        @Next() next: NextFunction,
    ) {
        const ip = this.getClientIp(req);
        const path = req.originalUrl || req.url;
        const userAgent = req.headers['user-agent'];

        // O middleware do GraphQL (Apollo) é registrado depois das rotas dos
        // controllers, então o catch-all precisa deixar a requisição passar
        const graphqlPath = process.env.GRAPHQL_PATH || '/graphql';
        if (path.split('?')[0] === graphqlPath) {
            return next();
        }

        // Wiki: 404 HTML sem registrar como tentativa suspeita
        if (this.wikiRender.shouldRenderWikiNotFound(req, path)) {
            return this.wikiRender.renderNotFound(req, res);
        }

        // Ignorar rotas exatas conhecidas (favicon, robots, /health)
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
            return this.sendNotFound(req, res, path);
        }

        // Registrar tentativa
        const result = await this.securityService.registerInvalidRouteAttempt(
            ip,
            path,
            userAgent,
        );

        // Se já estava bloqueado ou acabou de ser bloqueado
        if (result.blocked) {
            console.warn(`[SECURITY] Acesso bloqueado para IP ${ip} em ${path}`);
            return res.status(HttpStatus.FORBIDDEN).json({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Acesso bloqueado. Seu IP foi registrado por comportamento suspeito.',
                timestamp: new Date().toISOString(),
            });
        }

        return this.sendNotFound(req, res, path);
    }

    private sendNotFound(req: Request, res: Response, path: string) {
        return res.status(HttpStatus.NOT_FOUND).json({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Rota não encontrada',
            path,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Extrai o IP real do cliente considerando proxies
     */
    private getClientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
            return ips.trim();
        }
        
        const realIp = req.headers['x-real-ip'];
        if (realIp) {
            return Array.isArray(realIp) ? realIp[0] : realIp;
        }

        return req.ip || req.socket?.remoteAddress || 'unknown';
    }
}
