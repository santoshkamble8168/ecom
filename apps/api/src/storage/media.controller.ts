import { NotFoundError } from "@ecom/shared";
import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";

import { Public } from "../common/decorators/public.decorator";

import { ObjectStorageService } from "./object-storage.service";

@Controller("media")
export class MediaController {
  constructor(private readonly storage: ObjectStorageService) {}

  @Public()
  @Get(":token")
  async getProductMedia(@Param("token") token: string, @Res() response: Response): Promise<void> {
    let objectKey: string;
    try {
      objectKey = Buffer.from(token, "base64url").toString("utf8");
    } catch {
      throw new NotFoundError("Media not found");
    }
    if (!/^products\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(jpg|png|webp|gif|mp4|webm)$/.test(objectKey)) {
      throw new NotFoundError("Media not found");
    }
    response.redirect(302, await this.storage.signedDownloadUrl(objectKey, 60));
  }
}
