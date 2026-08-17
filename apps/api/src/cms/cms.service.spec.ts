import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@ecom/shared";
import type { ConfigService } from "@nestjs/config";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { CmsService } from "./cms.service";

function basePage(overrides: Record<string, unknown> = {}) {
  return {
    id: "page-1",
    type: "homepage",
    slug: "home",
    title: "Homepage",
    status: "draft",
    fields: { sections: [{ kind: "rich_text", html: "<p>Hi</p>" }] },
    seoTitle: null,
    seoDescription: null,
    seoCanonicalUrl: null,
    seoOgImage: null,
    scheduledAt: null,
    publishedAt: null,
    archivedAt: null,
    createdBy: "admin-1",
    updatedBy: "admin-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("CmsService", () => {
  let service: CmsService;
  let prisma: {
    page: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    pageVersion: { create: jest.Mock; findMany: jest.Mock };
    banner: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    menu: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    menuItem: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };
  let audit: { log: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    prisma = {
      page: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      pageVersion: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn() },
      banner: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      menu: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      menuItem: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn((_key: string, fallback: string) => fallback) };

    service = new CmsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      config as unknown as ConfigService,
    );
  });

  describe("getPublishedBySlug", () => {
    it("returns a published page", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ status: "published" }));

      const result = await service.getPublishedBySlug("home");

      expect(result.slug).toBe("home");
      expect(result.status).toBe("published");
    });

    it("throws NotFoundError for a scheduled page (not yet published)", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ status: "scheduled", scheduledAt: new Date(Date.now() + 86400000) }));

      await expect(service.getPublishedBySlug("home")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for a draft page", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ status: "draft" }));

      await expect(service.getPublishedBySlug("home")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when no page exists", async () => {
      prisma.page.findUnique.mockResolvedValue(null);

      await expect(service.getPublishedBySlug("missing")).rejects.toThrow(NotFoundError);
    });
  });

  describe("getPreviewBySlug", () => {
    it("throws ForbiddenError when the token does not match", async () => {
      await expect(service.getPreviewBySlug("home", "wrong-token")).rejects.toThrow(ForbiddenError);
      expect(prisma.page.findUnique).not.toHaveBeenCalled();
    });

    it("returns the page regardless of status when the token matches", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ status: "draft" }));

      const result = await service.getPreviewBySlug("home", "dev-preview-token");

      expect(result.status).toBe("draft");
    });

    it("uses the CMS_PREVIEW_TOKEN from config when set", async () => {
      config.get.mockReturnValue("custom-token");
      prisma.page.findUnique.mockResolvedValue(basePage({ status: "draft" }));

      await expect(service.getPreviewBySlug("home", "dev-preview-token")).rejects.toThrow(ForbiddenError);

      const result = await service.getPreviewBySlug("home", "custom-token");
      expect(result.status).toBe("draft");
    });
  });

  describe("adminCreatePage", () => {
    it("throws ConflictError when the slug is already taken", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage());

      await expect(
        service.adminCreatePage(
          { type: "homepage", slug: "home", title: "Homepage", fields: { sections: [] } },
          "admin-1",
        ),
      ).rejects.toThrow(ConflictError);
      expect(prisma.page.create).not.toHaveBeenCalled();
    });

    it("throws ValidationError when fields don't match the page type", async () => {
      prisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.adminCreatePage({ type: "policy", slug: "terms", title: "Terms", fields: {} }, "admin-1"),
      ).rejects.toThrow(ValidationError);
      expect(prisma.page.create).not.toHaveBeenCalled();
    });

    it("creates a page starting in draft status", async () => {
      prisma.page.findUnique.mockResolvedValue(null);
      prisma.page.create.mockResolvedValue(basePage({ status: "draft" }));

      await service.adminCreatePage(
        { type: "homepage", slug: "home", title: "Homepage", fields: { sections: [] } },
        "admin-1",
      );

      expect(prisma.page.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "draft" }) }),
      );
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe("publishPage", () => {
    it("always writes a PageVersion snapshot", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ status: "draft" }));
      prisma.page.update.mockResolvedValue(basePage({ status: "published", publishedAt: new Date() }));

      await service.publishPage("page-1", "admin-1");

      expect(prisma.pageVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pageId: "page-1", publishedBy: "admin-1" }),
        }),
      );
    });

    it("writes a new version on every re-publish", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ status: "published" }));
      prisma.page.update.mockResolvedValue(basePage({ status: "published" }));

      await service.publishPage("page-1", "admin-1");
      await service.publishPage("page-1", "admin-1");

      expect(prisma.pageVersion.create).toHaveBeenCalledTimes(2);
    });

    it("rejects publishing when fields fail validation", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ type: "policy", fields: {} }));

      await expect(service.publishPage("page-1", "admin-1")).rejects.toThrow(ValidationError);
      expect(prisma.page.update).not.toHaveBeenCalled();
      expect(prisma.pageVersion.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundError for a missing page", async () => {
      prisma.page.findUnique.mockResolvedValue(null);

      await expect(service.publishPage("missing", "admin-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("schedulePage", () => {
    it("rejects a scheduledAt in the past", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage());

      await expect(
        service.schedulePage("page-1", { scheduledAt: new Date(Date.now() - 1000).toISOString() }, "admin-1"),
      ).rejects.toThrow(ValidationError);
      expect(prisma.page.update).not.toHaveBeenCalled();
    });

    it("schedules a page for a future date", async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      prisma.page.findUnique.mockResolvedValue(basePage());
      prisma.page.update.mockResolvedValue(basePage({ status: "scheduled", scheduledAt: new Date(future) }));

      const result = await service.schedulePage("page-1", { scheduledAt: future }, "admin-1");

      expect(result.status).toBe("scheduled");
      expect(prisma.page.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "scheduled" }) }),
      );
    });
  });

  describe("adminUpdatePage", () => {
    it("throws ConflictError when the new slug is already taken by another page", async () => {
      prisma.page.findUnique
        .mockResolvedValueOnce(basePage({ id: "page-1", slug: "home" }))
        .mockResolvedValueOnce(basePage({ id: "page-2", slug: "new-slug" }));

      await expect(service.adminUpdatePage("page-1", { slug: "new-slug" }, "admin-1")).rejects.toThrow(ConflictError);
    });

    it("re-validates fields when they are being changed", async () => {
      prisma.page.findUnique.mockResolvedValue(basePage({ type: "policy" }));

      await expect(service.adminUpdatePage("page-1", { fields: {} }, "admin-1")).rejects.toThrow(ValidationError);
      expect(prisma.page.update).not.toHaveBeenCalled();
    });
  });

  describe("listActiveBanners", () => {
    it("queries only published banners for the given placement ordered by sortOrder", async () => {
      prisma.banner.findMany.mockResolvedValue([]);

      await service.listActiveBanners("homepage_hero");

      expect(prisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ placement: "homepage_hero", status: "published" }),
          orderBy: { sortOrder: "asc" },
        }),
      );
    });
  });

  describe("getMenuByCode", () => {
    it("throws NotFoundError when the menu doesn't exist", async () => {
      prisma.menu.findUnique.mockResolvedValue(null);

      await expect(service.getMenuByCode("missing")).rejects.toThrow(NotFoundError);
    });

    it("builds a nested tree from flat parentId references", async () => {
      prisma.menu.findUnique.mockResolvedValue({
        id: "menu-1",
        code: "main-nav",
        name: "Main Navigation",
        items: [
          { id: "item-1", parentId: null, label: "Men", url: "/men", sortOrder: 0, opensInNewTab: false, isActive: true },
          { id: "item-2", parentId: "item-1", label: "T-Shirts", url: "/men/t-shirts", sortOrder: 0, opensInNewTab: false, isActive: true },
        ],
      });

      const result = await service.getMenuByCode("main-nav");

      expect(result.items).toHaveLength(1);
      const [topItem] = result.items;
      expect(topItem?.children).toHaveLength(1);
      expect(topItem?.children[0]?.label).toBe("T-Shirts");
    });
  });
});
