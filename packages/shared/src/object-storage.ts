import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface ObjectStorageConfig {
  endpoint: string;
  port: number;
  useSsl: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export class ObjectStorage {
  private readonly client: S3Client;
  private bucketReady?: Promise<void>;

  constructor(private readonly config: ObjectStorageConfig) {
    const protocol = config.useSsl ? "https" : "http";
    this.client = new S3Client({
      endpoint: `${protocol}://${config.endpoint}:${config.port}`,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  async putObject(key: string, body: Uint8Array | string, contentType: string): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  async signedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  private async ensureBucket(): Promise<void> {
    this.bucketReady ??= (async () => {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
      } catch {
        await this.client.send(new CreateBucketCommand({ Bucket: this.config.bucket }));
      }
    })();
    return this.bucketReady;
  }
}

export function objectStorageFromEnv(env: NodeJS.ProcessEnv = process.env): ObjectStorage {
  const accessKey = env.MINIO_ACCESS_KEY?.trim();
  const secretKey = env.MINIO_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) {
    throw new Error("MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required for object storage");
  }

  return new ObjectStorage({
    endpoint: env.MINIO_ENDPOINT ?? "localhost",
    port: Number(env.MINIO_PORT ?? 9000),
    useSsl: env.MINIO_USE_SSL === "true",
    accessKey,
    secretKey,
    bucket: env.MINIO_BUCKET ?? "ecom-assets",
  });
}
