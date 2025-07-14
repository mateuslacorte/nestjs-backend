// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UsersModule } from '@modules/users/users.module';
import { AuthModule } from '@modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from "@modules/auth/guards/jwtauth.guard";
import { LogtailModule } from '@common/logtail/logtail.module';

@Module({
    imports: [
        // Configuration module to handle environment variables
        ConfigModule.forRoot({
            isGlobal: true, // Makes the config globally available
        }),

        // Logtail module for logging
        LogtailModule,

        // MongoDB connection for betting data using Mongoose
        MongooseModule.forRoot(process.env.MONGO_URI!, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }),

        // PostgreSQL connection using TypeORM for read-heavy operations
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.POSTGRES_HOST,
            port: 5432,
            username: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
            entities: [
                __dirname + '/**/*.entity{.ts,.js}', // Adjust the path as necessary
            ],
            synchronize: true,
        }),

        // GraphQL module setup
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: true,
            playground: true, // Enable GraphQL Playground
        }),

        // Modules for the application
        UsersModule,
        AuthModule,
    ],
    controllers: [],
    providers: [
        // Example provider for JWT guard to apply on all routes
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule {}