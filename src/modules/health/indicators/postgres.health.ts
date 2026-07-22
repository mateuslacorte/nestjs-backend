import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class PostgresPoolHealthIndicator extends HealthIndicator {
    constructor(
        private readonly db: TypeOrmHealthIndicator,
        private readonly configService: ConfigService,
    ) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const pool = {
            max: this.configService.get<number>('database.postgres.extra.max'),
            min: this.configService.get<number>('database.postgres.extra.min'),
            idleTimeoutMillis: this.configService.get<number>('database.postgres.extra.idleTimeoutMillis'),
            connectionTimeoutMillis: this.configService.get<number>('database.postgres.extra.connectionTimeoutMillis'),
        };

        try {
            const ping = await this.db.pingCheck(key);
            const status = ping[key];
            return {
                [key]: {
                    ...status,
                    pool,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Postgres unreachable';
            throw new HealthCheckError(
                'Postgres check failed',
                this.getStatus(key, false, { message, pool }),
            );
        }
    }
}
