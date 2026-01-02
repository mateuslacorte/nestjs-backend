import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LogtailLoggerService } from '@common/logtail/logtail-logger.service';
import * as crypto from 'crypto';
import { join } from 'path';
import { existsSync } from 'fs';

// Polyfill for crypto.randomUUID() in Node.js 18 (required by @nestjs/schedule)
if (!globalThis.crypto) {
    globalThis.crypto = crypto as any;
}

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Configure Pug as template engine for Wiki
    // Try both dist and src paths to work in dev and production
    const srcViewsPath = join(process.cwd(), 'src', 'wiki', 'views');
    const distViewsPath = join(__dirname, 'wiki', 'views');
    const srcPublicPath = join(process.cwd(), 'src', 'wiki', 'public');
    const distPublicPath = join(__dirname, 'wiki', 'public');
    
    // Use dist if it exists (production), otherwise use src (development)
    const viewsPath = existsSync(distViewsPath) ? distViewsPath : srcViewsPath;
    const publicPath = existsSync(distPublicPath) ? distPublicPath : srcPublicPath;
    
    app.setBaseViewsDir(viewsPath);
    app.setViewEngine('pug');
    app.useStaticAssets(publicPath, { prefix: '/wiki/static' });

    // Get the LogtailLoggerService from the app context
    const logtailLogger = app.get(LogtailLoggerService);

    // Use the custom logger
    app.useLogger(logtailLogger);

    // Enable global validation pipe to validate incoming requests and DTOs
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, // Strip non-decorated properties
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
        transform: true, // Automatically transform payloads to DTO instances
    }));

    // Setup Swagger API documentation
    const config = new DocumentBuilder()
        .setTitle('AtalaHub API')
        .setDescription(`
## Documentação da API

### 🔐 Autenticação
Todas as rotas (exceto login) requerem autenticação JWT. Use o header \`Authorization: Bearer {token}\`.

### 📚 Wiki
Acesse a documentação completa com fluxos e exemplos em [/wiki](/wiki).
        `)
        .setVersion('1.0.0')
        .setContact('Mateus M. Côrtes', 'https://www.lacorte.dev', 'https://www.lacorte.dev/contact')
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
    SwaggerModule.setup('docs', app, document);

    // Enable CORS for cross-origin requests
    app.enableCors();

    // Get configuration service
    const configService = app.get(ConfigService);
    
    // Set the port and start the application
    const port = configService.get<number>('app.port') || 3000;
    const host = configService.get<string>('app.host') || 'localhost';
    const protocol = configService.get<string>('app.environment') === 'production' ? 'https' : 'http';
    
    await app.listen(port);
    logtailLogger.log(`Application is running on: ${protocol}://${host}:${port}`);
}

bootstrap();