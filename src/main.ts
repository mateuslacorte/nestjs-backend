import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GraylogLoggerService } from '@common/graylog/graylog-logger.service';
import { WikiRenderService } from './wiki/wiki-render.service';
import { CorsIoAdapter } from '@common/websocket/cors-io.adapter';
import { createCorsOriginDelegate } from '@config/cors-origins.util';
import * as crypto from 'crypto';
import { join } from 'path';
import { existsSync } from 'fs';

// Polyfill for crypto.randomUUID() in Node.js 18 (required by @nestjs/schedule)
if (!globalThis.crypto) {
    globalThis.crypto = crypto as any;
}

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);
    const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';

    // Wiki at /; API controllers under /api/{API_VERSION}
    // Note: do NOT exclude GET "users" — that would strip the prefix from
    // UsersController.findAll. Wiki /users is mounted via Express below.
    app.setGlobalPrefix(apiPrefix, {
        exclude: [
            { path: '/', method: RequestMethod.GET },
            { path: 'architecture', method: RequestMethod.GET },
            { path: 'backend', method: RequestMethod.GET },
            { path: 'backend/install', method: RequestMethod.GET },
            { path: 'auth', method: RequestMethod.GET },
            { path: 'auth/social', method: RequestMethod.GET },
            { path: 'auth/social/google', method: RequestMethod.GET },
            { path: 'auth/social/facebook', method: RequestMethod.GET },
            { path: 'email', method: RequestMethod.GET },
            { path: 'whatsapp', method: RequestMethod.GET },
            { path: 'websocket', method: RequestMethod.GET },
            { path: 'wsui', method: RequestMethod.GET },
            { path: 'security', method: RequestMethod.GET },
            { path: '404', method: RequestMethod.GET },
            { path: '500', method: RequestMethod.GET },
            { path: 'static/(.*)', method: RequestMethod.GET },
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
            { path: 'swagger/(.*)', method: RequestMethod.ALL },
        ],
    });

    // Configure Pug as template engine for Wiki
    const srcViewsPath = join(process.cwd(), 'src', 'wiki', 'views');
    const distViewsPath = join(__dirname, 'wiki', 'views');
    const srcPublicPath = join(process.cwd(), 'src', 'wiki', 'public');
    const distPublicPath = join(__dirname, 'wiki', 'public');

    const viewsPath = existsSync(distViewsPath) ? distViewsPath : srcViewsPath;
    const publicPath = existsSync(distPublicPath) ? distPublicPath : srcPublicPath;

    app.setBaseViewsDir(viewsPath);
    app.setViewEngine('pug');
    // Wiki assets under /static; favicon/robots/manifest also at site root
    app.useStaticAssets(publicPath, { prefix: '/static' });
    app.useStaticAssets(publicPath);

    const graylogLogger = app.get(GraylogLoggerService);
    app.useLogger(graylogLogger);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const config = new DocumentBuilder()
        .setTitle('Backend NestJS API')
        .setDescription(
            `
## Documentação da API

### Autenticação
Todas as rotas (exceto login) requerem autenticação JWT. Use o header \`Authorization: Bearer {token}\`.

### Wiki
Acesse a documentação completa com fluxos e exemplos em [/](/).

### Prefixo da API
Rotas REST: \`/${apiPrefix}/...\`
        `,
        )
        .setVersion('1.0.0')
        .setContact(
            'Mateus M. Côrtes',
            'https://www.lacorte.dev',
            'https://www.lacorte.dev/contact',
        )
        .addTag('Auth', 'Autenticação e autorização')
        .addTag('Users', 'Gestão de usuários')
        .addTag('Email', 'Envio de e-mails')
        .addTag('Whatsapp', 'Integração WhatsApp')
        .addTag('Security', 'Bloqueio de IPs e rotas inválidas')
        .addServer('/')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'Authorization',
                description: 'Token JWT obtido no login',
                in: 'header',
            },
            'access-token',
        )
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document, {
        useGlobalPrefix: false,
    });

    // Wiki page at GET /users (outside API prefix; avoids collision with UsersController)
    const wikiRender = app.get(WikiRenderService);
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/users', (req: any, res: any) => {
        wikiRender.renderPage(
            req,
            res,
            typeof req.query?.lang === 'string' ? req.query.lang : undefined,
            'pages/users',
            'users',
            'users',
        );
    });

    const corsOrigins = configService.get<string[]>('cors.origins') || [];
    const corsCredentials =
        configService.get<boolean>('cors.credentials') !== false;

    app.enableCors({
        origin: createCorsOriginDelegate(corsOrigins),
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

    await app.listen(port);
    graylogLogger.log(`Application is running on: ${protocol}://${host}:${port}`);
    graylogLogger.log(
        `CORS origins: ${corsOrigins.length ? corsOrigins.join(', ') : '(self only — none resolved)'}`,
    );
}

bootstrap();
