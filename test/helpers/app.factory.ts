import { RequestMethod, ValidationPipe } from '@nestjs/common';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { TestingModuleBuilder } from '@nestjs/testing';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import * as jsonwebtoken from 'jsonwebtoken';

export const TEST_JWT_SECRET = 'test-jwt-secret-min-32-chars-long!!';

/** Passport JWT strategy for tests: validates signature without a DB lookup. */
@Injectable()
export class TestJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: TEST_JWT_SECRET,
        });
    }

    async validate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
        return { id: payload['id'], email: payload['email'], roles: payload['roles'] ?? [] };
    }
}

/** Sign a short-lived JWT for use in tests. */
export function signTestToken(
    payload: Record<string, unknown>,
    expiresIn = '1h',
): string {
    return jsonwebtoken.sign(payload, TEST_JWT_SECRET, { expiresIn } as jsonwebtoken.SignOptions);
}

export interface CreateTestAppOptions {
    /** Global prefix for API routes. Defaults to 'api/v1'. Set to false to skip. */
    prefix?: string | false;
    /** Paths excluded from the prefix (passed to setGlobalPrefix). */
    excludePaths?: string[];
}

/** Build and initialise a Fastify NestJS test application from a TestingModuleBuilder. */
export async function createTestApp(
    builder: TestingModuleBuilder,
    options: CreateTestAppOptions = {},
): Promise<NestFastifyApplication> {
    const moduleFixture = await builder.compile();
    const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
    );

    const prefix = options.prefix === undefined ? 'api/v1' : options.prefix;
    if (prefix !== false) {
        const excludePaths = options.excludePaths ?? [];
        const excludes = excludePaths.map((path) => ({
            path,
            method: RequestMethod.ALL,
        }));
        app.setGlobalPrefix(prefix, { exclude: excludes });
    }

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    return app;
}
