import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { Controller, Get } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Public } from '../src/modules/auth/decorators/public.decorator';
import { createTestApp } from './helpers/app.factory';

/** Public endpoint used to exercise the global rate limiter. */
@Controller('ping')
class PingController {
    @Public()
    @Get()
    ping() {
        return { pong: true };
    }
}

describe('Rate Limit E2E', () => {
    let app: NestFastifyApplication;

    beforeAll(async () => {
        const builder = Test.createTestingModule({
            imports: [
                // Global limit: 120 req / 60 s — mirrors the production setting.
                ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
            ],
            controllers: [PingController],
            providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
        });

        app = await createTestApp(builder);
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns 429 on the 121st request within the same window', async () => {
        const fastify = app.getHttpAdapter().getInstance();
        let lastStatus = 0;

        for (let i = 1; i <= 121; i++) {
            const result = await fastify.inject({
                method: 'GET',
                url: '/api/v1/ping',
            });
            lastStatus = result.statusCode;
            if (result.statusCode === 429) break;
        }

        expect(lastStatus).toBe(429);
    });
});
