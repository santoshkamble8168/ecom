import { ConflictError, NotFoundError, ValidationError } from "@ecom/shared";
import type { BlogCategorySummary, BlogPostDetail, BlogPostSummary, BlogTagSummary } from "@ecom/types";
import { Injectable } from "@nestjs/common";
import type { BlogCategory, BlogTag, Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { sanitizeRichHtml } from "../common/utils/sanitize-html";
import { PrismaService } from "../prisma/prisma.service";

import type { AdminListBlogPostsQueryDto } from "./dto/admin-list-blog-posts-query.dto";
import type { CreateBlogCategoryDto } from "./dto/create-blog-category.dto";
import type { CreateBlogTagDto } from "./dto/create-blog-tag.dto";
import type { ListBlogPostsQueryDto } from "./dto/list-blog-posts-query.dto";
import type { ScheduleBlogPostDto } from "./dto/schedule-blog-post.dto";
import type { CreateBlogPostDto, UpdateBlogPostDto } from "./dto/upsert-blog-post.dto";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const BLOG_POST_WITH_RELATIONS = {
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.BlogPostInclude;

type BlogPostWithRelations = Prisma.BlogPostGetPayload<{ include: typeof BLOG_POST_WITH_RELATIONS }>;

export interface BlogPostListResult {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------
  // Public reads
  // ---------------------------------------------------------------------

  async listPublished(query: ListBlogPostsQueryDto): Promise<BlogPostListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BlogPostWhereInput = {
      status: "published",
      ...(query.categorySlug ? { categories: { some: { category: { slug: query.categorySlug } } } } : {}),
      ...(query.tagSlug ? { tags: { some: { tag: { slug: query.tagSlug } } } } : {}),
    };

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: BLOG_POST_WITH_RELATIONS,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      posts: posts.map((post) => this.toPostSummary(post)),
      total,
      page,
      pageSize,
    };
  }

  async getPublishedBySlug(slug: string): Promise<BlogPostDetail> {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: "published" },
      include: BLOG_POST_WITH_RELATIONS,
    });
    if (!post) throw new NotFoundError("Blog post not found");
    return this.toPostDetail(post);
  }

  async listCategories(): Promise<BlogCategorySummary[]> {
    const categories = await this.prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
    return categories.map((c) => this.toCategorySummary(c));
  }

  async listTags(): Promise<BlogTagSummary[]> {
    const tags = await this.prisma.blogTag.findMany({ orderBy: { name: "asc" } });
    return tags.map((t) => this.toTagSummary(t));
  }

  // ---------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------

  async adminList(query: AdminListBlogPostsQueryDto): Promise<BlogPostListResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BlogPostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categorySlug ? { categories: { some: { category: { slug: query.categorySlug } } } } : {}),
      ...(query.tagSlug ? { tags: { some: { tag: { slug: query.tagSlug } } } } : {}),
    };

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: BLOG_POST_WITH_RELATIONS,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      posts: posts.map((post) => this.toPostSummary(post)),
      total,
      page,
      pageSize,
    };
  }

  async adminGetById(id: string): Promise<BlogPostDetail> {
    const post = await this.prisma.blogPost.findUnique({ where: { id }, include: BLOG_POST_WITH_RELATIONS });
    if (!post) throw new NotFoundError("Blog post not found");
    return this.toPostDetail(post);
  }

  async adminCreate(dto: CreateBlogPostDto, adminId: string): Promise<BlogPostDetail> {
    this.assertValidSlug(dto.slug);
    const existing = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictError("A blog post with this slug already exists");

    await this.assertCategoriesExist(dto.categoryIds ?? []);
    await this.assertTagsExist(dto.tagIds ?? []);

    const post = await this.prisma.blogPost.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        excerpt: dto.excerpt,
        coverImageUrl: dto.coverImageUrl,
        authorName: dto.authorName,
        contentHtml: sanitizeRichHtml(dto.contentHtml),
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoCanonicalUrl: dto.seoCanonicalUrl,
        seoOgImage: dto.seoOgImage,
        relatedProductSkus: dto.relatedProductSkus ?? [],
        categories: dto.categoryIds?.length
          ? { create: dto.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        tags: dto.tagIds?.length ? { create: dto.tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: BLOG_POST_WITH_RELATIONS,
    });

    await this.audit.log({
      userId: adminId,
      action: "BlogPostCreated",
      entityType: "blog_post",
      entityId: post.id,
      metadata: { slug: post.slug },
    });

    return this.toPostDetail(post);
  }

  async adminUpdate(id: string, dto: UpdateBlogPostDto, adminId: string): Promise<BlogPostDetail> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Blog post not found");

    if (dto.slug && dto.slug !== existing.slug) {
      this.assertValidSlug(dto.slug);
      const slugTaken = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
      if (slugTaken) throw new ConflictError("A blog post with this slug already exists");
    }

    if (dto.categoryIds) {
      await this.assertCategoriesExist(dto.categoryIds);
      await this.prisma.blogPostCategory.deleteMany({ where: { blogPostId: id } });
      if (dto.categoryIds.length) {
        await this.prisma.blogPostCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({ blogPostId: id, categoryId })),
        });
      }
    }

    if (dto.tagIds) {
      await this.assertTagsExist(dto.tagIds);
      await this.prisma.blogPostTag.deleteMany({ where: { blogPostId: id } });
      if (dto.tagIds.length) {
        await this.prisma.blogPostTag.createMany({
          data: dto.tagIds.map((tagId) => ({ blogPostId: id, tagId })),
        });
      }
    }

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        slug: dto.slug,
        title: dto.title,
        excerpt: dto.excerpt,
        coverImageUrl: dto.coverImageUrl,
        authorName: dto.authorName,
        contentHtml: dto.contentHtml !== undefined ? sanitizeRichHtml(dto.contentHtml) : undefined,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoCanonicalUrl: dto.seoCanonicalUrl,
        seoOgImage: dto.seoOgImage,
        relatedProductSkus: dto.relatedProductSkus,
      },
      include: BLOG_POST_WITH_RELATIONS,
    });

    await this.audit.log({
      userId: adminId,
      action: "BlogPostUpdated",
      entityType: "blog_post",
      entityId: post.id,
      metadata: { slug: post.slug },
    });

    return this.toPostDetail(post);
  }

  async adminPublish(id: string, adminId: string): Promise<BlogPostDetail> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Blog post not found");

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: { status: "published", publishedAt: new Date() },
      include: BLOG_POST_WITH_RELATIONS,
    });

    await this.audit.log({
      userId: adminId,
      action: "BlogPostPublished",
      entityType: "blog_post",
      entityId: post.id,
      metadata: { slug: post.slug },
    });

    return this.toPostDetail(post);
  }

  async adminSchedule(id: string, dto: ScheduleBlogPostDto, adminId: string): Promise<BlogPostDetail> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Blog post not found");

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new ValidationError("scheduledAt must be a future date");
    }

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: { status: "scheduled", scheduledAt },
      include: BLOG_POST_WITH_RELATIONS,
    });

    await this.audit.log({
      userId: adminId,
      action: "BlogPostScheduled",
      entityType: "blog_post",
      entityId: post.id,
      metadata: { slug: post.slug, scheduledAt: scheduledAt.toISOString() },
    });

    return this.toPostDetail(post);
  }

  async adminListCategories(): Promise<BlogCategorySummary[]> {
    const categories = await this.prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
    return categories.map((c) => this.toCategorySummary(c));
  }

  async adminCreateCategory(dto: CreateBlogCategoryDto, adminId: string): Promise<BlogCategorySummary> {
    const slug = dto.slug ?? this.slugify(dto.name);
    this.assertValidSlug(slug);
    const existing = await this.prisma.blogCategory.findUnique({ where: { slug } });
    if (existing) throw new ConflictError("A blog category with this slug already exists");

    const category = await this.prisma.blogCategory.create({ data: { name: dto.name, slug } });

    await this.audit.log({
      userId: adminId,
      action: "BlogCategoryCreated",
      entityType: "blog_category",
      entityId: category.id,
      metadata: { slug: category.slug },
    });

    return this.toCategorySummary(category);
  }

  async adminListTags(): Promise<BlogTagSummary[]> {
    const tags = await this.prisma.blogTag.findMany({ orderBy: { name: "asc" } });
    return tags.map((t) => this.toTagSummary(t));
  }

  async adminCreateTag(dto: CreateBlogTagDto, adminId: string): Promise<BlogTagSummary> {
    const slug = dto.slug ?? this.slugify(dto.name);
    this.assertValidSlug(slug);
    const existing = await this.prisma.blogTag.findUnique({ where: { slug } });
    if (existing) throw new ConflictError("A blog tag with this slug already exists");

    const tag = await this.prisma.blogTag.create({ data: { name: dto.name, slug } });

    await this.audit.log({
      userId: adminId,
      action: "BlogTagCreated",
      entityType: "blog_tag",
      entityId: tag.id,
      metadata: { slug: tag.slug },
    });

    return this.toTagSummary(tag);
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private assertValidSlug(slug: string): void {
    if (!SLUG_PATTERN.test(slug)) {
      throw new ValidationError("slug must be lowercase, URL-safe, and hyphen-separated (e.g. my-post-title)");
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private async assertCategoriesExist(categoryIds: string[]): Promise<void> {
    if (!categoryIds.length) return;
    const count = await this.prisma.blogCategory.count({ where: { id: { in: categoryIds } } });
    if (count !== categoryIds.length) throw new NotFoundError("One or more blog categories not found");
  }

  private async assertTagsExist(tagIds: string[]): Promise<void> {
    if (!tagIds.length) return;
    const count = await this.prisma.blogTag.count({ where: { id: { in: tagIds } } });
    if (count !== tagIds.length) throw new NotFoundError("One or more blog tags not found");
  }

  private toCategorySummary(category: BlogCategory): BlogCategorySummary {
    return { id: category.id, name: category.name, slug: category.slug };
  }

  private toTagSummary(tag: BlogTag): BlogTagSummary {
    return { id: tag.id, name: tag.name, slug: tag.slug };
  }

  private toPostSummary(post: BlogPostWithRelations): BlogPostSummary {
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImageUrl: post.coverImageUrl,
      authorName: post.authorName,
      status: post.status,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      categories: post.categories.map((pc) => this.toCategorySummary(pc.category)),
      tags: post.tags.map((pt) => this.toTagSummary(pt.tag)),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoCanonicalUrl: post.seoCanonicalUrl,
      seoOgImage: post.seoOgImage,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private toPostDetail(post: BlogPostWithRelations): BlogPostDetail {
    return {
      ...this.toPostSummary(post),
      contentHtml: post.contentHtml,
      relatedProductSkus: post.relatedProductSkus,
    };
  }
}
