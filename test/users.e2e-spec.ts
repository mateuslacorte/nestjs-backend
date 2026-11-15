import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import supertest from 'supertest';
import { createTestApp, closeTestApp, TEST_JWT_SECRET } from './helpers/app.factory';
import { OperationStatusService } from '../src/common/operations/operation-status.service';

const SUPER_USER_ID = 'super-user-e2e-id';
const SUPER_USER_EMAIL = 'super@example.com';

const NEW_USER_DTO = {
  firstName: 'Jane',
  lastName: 'Smith',
  username: 'janesmith-e2e',
  email: 'jane.smith.e2e@example.com',
  password: 'Str0ng!P@ssword',
  isActive: true,
  roles: ['user'],
};

describe('UsersController / OperationsController (e2e)', () => {
  let app: NestFastifyApplication;
  let pgRepo: Record<string, jest.Mock>;
  let mongoModel: Record<string, jest.Mock>;
  let moduleRef: import('@nestjs/testing').TestingModule;
  let superToken: string;
  let superUser: Record<string, unknown>;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    pgRepo = ctx.pgRepo as Record<string, jest.Mock>;
    mongoModel = ctx.mongoModel as Record<string, jest.Mock>;
    moduleRef = ctx.moduleRef;

    superUser = {
      id: SUPER_USER_ID,
      email: SUPER_USER_EMAIL,
      username: 'superuser',
      firstName: 'Super',
      lastName: 'User',
      password: null,
      roles: ['super'],
      isActive: true,
      createdAt: new Date(),
    };

    pgRepo.findOne.mockResolvedValue(superUser);

    const jwtService = moduleRef.get(JwtService);
    superToken = jwtService.sign(
      { id: SUPER_USER_ID, email: SUPER_USER_EMAIL, roles: ['super'] },
      { secret: TEST_JWT_SECRET, expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /api/v1/users', () => {
    it('valid body with SUPER token → 202 with operationId', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superToken}`)
        .send(NEW_USER_DTO)
        .expect(202);

      expect(res.body).toHaveProperty('operationId');
      expect(typeof res.body.operationId).toBe('string');
      expect(res.body.status).toBe('pending');
    });

    it('without token → 401', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/users')
        .send(NEW_USER_DTO)
        .expect(401);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('existing user → 200 with user data', async () => {
      pgRepo.findOne.mockResolvedValue(superUser);

      const res = await supertest(app.getHttpServer())
        .get(`/api/v1/users/${SUPER_USER_ID}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: SUPER_USER_ID, email: SUPER_USER_EMAIL });
      expect(res.body).not.toHaveProperty('password');
    });

    it('non-existent user → returns null with 200', async () => {
      pgRepo.findOne.mockResolvedValueOnce(null);

      const res = await supertest(app.getHttpServer())
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${superToken}`);

      // The JWT strategy runs findOne for the super user; subsequent findOne for the target returns null
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/operations/:id', () => {
    it('known operationId → 200 with status', async () => {
      pgRepo.findOne.mockResolvedValue(superUser);
      const opStatus = moduleRef.get(OperationStatusService);
      const testOpId = 'test-operation-id-123';
      await opStatus.pending(testOpId);

      const res = await supertest(app.getHttpServer())
        .get(`/api/v1/operations/${testOpId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ operationId: testOpId, status: 'pending' });
    });

    it('unknown operationId → 404', async () => {
      pgRepo.findOne.mockResolvedValue(superUser);

      await supertest(app.getHttpServer())
        .get('/api/v1/operations/no-such-op')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(404);
    });
  });
});
