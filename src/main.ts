import './telemetry'; // OpenTelemetry — must load before NestJS and all other imports
import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GraylogLoggerService } from '@common/graylog/graylog-logger.service';
import { WikiRenderService } from './wiki/wiki-render.service';
import { CorsIoAdapter } from '@common/websocket/cors-io.adapter';
import { isOriginAllowed } from '@config/cors-origins.util';
import * as crypto from 'crypto';
import { join } from 'path';
import { existsSync } from 'fs';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyPassport from '@fastify/passport';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import pug from 'pug';

// Polyfill for crypto.randomUUID() in Node.js 18 (required by @nestjs/schedule)
if (!globalThis.crypto) {
    globalThis.crypto = crypto as any;
}

const STATIC_CACHE_CONTROL =
    'public, max-age=86400, stale-while-revalidate=604800';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({ trustProxy: true }),
    );
    const configService = app.get(ConfigService);
    const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';
    const graphqlPath =
        configService.get<string>('graphql.path') || '/graphql';

    // Wiki at /; API controllers under /api/{API_VERSION}
    // Note: do NOT exclude GET "users" — that would strip the prefix from
    // UsersController.findAll. Wiki /users is mounted via Fastify below.
    app.setGlobalPrefix(apiPrefix, {
        exclude: [
            { path: '/', method: RequestMethod.GET },
            { path: 'architecture', method: RequestMethod.GET },
            { path: 'backend', method: RequestMethod.GET },
            { path: 'backend/install', method: RequestMethod.GET },
            { path: 'auth', method: RequestMethod.GET },
            { path: 'auth/active-directory', method: RequestMethod.GET },
            { path: 'auth/active-directory/ldap', method: RequestMethod.GET },
            { path: 'auth/active-directory/ldaps', method: RequestMethod.GET },
            { path: 'auth/social', method: RequestMethod.GET },
            { path: 'auth/social/google', method: RequestMethod.GET },
            { path: 'auth/social/facebook', method: RequestMethod.GET },
            { path: 'auth/social/twitter', method: RequestMethod.GET },
            { path: 'auth/social/github', method: RequestMethod.GET },
            { path: 'auth/social/figma', method: RequestMethod.GET },
            { path: 'auth/social/linkedin', method: RequestMethod.GET },
            { path: 'auth/social/slack', method: RequestMethod.GET },
            { path: 'auth/social/atlassian', method: RequestMethod.GET },
            { path: 'auth/social/gitlab', method: RequestMethod.GET },
            { path: 'auth/social/bitbucket', method: RequestMethod.GET },
            { path: 'auth/social/discord', method: RequestMethod.GET },
            { path: 'auth/social/twitch', method: RequestMethod.GET },
            { path: 'auth/social/steam', method: RequestMethod.GET },
            { path: 'auth/social/amazon', method: RequestMethod.GET },
            { path: 'auth/social/patreon', method: RequestMethod.GET },
            { path: 'auth/social/dropbox', method: RequestMethod.GET },
            { path: 'auth/social/metamask', method: RequestMethod.GET },
            { path: 'auth/social/apple', method: RequestMethod.GET },
            { path: 'email', method: RequestMethod.GET },
            { path: 'whatsapp', method: RequestMethod.GET },
            { path: 'websocket', method: RequestMethod.GET },
            { path: 'wsui', method: RequestMethod.GET },
            { path: 'security', method: RequestMethod.GET },
            { path: 'tests', method: RequestMethod.GET },
            { path: '404', method: RequestMethod.GET },
            { path: '500', method: RequestMethod.GET },
            { path: 'favicon.ico', method: RequestMethod.GET },
            { path: 'favicon.svg', method: RequestMethod.GET },
            { path: 'favicon-96x96.png', method: RequestMethod.GET },
            { path: 'apple-touch-icon.png', method: RequestMethod.GET },
            { path: 'site.webmanifest', method: RequestMethod.GET },
            { path: 'web-app-manifest-192x192.png', method: RequestMethod.GET },
            { path: 'web-app-manifest-512x512.png', method: RequestMethod.GET },
            { path: 'robots.txt', method: RequestMethod.GET },

            { path: 'health', method: RequestMethod.GET },
            { path: 'swagger', method: RequestMethod.ALL },
            { path: 'swagger-json', method: RequestMethod.ALL },
            { path: 'swagger/*path', method: RequestMethod.ALL },
        ],
    });

    // Configure Pug as template engine for Wiki
    const srcViewsPath = join(process.cwd(), 'src', 'wiki', 'views');
    const distViewsPath = join(__dirname, 'wiki', 'views');
    const srcPublicPath = join(process.cwd(), 'src', 'wiki', 'public');
    const distPublicPath = join(__dirname, 'wiki', 'public');

    const viewsPath = existsSync(distViewsPath) ? distViewsPath : srcViewsPath;
    const publicPath = existsSync(distPublicPath) ? distPublicPath : srcPublicPath;

    app.setViewEngine({
        engine: { pug },
        templates: viewsPath,
        viewExt: 'pug',
    });

    const staticHeaders = (
        res: { setHeader: (name: string, value: string) => void },
    ) => {
        res.setHeader('Cache-Control', STATIC_CACHE_CONTROL);
    };

    // Wiki assets under /static; favicon/robots/manifest also at site root.
    // Only the first @fastify/static registration may decorate reply.sendFile.
    app.useStaticAssets({
        root: publicPath,
        prefix: '/static/',
        setHeaders: staticHeaders,
    });
    app.useStaticAssets({
        root: publicPath,
        decorateReply: false,
        setHeaders: staticHeaders,
    });

    // Session required for X/Twitter OAuth 2.0 PKCE (code_verifier).
    // SameSite=Lax is required so the cookie is sent on the top-level return
    // from twitter.com (Strict would break PKCE).
    const isProduction =
        configService.get<string>('app.environment') === 'production';
    let sessionSecret =
        configService.get<string>('SESSION_SECRET') ||
        process.env.SESSION_SECRET;
    if (!sessionSecret?.trim()) {
        if (isProduction) {
            throw new Error(
                'SESSION_SECRET must be set in production (no JWT_SECRET fallback)',
            );
        }
        sessionSecret =
            configService.get<string>('jwt.secret') ||
            process.env.JWT_SECRET ||
            'dev-session-secret-change-me';
    }
    sessionSecret = sessionSecret.trim();
    // @fastify/session requires secret length >= 32
    if (sessionSecret.length < 32) {
        sessionSecret = `${sessionSecret}`.padEnd(32, '0');
    }

    await app.register(fastifyCookie as any);
    await app.register(fastifySession as any, {
        secret: sessionSecret,
        cookie: {
            // Docker/local HTTP must not require Secure cookies
            secure: isProduction && process.env.COOKIE_SECURE !== 'false',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
        },
        saveUninitialized: false,
    });
    // Express passport.session() breaks Fastify — use @fastify/passport instead
    await app.register(fastifyPassport.initialize() as any);
    await app.register(fastifyPassport.secureSession() as any);

    // Security headers (CSP off — Swagger UI and Wiki need inline scripts)
    await app.register(fastifyHelmet as any, {
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    });

    // Response compression (brotli preferred, gzip fallback)
    await app.register(fastifyCompress as any, { global: true });

    const fastify = app.getHttpAdapter().getInstance();

    fastify.decorateReply(
        'setHeader',
        function (this: { header: (name: string, value: unknown) => unknown }, name: string, value: unknown) {
            return this.header(name, value);
        },
    );
    fastify.decorateReply('end', function (this: { send: (payload: string) => unknown }) {
        return this.send('');
    });
    fastify.addHook('onRequest', async (request, reply) => {
        (request as { res?: unknown }).res = reply;
    });

    const apiPrefixPath = `/${apiPrefix}`;
    fastify.addHook('onSend', async (request, reply, payload) => {
        const urlPath = (request.url || '').split('?')[0];
        if (
            urlPath.startsWith(apiPrefixPath) ||
            urlPath === graphqlPath ||
            urlPath.startsWith(`${graphqlPath}/`) ||
            urlPath === '/health' ||
            urlPath.startsWith('/swagger')
        ) {
            reply.header('Cache-Control', 'no-store');
        }
        return payload;
    });

    const graylogLogger = app.get(GraylogLoggerService);
    app.useLogger(graylogLogger);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const swaggerEnabled =
        process.env.SWAGGER_ENABLED === 'true' ||
        process.env.SWAGGER_ENABLED === '1';
    if (!isProduction || swaggerEnabled) {
        const config = new DocumentBuilder()
            .setTitle('Backend NestJS API')
            .setDescription(
                `
## API Documentation

### Authentication
All routes (except login) require JWT authentication. Use the \`Authorization: Bearer {token}\` header.

### Wiki
See the full documentation with flows and examples at [/](/).

### API Prefix
REST routes: \`/${apiPrefix}/...\`
        `,
            )
            .setVersion('1.0.0')
            .setContact(
                'Mateus M. Côrtes',
                'https://www.lacorte.dev',
                'https://www.lacorte.dev/contact',
            )
            .addTag('Auth', 'Authentication and authorization')
            .addTag('Users', 'User management')
            .addTag('Email', 'Email delivery')
            .addTag('Whatsapp', 'WhatsApp integration')
            .addTag('Security', 'IP blocking and invalid routes')
            .addServer('/')
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    name: 'Authorization',
                    description: 'JWT token obtained at login',
                    in: 'header',
                },
                'access-token',
            )
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('swagger', app, document, {
            useGlobalPrefix: false,
        });
    }

    // Wiki page at GET /users (outside API prefix; avoids collision with UsersController)
    const wikiRender = app.get(WikiRenderService);
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/users', (req: any, res: any) => {
        const lang =
            typeof req.query?.lang === 'string'
                ? req.query.lang
                : Array.isArray(req.query?.lang)
                  ? req.query.lang[0]
                  : undefined;
        void wikiRender.renderPage(
            req,
            res,
            lang,
            'pages/users',
            'users',
            'users',
        );
    });

    const corsOrigins = configService.get<string[]>('cors.origins') || [];
    const corsCredentials =
        configService.get<boolean>('cors.credentials') !== false;

    app.enableCors({
        origin: ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            callback(null, isOriginAllowed(origin, corsOrigins));
        }) as any,
        credentials: corsCredentials,
    });

    app.useWebSocketAdapter(
        new CorsIoAdapter(app, corsOrigins, corsCredentials),
    );

    const port = configService.get<number>('app.port') || 3000;
    const host = configService.get<string>('app.host') || 'localhost';
    const protocol =
        configService.get<string>('app.environment') === 'production'
            ? 'https'
            : 'http';

    // Bind on all interfaces so Docker port publishing can reach the process
    await app.listen(port, '0.0.0.0');
    const publicUrl = /^https?:\/\//i.test(host)
        ? host.replace(/\/$/, '')
        : `${protocol}://${host}:${port}`;
    graylogLogger.log(`Application is running on: ${publicUrl}`);
    graylogLogger.log(
        `CORS origins: ${corsOrigins.length ? corsOrigins.join(', ') : '(self only — none resolved)'}`,
    );
}

bootstrap();
