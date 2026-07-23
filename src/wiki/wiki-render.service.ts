import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WikiI18nService } from './i18n/wiki-i18n.service';
import {
    buildWikiLocaleCookie,
    isWikiLocale,
    parseCookieHeader,
    resolveWikiLocale,
    WIKI_LOCALE_COOKIE,
    WIKI_LOCALE_META,
    WIKI_LOCALES,
    WikiLocale,
} from './i18n/wiki-locale';
import { WIKI_SEO } from './seo/wiki-seo';

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

    private resolvePublicOrigin(req: Request): string {
        const configured = this.configService.get<string>('app.publicUrl');
        if (configured) {
            return configured;
        }

        const protoHeader = req.headers['x-forwarded-proto'];
        const proto = Array.isArray(protoHeader)
            ? protoHeader[0]
            : protoHeader?.split(',')[0]?.trim();
        const host = req.get('host');
        if (host) {
            return `${proto || req.protocol || 'http'}://${host}`;
        }

        const hostCfg = this.configService.get<string>('app.host') || 'localhost';
        const port = this.configService.get<number>('app.port') || 3000;
        if (hostCfg.startsWith('http://') || hostCfg.startsWith('https://')) {
            return hostCfg.replace(/\/$/, '');
        }
        return `http://${hostCfg}:${port}`;
    }

    private buildSeo(
        req: Request,
        locale: WikiLocale,
        options: {
            title: string;
            currentPage: string;
            requestPath?: string;
        },
    ) {
        const origin = this.resolvePublicOrigin(req);
        const pathOnly = (options.requestPath || req.path || '/')
            .split('?')[0]
            .replace(/\/$/, '') || '/';
        const canonicalUrl = pathOnly === '/' ? `${origin}/` : `${origin}${pathOnly}`;

        const pageSeo = WIKI_SEO.pages[options.currentPage];
        const description =
            pageSeo?.description || WIKI_SEO.defaultDescription;

        const abs = (path: string) => `${origin}${path}`;
        const { default: imgDefault, blog: imgBlog, twitter: imgTwitter } =
            WIKI_SEO.images;

        return {
            description,
            keywords: WIKI_SEO.keywords,
            author: WIKI_SEO.author,
            canonicalUrl,
            robots:
                options.currentPage === 'error-404' ||
                options.currentPage === 'error-500'
                    ? 'noindex, nofollow'
                    : 'index, follow',
            og: {
                title: options.title,
                description,
                url: canonicalUrl,
                type: 'website',
                siteName: WIKI_SEO.siteName,
                locale: locale === 'pt-BR' ? 'pt_BR' : 'en_US',
                localeAlternate: locale === 'pt-BR' ? 'en_US' : 'pt_BR',
                images: [
                    {
                        url: abs(imgDefault.path),
                        width: imgDefault.width,
                        height: imgDefault.height,
                        alt: imgDefault.alt,
                        type: 'image/jpeg',
                    },
                    {
                        url: abs(imgBlog.path),
                        width: imgBlog.width,
                        height: imgBlog.height,
                        alt: imgBlog.alt,
                        type: 'image/jpeg',
                    },
                    {
                        url: abs(imgTwitter.path),
                        width: imgTwitter.width,
                        height: imgTwitter.height,
                        alt: imgTwitter.alt,
                        type: 'image/jpeg',
                    },
                ],
            },
            twitter: {
                card: WIKI_SEO.twitterCard,
                title: options.title,
                description,
                image: abs(imgTwitter.path),
                imageAlt: imgTwitter.alt,
            },
        };
    }

    buildLocals(
        req: Request,
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
        const currentPage = options.currentPage ?? '';
        const title = t(options.titleKey);

        return {
            locale,
            htmlLang: locale,
            title,
            currentPage,
            statusCode: options.statusCode,
            requestPath: options.requestPath,
            seo: this.buildSeo(req, locale, {
                title,
                currentPage,
                requestPath: options.requestPath,
            }),
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

    /**
     * Render a wiki page (supports ?lang= redirect). Used by WikiController
     * and by Express routes that must stay outside the API global prefix.
     */
    renderPage(
        req: Request,
        res: Response,
        lang: string | undefined,
        view: string,
        metaNamespace: string,
        currentPage: string,
    ): void {
        if (isWikiLocale(lang)) {
            res.setHeader('Set-Cookie', buildWikiLocaleCookie(lang));
            res.redirect(302, req.path);
            return;
        }

        const locale = this.resolveLocale(req);
        res.render(
            view,
            this.buildLocals(req, locale, {
                titleKey: `${metaNamespace}.meta.title`,
                currentPage,
                requestPath: req.path,
            }),
        );
    }

    renderNotFound(req: Request, res: Response): void {
        const locale = this.resolveLocale(req);
        res.status(404).render(
            'pages/error-404',
            this.buildLocals(req, locale, {
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
            this.buildLocals(req, locale, {
                titleKey: 'errors.serverError.meta.title',
                currentPage: 'error-500',
                statusCode: 500,
                requestPath: req.originalUrl || req.url,
            }),
        );
    }
}
