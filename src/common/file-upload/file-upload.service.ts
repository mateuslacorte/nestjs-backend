import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadOptions, UploadedFileInfo } from './file-upload.interface';

interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
  publicRead: boolean;
}

@Injectable()
export class FileUploadService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly defaultBucket: string;
  private readonly publicUrl: string;
  private readonly minioConfig: MinioConfig;

  constructor(private readonly configService: ConfigService) {
    this.minioConfig = this.configService.get<MinioConfig>('minio') as MinioConfig;

    this.minioClient = new Minio.Client({
      endPoint: this.minioConfig.endPoint,
      port: this.minioConfig.port,
      useSSL: this.minioConfig.useSSL,
      accessKey: this.minioConfig.accessKey,
      secretKey: this.minioConfig.secretKey,
    });

    this.defaultBucket = this.minioConfig.bucket;
    this.publicUrl = this.minioConfig.publicUrl;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucketExists(this.defaultBucket);
    } catch (err) {
      console.error(`Failed to ensure default bucket exists: ${(err as Error).message}`);
    }
  }

  private async ensureBucketExists(bucketName: string): Promise<void> {
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      console.log(`Bucket ${bucketName} does not exist, creating it...`);
      await this.minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket ${bucketName} created successfully`);
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }

    if (this.minioConfig.publicRead) {
      await this.setBucketPublicPolicy(bucketName);
    }
  }

  private async setBucketPublicPolicy(bucketName: string): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await this.minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Bucket ${bucketName} policy set to public read`);
    } catch (err) {
      console.error(`Error setting bucket policy: ${(err as Error).message}`);
    }
  }

  async uploadFile(fileBuffer: Buffer, options?: FileUploadOptions): Promise<UploadedFileInfo> {
    try {
      const bucketName = options?.bucketName || this.defaultBucket;
      const fileName = options?.fileName || `${uuidv4()}-${Date.now()}`;
      const contentType = options?.contentType || 'application/octet-stream';
      const metadata = options?.metadata || {};

      await this.ensureBucketExists(bucketName);

      console.log(`Uploading file ${fileName} to bucket ${bucketName}...`);

      const uploadInfo = await this.minioClient.putObject(
        bucketName,
        fileName,
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': contentType, ...metadata },
      );
      const etag = uploadInfo.etag;

      console.log(`File ${fileName} uploaded successfully with etag: ${etag}`);

      const url = await this.getFileUrl(fileName, bucketName);
      return { fileName, bucketName, etag, url };
    } catch (error) {
      console.error(`Error uploading file: ${(error as Error).message}`);
      throw error;
    }
  }

  async getFileUrl(fileName: string, bucketName?: string, expiryInSeconds = 7 * 24 * 60 * 60): Promise<string> {
    try {
      const bucket = bucketName || this.defaultBucket;
      console.log(`Generating URL for file ${fileName} in bucket ${bucket}...`);

      if (this.publicUrl) {
        const url = `${this.publicUrl}/${bucket}/${fileName}`;
        console.log(`Public URL generated: ${url}`);
        return url;
      }

      const url = await this.minioClient.presignedGetObject(bucket, fileName, expiryInSeconds);
      console.log(`Presigned URL generated: ${url}`);
      return url;
    } catch (error) {
      console.error(`Error generating file URL: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteFile(fileName: string, bucketName?: string): Promise<void> {
    try {
      const bucket = bucketName || this.defaultBucket;
      console.log(`Deleting file ${fileName} from bucket ${bucket}...`);
      await this.minioClient.removeObject(bucket, fileName);
      console.log(`File ${fileName} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting file: ${(error as Error).message}`);
      throw error;
    }
  }
}
