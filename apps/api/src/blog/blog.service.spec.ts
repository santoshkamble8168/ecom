import { ConflictError, NotFoundError, ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { BlogService } from "./blog.service";

function basePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    slug: "styling-oversized-tees",
    title: "Styling Oversized Tees",
    excerpt: "A quick guide",
    coverImageUrl: null,
    contentHtml: "<p>Hello</p>",
    authorName: "Editorial Team",
    status: "draft",
    scheduledAt: null,
    publishedAt: null,
    seoTitle: null,
    seoDescription: null,
    seoCanonicalUrl: null,
    seoOgImage: null,
    relatedProductSkus: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    categories: [],
    tags: [],
    ...overrides,
  };
}

describe("BlogService", () => {
  let service: BlogService;
  let prisma: {
    blogPost: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    blogCategory: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; count: jest.Mock };
    blogTag: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; count: jest.Mock };
    blogPostCategory: { deleteMany: jest.Mock; createMany: jest.Mock };
    blogPostTag: { deleteMany: jest.Mock; createMany: jest.Mock };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      blogPost: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      blogCategory: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
      blogTag: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
      blogPostCategory: { deleteMany: jest.fn(), createMany: jest.fn() },
      blogPostTag: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new BlogService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  describe("listPublished", () => {
    it("only queries posts with status published", async () => {
      prisma.blogPost.findMany.mockResolvedValue([basePost({ status: "published", publishedAt: new Date() })]);
      prisma.blogPost.count.mockResolvedValue(1);

      const result = await service.listPublished({});

      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "published" } }),
      );
      expect(result.total).toBe(1);
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]?.status).toBe("published");
    });

    it("applies categorySlug and tagSlug filters", async () => {
      prisma.blogPost.findMany.mockResolvedValue([]);
      prisma.blogPost.count.mockResolvedValue(0);

      await service.listPublished({ categorySlug: "style-guides", tagSlug: "streetwear" });

      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "published",
            categories: { some: { category: { slug: "style-guides" } } },
            tags: { some: { tag: { slug: "streetwear" } } },
          },
        }),
      );
    });
  });

  describe("getPublishedBySlug", () => {
    it("throws NotFoundError when the post is not published", async () => {
      prisma.blogPost.findFirst.mockResolvedValue(null);

      await expect(service.getPublishedBySlug("unknown")).rejects.toThrow(NotFoundError);
    });

    it("returns the post detail when published", async () => {
      prisma.blogPost.findFirst.mockResolvedValue(
        basePost({ status: "published", publishedAt: new Date() }),
      );

      const result = await service.getPublishedBySlug("styling-oversized-tees");

      expect(result.slug).toBe("styling-oversized-tees");
      expect(result.contentHtml).toBe("<p>Hello</p>");
    });
  });

  describe("adminCreate", () => {
    const dto = {
      slug: "styling-oversized-tees",
      title: "Styling Oversized Tees",
      authorName: "Editorial Team",
      contentHtml: "<p>Hello</p>",
    };

    it("throws ConflictError when the slug already exists", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(basePost());

      await expect(service.adminCreate(dto, "admin-1")).rejects.toThrow(ConflictError);
      expect(prisma.blogPost.create).not.toHaveBeenCalled();
    });

    it("throws ValidationError for a non-URL-safe slug", async () => {
      await expect(
        service.adminCreate({ ...dto, slug: "Not A Slug!" }, "admin-1"),
      ).rejects.toThrow(ValidationError);
      expect(prisma.blogPost.findUnique).not.toHaveBeenCalled();
    });

    it("creates the post as a draft and logs the audit entry", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);
      prisma.blogPost.create.mockResolvedValue(basePost());

      const result = await service.adminCreate(dto, "admin-1");

      expect(prisma.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: dto.slug, title: dto.title }),
        }),
      );
      expect(result.status).toBe("draft");
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "BlogPostCreated", userId: "admin-1" }),
      );
    });
  });

  describe("adminPublish", () => {
    it("throws NotFoundError when the post does not exist", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);

      await expect(service.adminPublish("missing", "admin-1")).rejects.toThrow(NotFoundError);
    });

    it("sets status to published and stamps publishedAt", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(basePost({ status: "draft" }));
      prisma.blogPost.update.mockResolvedValue(basePost({ status: "published", publishedAt: new Date("2026-02-01T00:00:00Z") }));

      const result = await service.adminPublish("post-1", "admin-1");

      expect(prisma.blogPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "post-1" },
          data: expect.objectContaining({ status: "published", publishedAt: expect.any(Date) }),
        }),
      );
      expect(result.status).toBe("published");
      expect(result.publishedAt).not.toBeNull();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "BlogPostPublished" }));
    });
  });

  describe("adminSchedule", () => {
    it("rejects a scheduledAt that is not in the future", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(basePost());

      await expect(
        service.adminSchedule("post-1", { scheduledAt: "2020-01-01T00:00:00.000Z" }, "admin-1"),
      ).rejects.toThrow(ValidationError);
      expect(prisma.blogPost.update).not.toHaveBeenCalled();
    });

    it("sets status to scheduled", async () => {
      prisma.blogPost.findUnique.mockResolvedValue(basePost());
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      prisma.blogPost.update.mockResolvedValue(basePost({ status: "scheduled", scheduledAt }));

      const result = await service.adminSchedule("post-1", { scheduledAt: scheduledAt.toISOString() }, "admin-1");

      expect(result.status).toBe("scheduled");
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "BlogPostScheduled" }));
    });
  });
});
