import { ConflictError } from "@ecom/shared";
import type { ConfigService } from "@nestjs/config";

import type { AuditService } from "../../audit/audit.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { ObjectStorageService } from "../../storage/object-storage.service";

import { CmsService } from "../cms.service";

describe("CMS media deletion", () => {
  it("does not delete a file that a page still uses", async () => {
    const prisma = {
      cmsMediaAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "media-1", storageKey: "cms/media-1.jpg" }),
        delete: jest.fn(),
      },
      page: {
        findMany: jest.fn().mockResolvedValue([
          { title: "About", fields: { editor: "blocks", blocks: [{ type: "image", mediaId: "media-1" }] }, featuredImageUrl: null, seoOgImage: null },
        ]),
      },
      reusableSection: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const storage = { deleteObject: jest.fn() };
    const service = new CmsService(
      prisma as unknown as PrismaService,
      { log: jest.fn() } as unknown as AuditService,
      { get: jest.fn() } as unknown as ConfigService,
      storage as unknown as ObjectStorageService,
    );

    await expect(service.deleteMedia("media-1", "admin-1")).rejects.toThrow(ConflictError);
    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(prisma.cmsMediaAsset.delete).not.toHaveBeenCalled();
  });
});
