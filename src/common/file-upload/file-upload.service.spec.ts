import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { FileUploadService } from './file-upload.service';

const FIXED_UUID = 'fixed-uuid';
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60;

type MockMinioClient = {
  bucketExists: jest.Mock;
  makeBucket: jest.Mock;
  setBucketPolicy: jest.Mock;
  putObject: jest.Mock;
  presignedGetObject: jest.Mock;
  removeObject: jest.Mock;
};

jest.mock('minio', () => {
  const mockClient = {
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    setBucketPolicy: jest.fn(),
    putObject: jest.fn(),
    presignedGetObject: jest.fn(),
    removeObject: jest.fn(),
  };

  return {
    Client: jest.fn().mockImplementation(() => mockClient),
    __mockClient: mockClient,
  };
});

jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

const mockClient = (Minio as unknown as { __mockClient: MockMinioClient })
  .__mockClient;
const MockClientConstructor = Minio.Client as unknown as jest.Mock;

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function createConfigService(
  overrides: Partial<{
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
    publicUrl: string;
    publicRead: boolean;
  }> = {},
): ConfigService {
  const minio = {
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'key',
    secretKey: 'secret',
    bucket: 'default-bucket',
    publicUrl: 'https://cdn.example.com',
    publicRead: false,
    ...overrides,
  };

  return {
    get: jest.fn((key: string) => (key === 'minio' ? minio : undefined)),
  } as unknown as ConfigService;
}

describe('FileUploadService', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    MockClientConstructor.mockImplementation(() => mockClient);

    mockClient.bucketExists.mockResolvedValue(true);
    mockClient.makeBucket.mockResolvedValue(undefined);
    mockClient.setBucketPolicy.mockResolvedValue(undefined);
    mockClient.putObject.mockResolvedValue({ etag: 'etag-123' });
    mockClient.presignedGetObject.mockResolvedValue(
      'https://presigned.example.com/file',
    );
    mockClient.removeObject.mockResolvedValue(undefined);

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('constructor and onModuleInit', () => {
    it('instantiates Minio.Client with config credentials', () => {
      const config = createConfigService({
        endPoint: 'minio.local',
        port: 9001,
        useSSL: true,
        accessKey: 'AKIA',
        secretKey: 'SECRET',
      });

      new FileUploadService(config);

      expect(MockClientConstructor).toHaveBeenCalledWith({
        endPoint: 'minio.local',
        port: 9001,
        useSSL: true,
        accessKey: 'AKIA',
        secretKey: 'SECRET',
      });
    });

    it('creates default bucket when it does not exist without public policy by default', async () => {
      mockClient.bucketExists.mockResolvedValue(false);

      const service = new FileUploadService(createConfigService());
      await service.onModuleInit();

      expect(mockClient.bucketExists).toHaveBeenCalledWith('default-bucket');
      expect(mockClient.makeBucket).toHaveBeenCalledWith(
        'default-bucket',
        'us-east-1',
      );
      expect(mockClient.setBucketPolicy).not.toHaveBeenCalled();
    });

    it('sets public policy when publicRead is true', async () => {
      mockClient.bucketExists.mockResolvedValue(false);

      const service = new FileUploadService(createConfigService({ publicRead: true }));
      await service.onModuleInit();

      expect(mockClient.setBucketPolicy).toHaveBeenCalledWith(
        'default-bucket',
        expect.stringContaining('"s3:GetObject"'),
      );

      const policyArg = mockClient.setBucketPolicy.mock.calls[0][1] as string;
      const policy = JSON.parse(policyArg);
      expect(policy).toEqual({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: ['arn:aws:s3:::default-bucket/*'],
          },
        ],
      });
    });

    it('skips makeBucket when default bucket already exists, does not set policy by default', async () => {
      const service = new FileUploadService(createConfigService());
      await service.onModuleInit();

      expect(mockClient.makeBucket).not.toHaveBeenCalled();
      expect(mockClient.setBucketPolicy).not.toHaveBeenCalled();
    });

    it('does not crash when onModuleInit bucketExists rejects', async () => {
      mockClient.bucketExists.mockRejectedValue(new Error('network down'));

      const service = new FileUploadService(createConfigService());
      await expect(service.onModuleInit()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to ensure default bucket exists'),
      );
    });

    it('swallows setBucketPolicy failures during onModuleInit when publicRead is true', async () => {
      mockClient.setBucketPolicy.mockRejectedValue(new Error('Access Denied'));

      const service = new FileUploadService(createConfigService({ publicRead: true }));
      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error setting bucket policy'),
      );
    });
  });

  describe('uploadFile', () => {
    it('uploads with defaults: default bucket, generated name, octet-stream', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const service = new FileUploadService(createConfigService());
      await flushPromises();

      const buffer = Buffer.from('hello');
      const result = await service.uploadFile(buffer);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        'default-bucket',
        `${FIXED_UUID}-1700000000000`,
        buffer,
        buffer.length,
        { 'Content-Type': 'application/octet-stream' },
      );
      expect(result).toEqual({
        fileName: `${FIXED_UUID}-1700000000000`,
        bucketName: 'default-bucket',
        etag: 'etag-123',
        url: `https://cdn.example.com/default-bucket/${FIXED_UUID}-1700000000000`,
      });
      expect(mockClient.presignedGetObject).not.toHaveBeenCalled();
    });

    it('uses custom bucket, fileName, contentType and metadata', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();
      mockClient.bucketExists.mockClear();
      mockClient.makeBucket.mockClear();
      mockClient.setBucketPolicy.mockClear();

      mockClient.bucketExists.mockResolvedValue(false);
      const buffer = Buffer.from('img');

      const result = await service.uploadFile(buffer, {
        bucketName: 'custom-bucket',
        fileName: 'photo.png',
        contentType: 'image/png',
        metadata: { 'x-amz-meta-owner': 'user-1' },
      });

      expect(mockClient.bucketExists).toHaveBeenCalledWith('custom-bucket');
      expect(mockClient.makeBucket).toHaveBeenCalledWith(
        'custom-bucket',
        'us-east-1',
      );
      expect(mockClient.putObject).toHaveBeenCalledWith(
        'custom-bucket',
        'photo.png',
        buffer,
        buffer.length,
        {
          'Content-Type': 'image/png',
          'x-amz-meta-owner': 'user-1',
        },
      );
      expect(result).toEqual({
        fileName: 'photo.png',
        bucketName: 'custom-bucket',
        etag: 'etag-123',
        url: 'https://cdn.example.com/custom-bucket/photo.png',
      });
    });

    it('falls back to presigned URL when publicUrl is empty', async () => {
      const service = new FileUploadService(
        createConfigService({ publicUrl: '' }),
      );
      await flushPromises();

      const result = await service.uploadFile(Buffer.from('x'), {
        fileName: 'doc.pdf',
      });

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        'default-bucket',
        'doc.pdf',
        DEFAULT_EXPIRY,
      );
      expect(result.url).toBe('https://presigned.example.com/file');
    });

    it('rethrows when putObject fails', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();

      mockClient.putObject.mockRejectedValue(new Error('put failed'));

      await expect(
        service.uploadFile(Buffer.from('x'), { fileName: 'a.bin' }),
      ).rejects.toThrow('put failed');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error uploading file'),
      );
    });

    it('rethrows when ensuring bucket fails during upload', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();

      mockClient.bucketExists.mockRejectedValue(
        new Error('bucket check failed'),
      );

      await expect(
        service.uploadFile(Buffer.from('x'), {
          bucketName: 'other-bucket',
          fileName: 'a.bin',
        }),
      ).rejects.toThrow('bucket check failed');
    });
  });

  describe('getFileUrl', () => {
    it('builds public URL with default bucket when publicUrl is set', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();

      const url = await service.getFileUrl('report.csv');

      expect(url).toBe('https://cdn.example.com/default-bucket/report.csv');
      expect(mockClient.presignedGetObject).not.toHaveBeenCalled();
    });

    it('builds public URL with explicit bucket', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();

      const url = await service.getFileUrl('a.txt', 'other');

      expect(url).toBe('https://cdn.example.com/other/a.txt');
    });

    it('uses presignedGetObject with default expiry when publicUrl is empty', async () => {
      const service = new FileUploadService(
        createConfigService({ publicUrl: '' }),
      );
      await flushPromises();

      const url = await service.getFileUrl('secret.bin');

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        'default-bucket',
        'secret.bin',
        DEFAULT_EXPIRY,
      );
      expect(url).toBe('https://presigned.example.com/file');
    });

    it('passes custom expiryInSeconds to presignedGetObject', async () => {
      const service = new FileUploadService(
        createConfigService({ publicUrl: '' }),
      );
      await flushPromises();

      await service.getFileUrl('short.bin', 'default-bucket', 120);

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith(
        'default-bucket',
        'short.bin',
        120,
      );
    });

    it('rethrows when presignedGetObject fails', async () => {
      const service = new FileUploadService(
        createConfigService({ publicUrl: '' }),
      );
      await flushPromises();

      mockClient.presignedGetObject.mockRejectedValue(
        new Error('presign failed'),
      );

      await expect(service.getFileUrl('x')).rejects.toThrow('presign failed');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error generating file URL'),
      );
    });
  });

  describe('deleteFile', () => {
    it('removes object from default bucket', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();

      await service.deleteFile('old.png');

      expect(mockClient.removeObject).toHaveBeenCalledWith(
        'default-bucket',
        'old.png',
      );
    });

    it('removes object from custom bucket', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();

      await service.deleteFile('old.png', 'archives');

      expect(mockClient.removeObject).toHaveBeenCalledWith(
        'archives',
        'old.png',
      );
    });

    it('rethrows when removeObject fails', async () => {
      const service = new FileUploadService(createConfigService());
      await flushPromises();

      mockClient.removeObject.mockRejectedValue(new Error('delete failed'));

      await expect(service.deleteFile('gone.bin')).rejects.toThrow(
        'delete failed',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting file'),
      );
    });
  });
});
