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

    @Get('auth/active-directory')
    getAuthActiveDirectory(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-active-directory',
            'authActiveDirectory',
            'auth-active-directory',
        );
    }

    @Get('auth/active-directory/ldap')
    getAuthActiveDirectoryLdap(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-active-directory-ldap',
            'authActiveDirectoryLdap',
            'auth-active-directory-ldap',
        );
    }

    @Get('auth/active-directory/ldaps')
    getAuthActiveDirectoryLdaps(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-active-directory-ldaps',
            'authActiveDirectoryLdaps',
            'auth-active-directory-ldaps',
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

    @Get('auth/social/twitter')
    getAuthSocialTwitter(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-twitter',
            'authSocialTwitter',
            'auth-social-twitter',
        );
    }

    @Get('auth/social/github')
    getAuthSocialGithub(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-github',
            'authSocialGithub',
            'auth-social-github',
        );
    }

    @Get('auth/social/figma')
    getAuthSocialFigma(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-figma',
            'authSocialFigma',
            'auth-social-figma',
        );
    }

    @Get('auth/social/linkedin')
    getAuthSocialLinkedin(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-linkedin',
            'authSocialLinkedin',
            'auth-social-linkedin',
        );
    }

    @Get('auth/social/slack')
    getAuthSocialSlack(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-slack',
            'authSocialSlack',
            'auth-social-slack',
        );
    }

    @Get('auth/social/atlassian')
    getAuthSocialAtlassian(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-atlassian',
            'authSocialAtlassian',
            'auth-social-atlassian',
        );
    }

    @Get('auth/social/gitlab')
    getAuthSocialGitlab(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-gitlab',
            'authSocialGitlab',
            'auth-social-gitlab',
        );
    }

    @Get('auth/social/bitbucket')
    getAuthSocialBitbucket(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-bitbucket',
            'authSocialBitbucket',
            'auth-social-bitbucket',
        );
    }

    @Get('auth/social/discord')
    getAuthSocialDiscord(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-discord',
            'authSocialDiscord',
            'auth-social-discord',
        );
    }

    @Get('auth/social/twitch')
    getAuthSocialTwitch(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-twitch',
            'authSocialTwitch',
            'auth-social-twitch',
        );
    }

    @Get('auth/social/spotify')
    getAuthSocialSpotify(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-spotify',
            'authSocialSpotify',
            'auth-social-spotify',
        );
    }

    @Get('auth/social/amazon')
    getAuthSocialAmazon(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-amazon',
            'authSocialAmazon',
            'auth-social-amazon',
        );
    }

    @Get('auth/social/microsoft')
    getAuthSocialMicrosoft(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-microsoft',
            'authSocialMicrosoft',
            'auth-social-microsoft',
        );
    }

    @Get('auth/social/patreon')
    getAuthSocialPatreon(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-patreon',
            'authSocialPatreon',
            'auth-social-patreon',
        );
    }

    @Get('auth/social/dropbox')
    getAuthSocialDropbox(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-dropbox',
            'authSocialDropbox',
            'auth-social-dropbox',
        );
    }

    @Get('auth/social/coinbase')
    getAuthSocialCoinbase(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-coinbase',
            'authSocialCoinbase',
            'auth-social-coinbase',
        );
    }

    @Get('auth/social/metamask')
    getAuthSocialMetamask(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-metamask',
            'authSocialMetamask',
            'auth-social-metamask',
        );
    }

    @Get('auth/social/steam')
    getAuthSocialSteam(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-steam',
            'authSocialSteam',
            'auth-social-steam',
        );
    }

    @Get('auth/social/reddit')
    getAuthSocialReddit(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-reddit',
            'authSocialReddit',
            'auth-social-reddit',
        );
    }

    @Get('auth/social/apple')
    getAuthSocialApple(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/auth-social-apple',
            'authSocialApple',
            'auth-social-apple',
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

    @Get('tests')
    getTests(
        @Req() req: Request,
        @Res() res: Response,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/tests',
            'tests',
            'tests',
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
