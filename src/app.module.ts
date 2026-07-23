import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import {
    ApolloExpressDriver,
    ApolloExpressDriverConfig,
} from '@common/graphql';
import { UsersModule } from '@modules/users/users.module';
import { AuthModule } from '@modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from "@modules/auth/guards/jwtauth.guard";
import { GraylogModule } from '@common/graylog/graylog.module';
import { EmailModule } from "@modules/email/email.module";
import { WhatsappModule } from "@modules/whatsapp/whatsapp.module";
import { WebsocketModule } from "@common/websocket/websocket.module";
import { FileUploadModule } from "@common/file-upload/file-upload.module";
import { WebsocketExampleModule } from "@modules/websocket-example/websocket-example.module";

// Import configuration files
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import kafkaConfig from './config/kafka.config';
import redisConfig from './config/redis.config';
import whatsappConfig from './config/whatsapp.config';
import minioConfig from './config/minio.config';
import graylogConfig from './config/graylog.config';
import graphqlConfig from './config/graphql.config';
import bcryptConfig from './config/bcrypt.config';
import jwtConfig from './config/jwt.config';
import smtpConfig from './config/smtp.config';
import { WikiModule } from "./wiki/wiki.module";
import { ScheduleModule } from "@nestjs/schedule";
import { SecurityModule} from "@common/security/security.module";
import { CacheModule } from '@common/cache/cache.module';
import { HealthModule } from '@modules/health/health.module';

@Module({
    imports: [
        // Configuration module to handle environment variables
        ConfigModule.forRoot({
            isGlobal: true, // Makes the config globally available
            load: [
                appConfig,
                databaseConfig,
                kafkaConfig,
                redisConfig,
                whatsappConfig,
                minioConfig,
                graylogConfig,
                graphqlConfig,
                bcryptConfig,
                jwtConfig,
                smtpConfig,
            ],
        }),

        // Graylog module for logging
        GraylogModule,

        // Cache module for Redis caching
        CacheModule,

        WebsocketModule.forRoot(),

        // MongoDB connection using Mongoose (with connection pool)
        MongooseModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>('database.mongoUri'),
                maxPoolSize: configService.get<number>('database.mongo.maxPoolSize'),
                minPoolSize: configService.get<number>('database.mongo.minPoolSize'),
                maxIdleTimeMS: configService.get<number>('database.mongo.maxIdleTimeMS'),
                waitQueueTimeoutMS: configService.get<number>('database.mongo.waitQueueTimeoutMS'),
            }),
            inject: [ConfigService],
        }),

        // PostgreSQL connection using TypeORM (pool via poolSize + extra)
        TypeOrmModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                ...configService.get('database.postgres'),
                entities: [
                    __dirname + '/**/*.entity{.ts,.js}',
                    __dirname + '/**/*.view{.ts,.js}', // Include ViewEntity files
                ],
            }),
            inject: [ConfigService],
        }),

        // GraphQL via Apollo Server 5 + Express (no @nestjs/apollo)
        GraphQLModule.forRootAsync<ApolloExpressDriverConfig>({
            driver: ApolloExpressDriver,
            useFactory: (configService: ConfigService) => ({
                autoSchemaFile: configService.get('graphql.autoSchemaFile'),
                playground: configService.get('graphql.playground'),
                introspection: configService.get('graphql.introspection'),
                sortSchema: configService.get('graphql.sortSchema'),
                path: configService.get('graphql.path'),
                context: ({ req }: { req: unknown }) => ({ req }),
            }),
            inject: [ConfigService],
        }),

        // Modules for the application
        UsersModule,
        AuthModule,
        EmailModule,
        WhatsappModule,
        FileUploadModule,
        WebsocketExampleModule,
        WikiModule,
        HealthModule,
        ScheduleModule.forRoot(),
        // SecurityModule last so CatchAllController (prod/staging) registers after API routes
        SecurityModule,
    ],
    controllers: [],
    providers: [
        // Example providers for JWT guard to apply on all routes
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule {}
