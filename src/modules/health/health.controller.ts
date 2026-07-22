import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    MongooseHealthIndicator,
    TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@modules/auth/decorators/public.decorator';
import { NoLog } from '@common/graylog/decorators/no-log.decorator';
import { RedisHealthIndicator } from './indicators/redis.health';
import { KafkaHealthIndicator } from './indicators/kafka.health';

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly db: TypeOrmHealthIndicator,
        private readonly mongo: MongooseHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly redis: RedisHealthIndicator,
        private readonly kafka: KafkaHealthIndicator,
    ) {}

    /**
     * Check the health of the application
     * @returns The health of the application
     */
    @Public()
    @NoLog()
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.db.pingCheck('postgres'),
            () => this.mongo.pingCheck('mongo'),
            () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
            () => this.redis.isHealthy('redis'),
            () => this.kafka.isHealthy('kafka'),
        ]);
    }
}
