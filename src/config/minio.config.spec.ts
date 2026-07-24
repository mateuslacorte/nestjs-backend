import minioConfig from './minio.config';

describe('minio.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_USE_SSL;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.MINIO_BUCKET;
    delete process.env.MINIO_PUBLIC_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults', () => {
    expect(minioConfig()).toEqual({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: '',
      secretKey: '',
      bucket: 'bucket',
      publicUrl: '',
    });
  });

  it('applies overrides and enables SSL only for exact "true"', () => {
    process.env.MINIO_ENDPOINT = 'minio.test';
    process.env.MINIO_PORT = '9001';
    process.env.MINIO_USE_SSL = 'true';
    process.env.MINIO_ACCESS_KEY = 'key';
    process.env.MINIO_SECRET_KEY = 'secret';
    process.env.MINIO_BUCKET = 'uploads';
    process.env.MINIO_PUBLIC_URL = 'https://cdn.example.com';

    expect(minioConfig()).toEqual({
      endPoint: 'minio.test',
      port: 9001,
      useSSL: true,
      accessKey: 'key',
      secretKey: 'secret',
      bucket: 'uploads',
      publicUrl: 'https://cdn.example.com',
    });
  });

  it.each(['1', 'TRUE', 'false', ''])(
    'keeps useSSL false when MINIO_USE_SSL=%s',
    (value) => {
      process.env.MINIO_USE_SSL = value;
      expect(minioConfig().useSSL).toBe(false);
    },
  );
});
