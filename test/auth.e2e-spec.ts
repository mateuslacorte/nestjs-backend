import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwtauth.guard';
import { AuditInterceptor } from '../src/common/audit/audit.interceptor';
import { AuditService } from '../src/common/audit/audit.service';
import { createTestApp, TestJwtStrategy } from './helpers/app.factory';

/** Minimal controller with a JWT-protected endpoint for guard rejection tests. */
@Controller('protected-test')
class ProtectedTestController {
    @Get()
    get() {
        return { ok: true };
    }
}

describe('Auth E2E — negative paths', () => {
    let app: NestFastifyApplication;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        refreshToken: jest.fn(),
        validateUser: jest.fn(),
        validateUserById: jest.fn(),
        createPasswordResetToken: jest.fn(),
        resetPassword: jest.fn(),
        verifyEmail: jest.fn(),
        resendVerificationEmail: jest.fn(),
        changePassword: jest.fn(),
        exchangeOAuthCode: jest.fn(),
        exchangeGoogleCode: jest.fn(),
        loginWithActiveDirectory: jest.fn(),
        loginWithMetamask: jest.fn(),
        issueMetamaskNonce: jest.fn(),
        loginWithGoogle: jest.fn(),
        loginWithFacebook: jest.fn(),
        loginWithTwitter: jest.fn(),
        loginWithGithub: jest.fn(),
        loginWithFigma: jest.fn(),
        loginWithLinkedin: jest.fn(),
        loginWithSlack: jest.fn(),
        loginWithAtlassian: jest.fn(),
        loginWithGitlab: jest.fn(),
        loginWithBitbucket: jest.fn(),
        loginWithDiscord: jest.fn(),
        loginWithTwitch: jest.fn(),
        loginWithSteam: jest.fn(),
        loginWithApple: jest.fn(),
        loginWithAmazon: jest.fn(),
        loginWithPatreon: jest.fn(),
        loginWithDropbox: jest.fn(),
    };

    const mockAuditService = {
        record: jest.fn().mockResolvedValue(undefined),
    };

    beforeAll(async () => {
        const builder = Test.createTestingModule({
            imports: [
                PassportModule,
                ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
            ],
            controllers: [AuthController, ProtectedTestController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                TestJwtStrategy,
                JwtAuthGuard,
                Reflector,
                AuditInterceptor,
                { provide: AuditService, useValue: mockAuditService },
                { provide: APP_GUARD, useClass: ThrottlerGuard },
                { provide: APP_GUARD, useClass: JwtAuthGuard },
            ],
        });

        app = await createTestApp(builder);
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/login', () => {
        it('returns 401 when password is wrong', async () => {
            mockAuthService.login.mockRejectedValue(
                new UnauthorizedException('Invalid credentials'),
            );

            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'POST',
                    url: '/api/v1/auth/login',
                    headers: { 'content-type': 'application/json' },
                    payload: {
                        email: 'user@example.com',
                        password: 'WrongPassword1!',
                    },
                });

            expect(result.statusCode).toBe(401);
        });

        it('returns 400 when required fields are missing', async () => {
            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'POST',
                    url: '/api/v1/auth/login',
                    headers: { 'content-type': 'application/json' },
                    payload: {},
                });

            expect(result.statusCode).toBe(400);
        });
    });

    describe('JWT-protected endpoint', () => {
        it('returns 401 when Authorization header is absent', async () => {
            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'GET',
                    url: '/api/v1/protected-test',
                });

            expect(result.statusCode).toBe(401);
        });

        it('returns 401 when token is malformed', async () => {
            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'GET',
                    url: '/api/v1/protected-test',
                    headers: { authorization: 'Bearer this.is.not.a.valid.jwt' },
                });

            expect(result.statusCode).toBe(401);
        });
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        it('returns 401 when refresh token is invalid', async () => {
            mockAuthService.refreshToken.mockRejectedValue(
                new UnauthorizedException('Invalid refresh token'),
            );

            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'POST',
                    url: '/api/v1/auth/refresh-token',
                    headers: { 'content-type': 'application/json' },
                    payload: { refreshToken: 'invalid-token' },
                });

            expect(result.statusCode).toBe(401);
        });
    });
});
