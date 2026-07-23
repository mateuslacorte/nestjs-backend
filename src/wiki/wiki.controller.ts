import {
    Controller,
    Get,
    Param,
    Res,
    Req,
    Query,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as path from 'path';
import { Public } from '../modules/auth/decorators/public.decorator';
import { NoLog } from '@common/graylog/decorators/no-log.decorator';
import { WikiRenderService } from './wiki-render.service';

@ApiExcludeController()
@NoLog()
@Public()
@Controller()
export class WikiController {
    constructor(private readonly wikiRender: WikiRenderService) {}

    @Get()
    getHome(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/home',
            'home',
            'home',
        );
    }

    @Get('architecture')
    getArchitecture(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/architecture',
            'architecture',
            'architecture',
        );
    }

    @Get('backend')
    getBackend(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/backend',
            'backend',
            'backend',
        );
    }

    @Get('backend/install')
    getBackendInstall(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/backend-install',
            'backendInstall',
            'backend-install',
        );
    }

    @Get('auth')
    getAuth(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth',
            'auth',
            'auth',
        );
    }

    @Get('auth/social')
    getAuthSocial(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social',
            'authSocial',
            'auth-social',
        );
    }

    @Get('auth/social/google')
    getAuthSocialGoogle(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-google',
            'authSocialGoogle',
            'auth-social-google',
        );
    }

    @Get('auth/social/facebook')
    getAuthSocialFacebook(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-facebook',
            'authSocialFacebook',
            'auth-social-facebook',
        );
    }

    // GET /users is registered in main.ts (Express) so it does not collide with
    // UsersController GET /api/{version}/users via setGlobalPrefix exclude.

    @Get('email')
    getEmail(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/email',
            'email',
            'email',
        );
    }

    @Get('whatsapp')
    getWhatsapp(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/whatsapp',
            'whatsapp',
            'whatsapp',
        );
    }

    @Get('websocket')
    getWebsocket(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/websocket',
            'websocket',
            'websocket',
        );
    }

    @Get('wsui')
    getWsui(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/wsui',
            'wsui',
            'wsui',
        );
    }

    @Get('security')
    getSecurity(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/security',
            'security',
            'security',
        );
    }

    @Get('404')
    getNotFoundPreview(@Req() req: Request, @Res() res: Response) {
        return this.wikiRender.renderNotFound(req, res);
    }

    @Get('500')
    getServerErrorPreview(@Req() req: Request, @Res() res: Response) {
        return this.wikiRender.renderServerError(req, res);
    }

    @Get('static/*')
    serveStatic(@Param('0') filePath: string, @Res() res: Response) {
        const fullPath = path.join(__dirname, 'public', filePath);
        return res.sendFile(fullPath);
    }
}
