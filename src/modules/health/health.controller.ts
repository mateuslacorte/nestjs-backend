import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
} from '@nestjs/terminus';
import { Public } from '@modules/auth/decorators/public.decorator';
import { NoLog } from '@common/graylog/decorators/no-log.decorator';
import { RedisHealthIndicator } from './indicators/redis.health';
import { PostgresPoolHealthIndicator } from './indicators/postgres.health';
import { MongoPoolHealthIndicator } from './indicators/mongo.health';

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly postgres: PostgresPoolHealthIndicator,
        private readonly mongo: MongoPoolHealthIndicator,
        private readonly redis: RedisHealthIndicator,
    ) {}

    @Public()
    @NoLog()
    @Get('live')
    liveness() {
        return { status: 'ok' };
    }

    @Public()
    @NoLog()
    @Get('ready')
    @HealthCheck()
    readiness() {
        return this.health.check([
            () => this.redis.isHealthy('redis'),
            () => this.postgres.isHealthy('postgres'),
            () => this.mongo.isHealthy('mongo'),
        ]);
    }

    @Public()
    @NoLog()
    @Get()
    @HealthCheck()
    check() {
        return this.readiness();
    }
}
