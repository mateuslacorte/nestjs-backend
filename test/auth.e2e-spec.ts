import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import supertest from 'supertest';
import { hashPassword } from '../src/common/crypto/password.util';
import { createTestApp, closeTestApp, TEST_JWT_SECRET, TEST_JWT_REFRESH_SECRET } from './helpers/app.factory';

const TEST_EMAIL = 'auth-test@example.com';
const TEST_PASSWORD = 'SecurePass123!';
const TEST_USER_ID = 'auth-test-user-id';

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  let pgRepo: ReturnType<typeof import('./helpers/app.factory')['createTestApp']> extends Promise<infer T> ? T['pgRepo'] : never;
  let jwtService: JwtService;
  let testUserWithPassword: Record<string, unknown>;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    pgRepo = ctx.pgRepo;
    jwtService = ctx.moduleRef.get(JwtService);

    const hashedPw = await hashPassword(TEST_PASSWORD, { memoryCost: 1024, timeCost: 1, parallelism: 1 });
    testUserWithPassword = {
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      username: 'authtestuser',
      firstName: 'Auth',
      lastName: 'Test',
      password: hashedPw,
      roles: ['super'],
      isActive: true,
      createdAt: new Date(),
    };

    pgRepo.findOne.mockResolvedValue(testUserWithPassword);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /api/v1/auth/login', () => {
    it('valid credentials → 200 with accessToken and refreshToken', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('wrong password → 401', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPassword!' })
        .expect(401);
    });

    it('unknown email → 401', async () => {
      pgRepo.findOne.mockResolvedValueOnce(null);
      await supertest(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: TEST_PASSWORD })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('valid refresh token → 200 with new tokens', async () => {
      const refreshToken = jwtService.sign(
        { id: TEST_USER_ID, email: TEST_EMAIL, roles: ['super'], jti: 'test-jti-1' },
        { secret: TEST_JWT_REFRESH_SECRET, expiresIn: '7d' },
      );

      pgRepo.findOne.mockResolvedValue(testUserWithPassword);

      const res = await supertest(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('invalid refresh token → 401', async () => {
      await supertest(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'not-a-valid-token' })
        .expect(401);
    });
  });

  describe('JWT-protected endpoint', () => {
    it('request without token → 401', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);
    });

    it('request with invalid token → 401', async () => {
      await supertest(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });
});
