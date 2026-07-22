import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { KafkaHealthIndicator } from './indicators/kafka.health';
import { PostgresPoolHealthIndicator } from './indicators/postgres.health';
import { MongoPoolHealthIndicator } from './indicators/mongo.health';

@Module({
    imports: [
        TerminusModule,
        ConfigModule,
    ],
    controllers: [
        HealthController,
    ],
    providers: [
        RedisHealthIndicator,
        KafkaHealthIndicator,
        PostgresPoolHealthIndicator,
        MongoPoolHealthIndicator,
    ],
})
export class HealthModule {}
