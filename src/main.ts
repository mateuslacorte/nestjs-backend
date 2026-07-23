import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GraylogLoggerService } from '@common/graylog/graylog-logger.service';
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
    app.setGlobalPrefix(apiPrefix, {
        exclude: [
            { path: '/', method: RequestMethod.GET },
            { path: 'architecture', method: RequestMethod.GET },
            { path: 'backend', method: RequestMethod.GET },
            { path: 'backend/install', method: RequestMethod.GET },
            { path: 'auth', method: RequestMethod.GET },
            { path: 'users', method: RequestMethod.GET },
            { path: 'email', method: RequestMethod.GET },
            { path: 'whatsapp', method: RequestMethod.GET },
            { path: 'websocket', method: RequestMethod.GET },
            { path: '404', method: RequestMethod.GET },
            { path: '500', method: RequestMethod.GET },
            { path: 'static/(.*)', method: RequestMethod.GET },

            { path: 'health', method: RequestMethod.GET },
            { path: 'health/(.*)', method: RequestMethod.GET },
            { path: 'swagger', method: RequestMethod.ALL },
            { path: 'swagger-json', method: RequestMethod.ALL },
            { path: 'swagger/(.*)', method: RequestMethod.ALL },
            // Catch-all must stay at root (not under /api/...)
            { path: '*path', method: RequestMethod.ALL },
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
    app.useStaticAssets(publicPath, { prefix: '/static' });

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

    app.enableCors();

    const port = configService.get<number>('app.port') || 3000;
    const host = configService.get<string>('app.host') || 'localhost';
    const protocol =
        configService.get<string>('app.environment') === 'production'
            ? 'https'
            : 'http';

    await app.listen(port);
    graylogLogger.log(`Application is running on: ${protocol}://${host}:${port}`);
}

bootstrap();
