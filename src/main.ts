// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LogtailLoggerService } from './common/logtail/logtail-logger.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

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
        .setTitle('Decide.bet API')
        .setDescription('API for the betting platform')
        .setVersion('1.0')
        .addTag('bets')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // Enable CORS for cross-origin requests
    app.enableCors();

    // Set the port and start the application
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logtailLogger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();