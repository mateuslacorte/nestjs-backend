import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileUploadModule } from './file-upload.module';
import { FileUploadService } from './file-upload.service';

jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

jest.mock('minio', () => {
  const client = {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    setBucketPolicy: jest.fn().mockResolvedValue(undefined),
    putObject: jest.fn(),
    presignedGetObject: jest.fn(),
    removeObject: jest.fn(),
  };
  return {
    Client: jest.fn().mockImplementation(() => client),
  };
});

describe('FileUploadModule', () => {
  it('provides and exports FileUploadService', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              minio: {
                endPoint: 'localhost',
                port: 9000,
                useSSL: false,
                accessKey: 'key',
                secretKey: 'secret',
                bucket: 'default-bucket',
                publicUrl: 'https://cdn.example.com',
              },
            }),
          ],
        }),
        FileUploadModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) =>
          key === 'minio'
            ? {
                endPoint: 'localhost',
                port: 9000,
                useSSL: false,
                accessKey: 'key',
                secretKey: 'secret',
                bucket: 'default-bucket',
                publicUrl: 'https://cdn.example.com',
              }
            : undefined,
      })
      .compile();

    const service = moduleRef.get(FileUploadService);
    expect(service).toBeInstanceOf(FileUploadService);

    await moduleRef.close();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
