import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadOptions, UploadedFileInfo } from './file-upload.interface';

@Injectable()
export class FileUploadService {
  private minioClient: Minio.Client;
  private defaultBucket: string;
  private publicUrl: string;
  private minioConfig: any;

  constructor(private configService: ConfigService) {
    this.minioConfig = this.configService.get('minio');
    
    this.minioClient = new Minio.Client({
      endPoint: this.minioConfig.endPoint,
      port: this.minioConfig.port,
      useSSL: this.minioConfig.useSSL,
      accessKey: this.minioConfig.accessKey,
      secretKey: this.minioConfig.secretKey,
    });

    this.defaultBucket = this.minioConfig.bucket;
    this.publicUrl = this.minioConfig.publicUrl;
    
    // Ensure the default bucket exists and is public
    this.ensureBucketExists(this.defaultBucket).catch(err => {
      console.error(`Failed to ensure default bucket exists: ${err.message}`);
    });
  }

  /**
   * Ensures that the specified bucket exists, creating it if it doesn't
   * Also sets the bucket policy to allow public read access
   */
  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (!exists) {
        console.log(`Bucket ${bucketName} does not exist, creating it...`);
        await this.minioClient.makeBucket(bucketName, 'us-east-1');
        console.log(`Bucket ${bucketName} created successfully`);
      } else {
        console.log(`Bucket ${bucketName} already exists`);
      }

      // Set bucket policy to allow public read access
      await this.setBucketPublicPolicy(bucketName);
    } catch (error: any) {
      console.error(`Error ensuring bucket exists: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sets the bucket policy to allow public read access
   */
  private async setBucketPublicPolicy(bucketName: string): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };

      await this.minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Bucket ${bucketName} policy set to public read`);
    } catch (error: any) {
      console.error(`Error setting bucket policy: ${error.message}`);
      // Don't throw - bucket might already have the policy or permissions issue
    }
  }

  /**
   * Uploads a file to S3 storage
   * @param fileBuffer - The file buffer to upload
   * @param options - Upload options
   * @returns Information about the uploaded file
   */
  async uploadFile(
    fileBuffer: Buffer,
    options?: FileUploadOptions,
  ): Promise<UploadedFileInfo> {
    try {
      const bucketName = options?.bucketName || this.defaultBucket;
      const fileName = options?.fileName || `${uuidv4()}-${Date.now()}`;
      const contentType = options?.contentType || 'application/octet-stream';
      const metadata = options?.metadata || {};

      // Ensure the bucket exists
      await this.ensureBucketExists(bucketName);

      console.log(`Uploading file ${fileName} to bucket ${bucketName}...`);
      
      // Upload the file
      const uploadInfo = await this.minioClient.putObject(
        bucketName,
        fileName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType,
          ...metadata,
        },
      );
      const etag = uploadInfo.etag;

      console.log(`File ${fileName} uploaded successfully with etag: ${etag}`);

      // Generate a URL for the uploaded file
      const url = await this.getFileUrl(fileName, bucketName);

      return {
        fileName,
        bucketName,
        etag,
        url,
      };
    } catch (error: any) {
      console.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets a public URL for a file
   * If publicUrl is configured, returns a direct public URL
   * Otherwise, falls back to presigned URL
   * @param fileName - The name of the file
   * @param bucketName - The name of the bucket (optional, uses default if not provided)
   * @param expiryInSeconds - URL expiry time in seconds (default: 7 days) - only used for presigned URLs
   * @returns The file URL
   */
  async getFileUrl(
    fileName: string,
    bucketName?: string,
    expiryInSeconds: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    try {
      const bucket = bucketName || this.defaultBucket;
      
      console.log(`Generating URL for file ${fileName} in bucket ${bucket}...`);
      
      // If public URL is configured, return direct public URL
      if (this.publicUrl) {
        const url = `${this.publicUrl}/${bucket}/${fileName}`;
        console.log(`Public URL generated: ${url}`);
        return url;
      }
      
      // Fallback to presigned URL if no public URL configured
      const url = await this.minioClient.presignedGetObject(
        bucket,
        fileName,
        expiryInSeconds,
      );
      
      console.log(`Presigned URL generated: ${url}`);
      
      return url;
    } catch (error: any) {
      console.error(`Error generating file URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a file from S3 storage
   * @param fileName - The name of the file to delete
   * @param bucketName - The name of the bucket (optional, uses default if not provided)
   */
  async deleteFile(fileName: string, bucketName?: string): Promise<void> {
    try {
      const bucket = bucketName || this.defaultBucket;
      
      console.log(`Deleting file ${fileName} from bucket ${bucket}...`);
      
      await this.minioClient.removeObject(bucket, fileName);
      
      console.log(`File ${fileName} deleted successfully`);
    } catch (error: any) {
      console.error(`Error deleting file: ${error.message}`);
      throw error;
    }
  }
}