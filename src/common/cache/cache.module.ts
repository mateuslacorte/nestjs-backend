import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { TypeOrmCacheInterceptor } from './interceptors/typeorm-cache.interceptor';
import { MongooseCacheInterceptor } from './interceptors/mongoose-cache.interceptor';
import Redis from 'ioredis';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (configService: ConfigService) => {
                const redisConfig = configService.get('redis');
                return new Redis({
                    host: redisConfig.host,
                    username: redisConfig.username,
                    port: redisConfig.port,
                    password: redisConfig.password || undefined,
                    db: redisConfig.db,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                });
            },
            inject: [ConfigService],
        },
        CacheService,
        TypeOrmCacheInterceptor,
        MongooseCacheInterceptor,
    ],
    exports: [CacheService, TypeOrmCacheInterceptor, MongooseCacheInterceptor],
})
export class CacheModule {}

