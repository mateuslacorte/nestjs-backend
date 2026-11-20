import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@modules/auth/decorators/public.decorator';
import { NoLog } from '@common/graylog/decorators/no-log.decorator';
import { RedisHealthIndicator } from './indicators/redis.health';
import { PostgresPoolHealthIndicator } from './indicators/postgres.health';
import { MongoPoolHealthIndicator } from './indicators/mongo.health';

@ApiTags('Health')
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
    @ApiOperation({ summary: 'Application health check', description: 'Returns the health status of all application dependencies (Postgres, MongoDB, Redis, Kafka, memory). In production without HEALTH_DETAILED=true, returns a minimal { status: "ok" }.' })
    @ApiResponse({ status: 200, description: 'All checks passed — status: ok' })
    @ApiResponse({ status: 503, description: 'One or more checks failed' })
    check() {
        return this.readiness();
    }
}
