import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult, MongooseHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class MongoPoolHealthIndicator extends HealthIndicator {
    constructor(
        private readonly mongo: MongooseHealthIndicator,
        private readonly configService: ConfigService,
    ) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const pool = {
            maxPoolSize: this.configService.get<number>('database.mongo.maxPoolSize'),
            minPoolSize: this.configService.get<number>('database.mongo.minPoolSize'),
            maxIdleTimeMS: this.configService.get<number>('database.mongo.maxIdleTimeMS'),
            waitQueueTimeoutMS: this.configService.get<number>('database.mongo.waitQueueTimeoutMS'),
        };

        try {
            const ping = await this.mongo.pingCheck(key);
            const status = ping[key];
            return {
                [key]: {
                    ...status,
                    pool,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Mongo unreachable';
            throw new HealthCheckError(
                'Mongo check failed',
                this.getStatus(key, false, { message, pool }),
            );
        }
    }
}
