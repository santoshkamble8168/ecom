import type { ApiEnv } from "@ecom/config";
import { ObjectStorage } from "@ecom/shared";
import { Inject, Injectable } from "@nestjs/common";

import { APP_ENV } from "../config/config.module";

@Injectable()
export class ObjectStorageService {
  private storage?: ObjectStorage;

  constructor(@Inject(APP_ENV) private readonly env: ApiEnv) {}

  putObject(key: string, body: Uint8Array | string, contentType: string) {
    return this.client().putObject(key, body, contentType);
  }

  deleteObject(key: string) {
    return this.client().deleteObject(key);
  }

  signedDownloadUrl(key: string, expiresInSeconds = 300) {
    return this.client().signedDownloadUrl(key, expiresInSeconds);
  }

  productMediaUrl(key: string) {
    const token = Buffer.from(key, "utf8").toString("base64url");
    return `/${this.env.API_PREFIX}/media/${token}`;
  }

  get maxImageBytes() {
    return this.env.MEDIA_MAX_IMAGE_BYTES;
  }

  get maxVideoBytes() {
    return this.env.MEDIA_MAX_VIDEO_BYTES;
  }

  private client(): ObjectStorage {
    if (!this.storage) {
      const accessKey = this.env.MINIO_ACCESS_KEY?.trim();
      const secretKey = this.env.MINIO_SECRET_KEY?.trim();
      if (!accessKey || !secretKey) {
        throw new Error("Object storage is not configured");
      }
      this.storage = new ObjectStorage({
        endpoint: this.env.MINIO_ENDPOINT,
        port: this.env.MINIO_PORT,
        useSsl: this.env.MINIO_USE_SSL === "true",
        accessKey,
        secretKey,
        bucket: this.env.MINIO_BUCKET,
      });
    }
    return this.storage;
  }
}
