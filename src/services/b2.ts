import crypto from 'crypto';
import { Service } from 'typedi';

export interface B2Config {
  applicationKeyId: string;
  applicationKey: string;
  bucketId: string;
  bucketName: string;
}

export interface B2AuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

export interface B2UploadUrlResponse {
  uploadUrl: string;
  authorizationToken: string;
}

export interface B2FileInfo {
  fileId: string;
  fileName: string;
  contentType: string;
  contentLength: number;
  uploadTimestamp: number;
}

@Service()
export class B2Service {
  private config: B2Config;
  private authInfo: B2AuthResponse | null = null;
  private authExpiry: number = 0;

  constructor(config?: B2Config) {
    // Optionally allow config injection, or use env vars
    this.config = config || {
      applicationKeyId: process.env.B2_KEY_ID!,
      applicationKey: process.env.B2_APPLICATION_KEY!,
      bucketId: process.env.B2_BUCKET!,
      bucketName: process.env.B2_BUCKET_NAME || '',
    };
  }

  private async authenticate(): Promise<B2AuthResponse> {
    if (this.authInfo && Date.now() < this.authExpiry) {
      return this.authInfo;
    }
    const credentials = Buffer.from(
      `${this.config.applicationKeyId}:${this.config.applicationKey}`
    ).toString('base64');
    const response = await fetch(
      'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`B2 authentication failed: ${errorText}`);
    }
    const data = await response.json();
    this.authInfo = {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
    };
    this.authExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return this.authInfo;
  }

  private async getUploadUrl(): Promise<B2UploadUrlResponse> {
    const auth = await this.authenticate();
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: this.config.bucketId,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get upload URL: ${error}`);
    }
    return await response.json();
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string = 'application/octet-stream'
  ): Promise<B2FileInfo> {
    const uploadInfo = await this.getUploadUrl();
    const sha1 = crypto.createHash('sha1').update(file).digest('hex');
    const response = await fetch(uploadInfo.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadInfo.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': contentType,
        'Content-Length': file.length.toString(),
        'X-Bz-Content-Sha1': sha1,
      },
      body: file,
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`File upload failed: ${error}`);
    }
    const result = await response.json();
    return {
      fileId: result.fileId,
      fileName: result.fileName,
      contentType: result.contentType,
      contentLength: result.contentLength,
      uploadTimestamp: result.uploadTimestamp,
    };
  }

  async downloadFile(fileId: string): Promise<{
    data: Buffer;
    fileName: string;
    contentType: string;
  }> {
    const auth = await this.authenticate();
    const response = await fetch(
      `${auth.apiUrl}/b2api/v2/b2_download_file_by_id`,
      {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileId,
        }),
      }
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`File download failed: ${error}`);
    }
    const fileName = response.headers.get('X-Bz-File-Name') || 'unknown';
    const contentType =
      response.headers.get('Content-Type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    return {
      data,
      fileName: decodeURIComponent(fileName),
      contentType,
    };
  }

  async deleteFile(fileId: string, fileName: string): Promise<void> {
    const auth = await this.authenticate();
    const response = await fetch(
      `${auth.apiUrl}/b2api/v2/b2_delete_file_version`,
      {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileId,
          fileName: fileName,
        }),
      }
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`File deletion failed: ${error}`);
    }
  }
}
