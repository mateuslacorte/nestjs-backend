import {
    Controller,
    Get,
    Res,
    Req,
    Query,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
    AppRequest,
    AppReply,
} from '@common/http/app-http';
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
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/home',
            'home',
            'home',
        );
    }

    @Get('architecture')
    getArchitecture(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/architecture',
            'architecture',
            'architecture',
        );
    }

    @Get('backend')
    getBackend(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/backend',
            'backend',
            'backend',
        );
    }

    @Get('backend/install')
    getBackendInstall(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/backend-install',
            'backendInstall',
            'backend-install',
        );
    }

    @Get('backend/migrations')
    getBackendMigrations(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/backend-migrations',
            'backendMigrations',
            'backend-migrations',
        );
    }

    @Get('auth')
    getAuth(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth',
            'auth',
            'auth',
        );
    }

    @Get('auth/active-directory')
    getAuthActiveDirectory(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-active-directory',
            'authActiveDirectory',
            'auth-active-directory',
        );
    }

    @Get('auth/active-directory/ldap')
    getAuthActiveDirectoryLdap(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-active-directory-ldap',
            'authActiveDirectoryLdap',
            'auth-active-directory-ldap',
        );
    }

    @Get('auth/active-directory/ldaps')
    getAuthActiveDirectoryLdaps(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-active-directory-ldaps',
            'authActiveDirectoryLdaps',
            'auth-active-directory-ldaps',
        );
    }

    @Get('auth/social')
    getAuthSocial(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social',
            'authSocial',
            'auth-social',
        );
    }

    @Get('auth/social/google')
    getAuthSocialGoogle(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-google',
            'authSocialGoogle',
            'auth-social-google',
        );
    }

    @Get('auth/social/facebook')
    getAuthSocialFacebook(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-facebook',
            'authSocialFacebook',
            'auth-social-facebook',
        );
    }

    @Get('auth/social/twitter')
    getAuthSocialTwitter(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-twitter',
            'authSocialTwitter',
            'auth-social-twitter',
        );
    }

    @Get('auth/social/github')
    getAuthSocialGithub(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-github',
            'authSocialGithub',
            'auth-social-github',
        );
    }

    @Get('auth/social/figma')
    getAuthSocialFigma(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-figma',
            'authSocialFigma',
            'auth-social-figma',
        );
    }

    @Get('auth/social/linkedin')
    getAuthSocialLinkedin(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-linkedin',
            'authSocialLinkedin',
            'auth-social-linkedin',
        );
    }

    @Get('auth/social/slack')
    getAuthSocialSlack(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-slack',
            'authSocialSlack',
            'auth-social-slack',
        );
    }

    @Get('auth/social/atlassian')
    getAuthSocialAtlassian(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-atlassian',
            'authSocialAtlassian',
            'auth-social-atlassian',
        );
    }

    @Get('auth/social/gitlab')
    getAuthSocialGitlab(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-gitlab',
            'authSocialGitlab',
            'auth-social-gitlab',
        );
    }

    @Get('auth/social/bitbucket')
    getAuthSocialBitbucket(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-bitbucket',
            'authSocialBitbucket',
            'auth-social-bitbucket',
        );
    }

    @Get('auth/social/discord')
    getAuthSocialDiscord(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-discord',
            'authSocialDiscord',
            'auth-social-discord',
        );
    }

    @Get('auth/social/twitch')
    getAuthSocialTwitch(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-twitch',
            'authSocialTwitch',
            'auth-social-twitch',
        );
    }

    @Get('auth/social/amazon')
    getAuthSocialAmazon(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-amazon',
            'authSocialAmazon',
            'auth-social-amazon',
        );
    }

    @Get('auth/social/patreon')
    getAuthSocialPatreon(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-patreon',
            'authSocialPatreon',
            'auth-social-patreon',
        );
    }

    @Get('auth/social/dropbox')
    getAuthSocialDropbox(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-dropbox',
            'authSocialDropbox',
            'auth-social-dropbox',
        );
    }

    @Get('auth/social/metamask')
    getAuthSocialMetamask(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-metamask',
            'authSocialMetamask',
            'auth-social-metamask',
        );
    }

    @Get('auth/social/steam')
    getAuthSocialSteam(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-steam',
            'authSocialSteam',
            'auth-social-steam',
        );
    }

    @Get('auth/social/reddit')
    getAuthSocialReddit(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-reddit',
            'authSocialReddit',
            'auth-social-reddit',
        );
    }

    @Get('auth/social/apple')
    getAuthSocialApple(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/auth-social-apple',
            'authSocialApple',
            'auth-social-apple',
        );
    }

    @Get('email')
    getEmail(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/email',
            'email',
            'email',
        );
    }

    @Get('whatsapp')
    getWhatsapp(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/whatsapp',
            'whatsapp',
            'whatsapp',
        );
    }

    @Get('websocket')
    getWebsocket(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/websocket',
            'websocket',
            'websocket',
        );
    }

    @Get('wsui')
    getWsui(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/wsui',
            'wsui',
            'wsui',
        );
    }

    @Get('security')
    getSecurity(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/security',
            'security',
            'security',
        );
    }

    @Get('security/audit')
    getSecurityAudit(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/security-audit',
            'securityAudit',
            'security-audit',
        );
    }

    @Get('tests')
    getTests(
        @Req() req: AppRequest,
        @Res() reply: AppReply,
        @Query('lang') lang?: string,
    ) {
        return this.wikiRender.renderPage(
            req,
            reply,
            lang,
            'pages/tests',
            'tests',
            'tests',
        );
    }

    @Get('404')
    getNotFoundPreview(@Req() req: AppRequest, @Res() reply: AppReply) {
        return this.wikiRender.renderNotFound(req, reply);
    }

    @Get('500')
    getServerErrorPreview(@Req() req: AppRequest, @Res() reply: AppReply) {
        return this.wikiRender.renderServerError(req, reply);
    }

    // Static assets are served by @fastify/static via useStaticAssets in main.ts
    // (prefix /static/). Do not also register @Get('static/*') — Fastify rejects
    // duplicate GET /static/* routes.
}
