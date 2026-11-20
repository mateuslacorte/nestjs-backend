import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { NotFoundException } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { OperationsController } from '../src/common/operations/operations.controller';
import { OperationStatusService } from '../src/common/operations/operation-status.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AuditInterceptor } from '../src/common/audit/audit.interceptor';
import { AuditService } from '../src/common/audit/audit.service';
import { Role } from '../src/modules/auth/enums/role.enum';
import {
    createTestApp,
    TestJwtStrategy,
    signTestToken,
} from './helpers/app.factory';

describe('Users E2E — negative paths', () => {
    let app: NestFastifyApplication;
    let superToken: string;

    const mockUsersService = {
        create: jest.fn(),
        search: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        updateResetToken: jest.fn(),
    };

    const mockOpService = {
        get: jest.fn(),
        pending: jest.fn(),
        complete: jest.fn(),
        fail: jest.fn(),
    };

    const mockAuditService = {
        record: jest.fn().mockResolvedValue(undefined),
    };

    beforeAll(async () => {
        superToken = signTestToken({
            id: 'super-user-id',
            email: 'super@example.com',
            roles: [Role.SUPER],
        });

        const builder = Test.createTestingModule({
            imports: [
                PassportModule,
                ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
            ],
            controllers: [UsersController, OperationsController],
            providers: [
                { provide: UsersService, useValue: mockUsersService },
                { provide: OperationStatusService, useValue: mockOpService },
                TestJwtStrategy,
                JwtAuthGuard,
                RolesGuard,
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
        mockAuditService.record.mockResolvedValue(undefined);
    });

    describe('POST /api/v1/users', () => {
        it('returns 400 when body is invalid', async () => {
            mockUsersService.create.mockResolvedValue({
                operationId: 'op-123',
                status: 'pending',
            });

            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'POST',
                    url: '/api/v1/users',
                    headers: {
                        'content-type': 'application/json',
                        authorization: `Bearer ${superToken}`,
                    },
                    payload: { invalidField: 'bad' },
                });

            expect(result.statusCode).toBe(400);
        });
    });

    describe('GET /api/v1/users/:id', () => {
        it('returns 404 when user does not exist', async () => {
            mockUsersService.findById.mockResolvedValue(null);

            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'GET',
                    url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
                    headers: { authorization: `Bearer ${superToken}` },
                });

            expect(result.statusCode).toBe(404);
        });
    });

    describe('GET /api/v1/operations/:id', () => {
        it('returns 404 for an unknown operation ID', async () => {
            mockOpService.get.mockRejectedValue(
                new NotFoundException('Operation unknown-op-id not found'),
            );

            const result = await app
                .getHttpAdapter()
                .getInstance()
                .inject({
                    method: 'GET',
                    url: '/api/v1/operations/unknown-op-id',
                    headers: { authorization: `Bearer ${superToken}` },
                });

            expect(result.statusCode).toBe(404);
        });
    });
});
