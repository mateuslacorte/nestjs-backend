import {
    Controller,
    All,
    Req,
    Res,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { Public } from '@modules/auth/decorators/public.decorator';
import { NoLog } from '@common/logtail/decorators/no-log.decorator';

@ApiExcludeController()
@NoLog() // Não logar requisições para rotas inexistentes
@Controller()
export class CatchAllController {
    constructor(private readonly securityService: SecurityService) {}

    /**
     * Captura todas as rotas que não existem
     * Registra tentativa e bloqueia IPs suspeitos
     */
    @All('*path')
    @Public()
    async handleNotFound(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const ip = this.getClientIp(req);
        const path = req.originalUrl || req.url;
        const userAgent = req.headers['user-agent'];

        // Ignorar rotas conhecidas como favicon, healthcheck, etc
        const ignoredPaths = ['/favicon.ico', '/robots.txt', '/health', '/healthcheck'];
        if (ignoredPaths.some(p => path.toLowerCase().startsWith(p))) {
            return res.status(HttpStatus.NOT_FOUND).json({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Rota não encontrada',
                path,
            });
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

        // Resposta padrão para rota não encontrada
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
