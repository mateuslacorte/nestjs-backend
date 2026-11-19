import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TerminusModule, MemoryHealthIndicator } from '@nestjs/terminus';
import { RequestMethod } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { HealthController } from '../src/modules/health/health.controller';
import { RedisHealthIndicator } from '../src/modules/health/indicators/redis.health';
import { KafkaHealthIndicator } from '../src/modules/health/indicators/kafka.health';
import { PostgresPoolHealthIndicator } from '../src/modules/health/indicators/postgres.health';
import { MongoPoolHealthIndicator } from '../src/modules/health/indicators/mongo.health';
import { CacheService } from '../src/common/cache/cache.service';
import { createTestApp } from './helpers/app.factory';

/** Builds a mock health indicator that always reports the given key as 'up'. */
function healthyIndicator(key: string) {
    return { isHealthy: async () => ({ [key]: { status: 'up' } }) };
}

describe('Health E2E — readiness probe', () => {
    let app: NestFastifyApplication;

    const mockCacheService = {
        ping: jest.fn().mockResolvedValue(false),
    };

    beforeAll(async () => {
        const builder = Test.createTestingModule({
            imports: [TerminusModule],
            controllers: [HealthController],
            providers: [
                // Real Redis indicator — depends on the mocked CacheService below.
                RedisHealthIndicator,
                { provide: CacheService, useValue: mockCacheService },
                // All other indicators stubbed healthy so only Redis drives the 503.
                { provide: PostgresPoolHealthIndicator, useValue: healthyIndicator('postgres') },
                { provide: MongoPoolHealthIndicator, useValue: healthyIndicator('mongo') },
                { provide: KafkaHealthIndicator, useValue: healthyIndicator('kafka') },
                // MemoryHealthIndicator is exported by TerminusModule — no extra stub needed.
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn().mockReturnValue(undefined) },
                },
            ],
        });

        // Health endpoints live outside the api/v1 prefix in production.
        // Replicate that behaviour so the test URL matches the documented path.
        app = await createTestApp(builder, {
            prefix: 'api/v1',
            excludePaths: ['health', 'health/ready'],
        });
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /health/ready returns 503 when CacheService.ping returns false', async () => {
        const result = await app
            .getHttpAdapter()
            .getInstance()
            .inject({
                method: 'GET',
                url: '/health/ready',
            });

        expect(result.statusCode).toBe(503);
    });
});
