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
import {
    buildWikiLocaleCookie,
    isWikiLocale,
} from './i18n/wiki-locale';
import { WikiRenderService } from './wiki-render.service';

type WikiPage =
    | 'home'
    | 'architecture'
    | 'backend'
    | 'backend-install'
    | 'auth'
    | 'users'
    | 'email'
    | 'whatsapp'
    | 'websocket';

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
        return this.renderPage(req, res, lang, 'pages/home', 'home', 'home');
    }

    @Get('architecture')
    getArchitecture(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.renderPage(
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
        return this.renderPage(
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
        return this.renderPage(
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
        return this.renderPage(req, res, lang, 'pages/auth', 'auth', 'auth');
    }

    @Get('users')
    getUsers(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.renderPage(req, res, lang, 'pages/users', 'users', 'users');
    }

    @Get('email')
    getEmail(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.renderPage(req, res, lang, 'pages/email', 'email', 'email');
    }

    @Get('whatsapp')
    getWhatsapp(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.renderPage(
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
        return this.renderPage(
            req,
            res,
            lang,
            'pages/websocket',
            'websocket',
            'websocket',
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

    private renderPage(
        req: Request,
        res: Response,
        lang: string | undefined,
        view: string,
        metaNamespace: string,
        currentPage: WikiPage,
    ) {
        if (isWikiLocale(lang)) {
            res.setHeader('Set-Cookie', buildWikiLocaleCookie(lang));
            const cleanUrl = req.path;
            return res.redirect(302, cleanUrl);
        }

        const locale = this.wikiRender.resolveLocale(req);
        return res.render(
            view,
            this.wikiRender.buildLocals(locale, {
                titleKey: `${metaNamespace}.meta.title`,
                currentPage,
            }),
        );
    }
}
