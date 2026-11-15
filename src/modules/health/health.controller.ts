import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@modules/auth/decorators/public.decorator';
import { NoLog } from '@common/graylog/decorators/no-log.decorator';
import { RedisHealthIndicator } from './indicators/redis.health';
import { KafkaHealthIndicator } from './indicators/kafka.health';
import { PostgresPoolHealthIndicator } from './indicators/postgres.health';
import { MongoPoolHealthIndicator } from './indicators/mongo.health';

function isProductionEnvironment(configService: ConfigService): boolean {
    const env = (
        process.env.NODE_ENV ||
        process.env.APP_ENV ||
        configService.get<string>('app.environment') ||
        ''
    ).toLowerCase();
    return env === 'production' || env === 'prod';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly postgres: PostgresPoolHealthIndicator,
        private readonly mongo: MongoPoolHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly redis: RedisHealthIndicator,
        private readonly kafka: KafkaHealthIndicator,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Check the health of the application
     * @returns The health of the application
     */
    @Public()
    @NoLog()
    @Get()
    @HealthCheck()
    @ApiOperation({ summary: 'Application health check', description: 'Returns the health status of all application dependencies (Postgres, MongoDB, Redis, Kafka, memory). In production without HEALTH_DETAILED=true, returns a minimal { status: "ok" }.' })
    @ApiResponse({ status: 200, description: 'All checks passed — status: ok' })
    @ApiResponse({ status: 503, description: 'One or more checks failed' })
    check() {
        const healthDetailed =
            process.env.HEALTH_DETAILED === 'true' ||
            process.env.HEALTH_DETAILED === '1';

        if (isProductionEnvironment(this.configService) && !healthDetailed) {
            return { status: 'ok' };
        }

        return this.health.check([
            () => this.postgres.isHealthy('postgres'),
            () => this.mongo.isHealthy('mongo'),
            () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
            () => this.redis.isHealthy('redis'),
            () => this.kafka.isHealthy('kafka'),
        ]);
    }
}
