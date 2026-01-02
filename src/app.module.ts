import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UsersModule } from '@modules/users/users.module';
import { AuthModule } from '@modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from "@modules/auth/guards/jwtauth.guard";
import { LogtailModule } from '@common/logtail/logtail.module';
import {EmailModule} from "@modules/email/email.module";
import {WhatsappModule} from "@modules/whatsapp/whatsapp.module";
import {WebsocketModule} from "@common/websocket/websocket.module";
import {FileUploadModule} from "@common/file-upload/file-upload.module";
import {WebsocketExampleModule} from "@modules/websocket-example/websocket-example.module";

// Import configuration files
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import kafkaConfig from './config/kafka.config';
import redisConfig from './config/redis.config';
import whatsappConfig from './config/whatsapp.config';
import minioConfig from './config/minio.config';
import logtailConfig from './config/logtail.config';
import graphqlConfig from './config/graphql.config';
import bcryptConfig from './config/bcrypt.config';
import jwtConfig from './config/jwt.config';
import smtpConfig from './config/smtp.config';
import {WikiModule} from "./wiki/wiki.module";
import {ScheduleModule} from "@nestjs/schedule";
import {SecurityModule} from "@common/security/security.module";

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
                logtailConfig,
                graphqlConfig,
                bcryptConfig,
                jwtConfig,
                smtpConfig,
            ],
        }),

        // Logtail module for logging
        LogtailModule,

        WebsocketModule.forRoot(),

        // MongoDB connection for betting data using Mongoose
        MongooseModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>('database.mongoUri'),
            }),
            inject: [ConfigService],
        }),

        // PostgreSQL connection using TypeORM for read-heavy operations
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

        // GraphQL module setup
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
            useFactory: (configService: ConfigService) => ({
                driver: ApolloDriver,
                autoSchemaFile: configService.get('graphql.autoSchemaFile'),
                playground: configService.get('graphql.playground'),
                introspection: configService.get('graphql.introspection'),
                debug: configService.get('graphql.debug'),
                sortSchema: configService.get('graphql.sortSchema'),
                path: configService.get('graphql.path'),
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
        ScheduleModule.forRoot(),
        // SecurityModule deve ser o ÚLTIMO para o catch-all funcionar
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
