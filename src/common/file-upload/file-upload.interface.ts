export interface FileUploadOptions {
  bucketName?: string;
  fileName?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadedFileInfo {
  fileName: string;
  bucketName: string;
  etag: string;
  url: string;
}