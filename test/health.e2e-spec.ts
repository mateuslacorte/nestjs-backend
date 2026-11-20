import { NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { createTestApp, closeTestApp } from './helpers/app.factory';

describe('HealthController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('GET /health → 200 with status ok', async () => {
    const res = await supertest(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
