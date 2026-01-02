# File Upload Service

A service for handling AWS S3 compatible file uploads using MinIO client.

## Features

- Upload files to S3 compatible storage
- Generate presigned URLs for uploaded files
- Delete files from storage
- Automatic bucket creation if it doesn't exist

## Usage

### Import the module

```typescript
import { FileUploadModule } from '@common/file-upload/file-upload.module';

@Module({
  imports: [
    FileUploadModule,
    // other modules...
  ],
})
export class YourModule {}
```

### Inject and use the service

```typescript
import { FileUploadService } from '@common/file-upload/file-upload.service';
import { FileUploadOptions } from '@common/file-upload/file-upload.interface';

@Injectable()
export class YourService {
  constructor(private fileUploadService: FileUploadService) {}

  async uploadYourFile(fileBuffer: Buffer): Promise<string> {
    const options: FileUploadOptions = {
      fileName: 'custom-filename.jpg',
      contentType: 'image/jpeg',
      metadata: {
        'x-amz-meta-original-name': 'original-filename.jpg',
      },
    };

    const uploadResult = await this.fileUploadService.uploadFile(fileBuffer, options);
    return uploadResult.url;
  }

  async getFileUrl(fileName: string): Promise<string> {
    return this.fileUploadService.getFileUrl(fileName);
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.fileUploadService.deleteFile(fileName);
  }
}
```

## Configuration

The service uses the MinIO configuration from the ConfigService. Make sure your `.env` file includes the following variables:

```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=atalahub
```