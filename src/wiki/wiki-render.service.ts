import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WikiI18nService } from './i18n/wiki-i18n.service';
import {
    parseCookieHeader,
    resolveWikiLocale,
    WIKI_LOCALE_COOKIE,
    WIKI_LOCALE_META,
    WIKI_LOCALES,
    WikiLocale,
} from './i18n/wiki-locale';

@Injectable()
export class WikiRenderService {
    constructor(
        private readonly i18n: WikiI18nService,
        private readonly configService: ConfigService,
    ) {}

    prefersHtml(req: Request): boolean {
        const accept = (req.headers.accept || '').toLowerCase();
        if (accept.includes('application/json') && !accept.includes('text/html')) {
            return false;
        }
        if (!accept || accept.includes('*/*') || accept.includes('text/html')) {
            return true;
        }
        return false;
    }

    /** API, health, GraphQL (e Swagger) — sempre JSON / tratativa própria. */
    isInfrastructurePath(urlPath: string): boolean {
        const pathOnly = urlPath.split('?')[0];
        const graphqlPath =
            this.configService.get<string>('graphql.path') || '/graphql';

        return (
            pathOnly === '/api' ||
            pathOnly.startsWith('/api/') ||
            pathOnly === '/health' ||
            pathOnly.startsWith('/health/') ||
            pathOnly.startsWith('/healthcheck') ||
            pathOnly === graphqlPath ||
            pathOnly.startsWith(`${graphqlPath}/`) ||
            pathOnly.startsWith('/swagger')
        );
    }

    shouldRenderWikiNotFound(req: Request, urlPath: string): boolean {
        return (
            !this.isInfrastructurePath(urlPath) && this.prefersHtml(req)
        );
    }

    shouldRenderWikiServerError(req: Request, urlPath: string): boolean {
        return (
            !this.isInfrastructurePath(urlPath) && this.prefersHtml(req)
        );
    }

    resolveLocale(req: Request): WikiLocale {
        const cookies = parseCookieHeader(req.headers.cookie);
        return resolveWikiLocale(
            req.headers['accept-language'],
            cookies[WIKI_LOCALE_COOKIE],
        );
    }

    buildLocals(
        locale: WikiLocale,
        options: {
            titleKey: string;
            currentPage?: string;
            statusCode?: number;
            requestPath?: string;
        },
    ) {
        const t = (key: string) => this.i18n.t(locale, key);
        const tm = (key: string) => this.i18n.get(locale, key);
        const apiPrefix =
            this.configService.get<string>('app.apiPrefix') || 'api/v1';

        return {
            locale,
            htmlLang: locale,
            title: t(options.titleKey),
            currentPage: options.currentPage ?? '',
            statusCode: options.statusCode,
            requestPath: options.requestPath,
            t,
            tm,
            wikiPath: (suffix = '') => (suffix ? suffix : '/'),
            apiBasePath: `/${apiPrefix}`,
            swaggerPath: '/swagger',
            healthPath: '/health',
            graphqlPath:
                this.configService.get<string>('graphql.path') || '/graphql',
            locales: WIKI_LOCALES.map((code) => ({
                code,
                flag: WIKI_LOCALE_META[code].flag,
                label: WIKI_LOCALE_META[code].label,
                short: WIKI_LOCALE_META[code].short,
                href: `?lang=${code}`,
                active: code === locale,
            })),
        };
    }

    renderNotFound(req: Request, res: Response): void {
        const locale = this.resolveLocale(req);
        res.status(404).render(
            'pages/error-404',
            this.buildLocals(locale, {
                titleKey: 'errors.notFound.meta.title',
                currentPage: 'error-404',
                statusCode: 404,
                requestPath: req.originalUrl || req.url,
            }),
        );
    }

    renderServerError(req: Request, res: Response): void {
        const locale = this.resolveLocale(req);
        res.status(500).render(
            'pages/error-500',
            this.buildLocals(locale, {
                titleKey: 'errors.serverError.meta.title',
                currentPage: 'error-500',
                statusCode: 500,
                requestPath: req.originalUrl || req.url,
            }),
        );
    }
}
