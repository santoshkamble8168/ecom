import { ConflictError, NotFoundError, ValidationError, buildPaginationMeta, paginationSkip } from "@ecom/shared";
import type {
  BannerPlacement,
  BannerSummary,
  CmsMediaAsset,
  ContentBlock,
  MenuItemSummary,
  MenuSummary,
  PageDetail,
  PageFields,
  PageSummary,
  PageType,
  PageVersionDetail,
  PageVersionSummary,
  ReusableSectionSummary,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  Banner as BannerModel,
  CmsMediaAsset as CmsMediaAssetModel,
  Menu as MenuModel,
  MenuItem as MenuItemModel,
  Page as PageModel,
  PageVersion as PageVersionModel,
  Prisma,
  ReusableSection as ReusableSectionModel,
} from "@prisma/client";
import { randomUUID } from "crypto";

import { AuditService } from "../audit/audit.service";
import { sanitizeJsonStrings } from "../common/utils/sanitize-html";
import { PrismaService } from "../prisma/prisma.service";
import { ObjectStorageService } from "../storage/object-storage.service";

import type { CreateBannerDto } from "./dto/create-banner.dto";
import type { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import type { CreateMenuDto } from "./dto/create-menu.dto";
import type { CreatePageDto } from "./dto/create-page.dto";
import type { ListBannersQueryDto } from "./dto/list-banners-query.dto";
import type { ListPagesQueryDto } from "./dto/list-pages-query.dto";
import type { SchedulePageDto } from "./dto/schedule-page.dto";
import type { UpdateBannerDto } from "./dto/update-banner.dto";
import type { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import type { UpdatePageDto } from "./dto/update-page.dto";
import type { ListMediaQueryDto, UpdateMediaDto } from "./dto/update-media.dto";
import type { ReorderMenuDto } from "./dto/reorder-menu.dto";
import type { CreateReusableSectionDto, UpdateReusableSectionDto } from "./dto/reusable-section.dto";
import type { UpdateMenuDto } from "./dto/update-menu.dto";
import { validateBlockDocument } from "./policies/block-fields.policy";
import { validatePageFields } from "./policies/page-fields.policy";
import { DYNAMIC_PAGE_TYPES, STATIC_PAGE_TYPES } from "./cms.constants";
import { publicPagePath } from "./cms-paths";

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly storage: ObjectStorageService,
  ) {}

  // ---------------------------------------------------------------------
  // Public — pages
  // ---------------------------------------------------------------------

  async getPublishedBySlug(slug: string): Promise<PageDetail> {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || page.status !== "published" || page.deletedAt) {
      throw new NotFoundError("Page not found");
    }
    return this.withReusableSections(this.toPageDetail(page));
  }

  async getPreviewBySlug(slug: string, token: string): Promise<PageDetail> {
    const expectedToken = this.config.get<string>("CMS_PREVIEW_TOKEN");
    if (!expectedToken || token !== expectedToken) {
      throw new NotFoundError("Page not found");
    }

    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || page.deletedAt) throw new NotFoundError("Page not found");
    return this.withReusableSections(this.toPageDetail(page));
  }

  // ---------------------------------------------------------------------
  // Public — banners
  // ---------------------------------------------------------------------

  async listActiveBanners(placement: BannerPlacement, now = new Date()): Promise<BannerSummary[]> {
    const banners = await this.prisma.banner.findMany({
      where: {
        placement,
        status: "published",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: "asc" },
    });
    return banners.map((b) => this.toBannerSummary(b));
  }

  // ---------------------------------------------------------------------
  // Public — menus
  // ---------------------------------------------------------------------

  async getMenuByCode(code: string): Promise<MenuSummary> {
    const menu = await this.prisma.menu.findUnique({
      where: { code },
      include: { items: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!menu) throw new NotFoundError("Menu not found");
    return this.toMenuSummary(menu);
  }

  // ---------------------------------------------------------------------
  // Admin — pages
  // ---------------------------------------------------------------------

  async adminListPages(query: ListPagesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.PageWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.kind === "static" ? { type: { in: [...STATIC_PAGE_TYPES] } } : {}),
      ...(query.kind === "dynamic" ? { type: { in: [...DYNAMIC_PAGE_TYPES] } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    if (query.type) where.type = query.type;

    const [items, totalItems] = await Promise.all([
      this.prisma.page.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
      this.prisma.page.count({ where }),
    ]);

    return {
      items: items.map((p) => this.toPageSummary(p)),
      meta: { pagination: buildPaginationMeta(page, pageSize, totalItems) },
    };
  }

  async adminGetPage(id: string): Promise<PageDetail> {
    const page = await this.findPageOrThrow(id);
    return this.withReusableSections(this.toPageDetail(page));
  }

  async adminCreatePage(dto: CreatePageDto, adminId: string): Promise<PageDetail> {
    await this.assertSlugAvailable(dto.slug);
    const fields = sanitizeJsonStrings(dto.fields);
    validatePageFields(dto.type as PageType, fields);

    const created = await this.prisma.page.create({
      data: {
        type: dto.type,
        slug: dto.slug,
        title: dto.title,
        status: "draft",
        fields: fields as Prisma.InputJsonValue,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoCanonicalUrl: dto.seoCanonicalUrl,
        seoOgImage: dto.seoOgImage,
        seoNoIndex: dto.seoNoIndex ?? false,
        templateKey: dto.templateKey,
        featuredImageUrl: dto.featuredImageUrl,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "PageCreated",
      entityType: "page",
      entityId: created.id,
      metadata: { slug: created.slug, type: created.type },
    });

    return this.toPageDetail(created);
  }

  async adminUpdatePage(id: string, dto: UpdatePageDto, adminId: string): Promise<PageDetail> {
    const existing = await this.findPageOrThrow(id);

    if (dto.slug && dto.slug !== existing.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    const nextType = (dto.type as PageType | undefined) ?? (existing.type as PageType);
    const nextFields = dto.fields !== undefined ? sanitizeJsonStrings(dto.fields) : undefined;
    if (nextFields !== undefined) {
      validatePageFields(nextType, nextFields);
    }

    const updated = await this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(nextFields !== undefined ? { fields: nextFields as Prisma.InputJsonValue } : {}),
        ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
        ...(dto.seoDescription !== undefined ? { seoDescription: dto.seoDescription } : {}),
        ...(dto.seoCanonicalUrl !== undefined ? { seoCanonicalUrl: dto.seoCanonicalUrl } : {}),
        ...(dto.seoOgImage !== undefined ? { seoOgImage: dto.seoOgImage } : {}),
        ...(dto.seoNoIndex !== undefined ? { seoNoIndex: dto.seoNoIndex } : {}),
        ...(dto.templateKey !== undefined ? { templateKey: dto.templateKey } : {}),
        ...(dto.featuredImageUrl !== undefined ? { featuredImageUrl: dto.featuredImageUrl } : {}),
        updatedBy: adminId,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "PageUpdated",
      entityType: "page",
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toPageDetail(updated);
  }

  async publishPage(id: string, adminId: string): Promise<PageDetail> {
    const page = await this.findPageOrThrow(id);
    validatePageFields(page.type as PageType, page.fields);

    const now = new Date();
    const updated = await this.prisma.page.update({
      where: { id },
      data: { status: "published", publishedAt: now, scheduledAt: null, updatedBy: adminId },
    });

    // Every publish (including re-publishes) writes an immutable version
    // snapshot — see `PageVersion` doc comment in schema.prisma.
    await this.writePageVersion(updated, adminId);

    await this.audit.log({
      userId: adminId,
      action: "PagePublished",
      entityType: "page",
      entityId: id,
      metadata: { slug: updated.slug },
    });

    return this.toPageDetail(updated);
  }

  async schedulePage(id: string, dto: SchedulePageDto, adminId: string): Promise<PageDetail> {
    const page = await this.findPageOrThrow(id);
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw new ValidationError("scheduledAt must be a valid date in the future");
    }
    validatePageFields(page.type as PageType, page.fields);

    const updated = await this.prisma.page.update({
      where: { id },
      data: { status: "scheduled", scheduledAt, updatedBy: adminId },
    });

    await this.audit.log({
      userId: adminId,
      action: "PageScheduled",
      entityType: "page",
      entityId: id,
      metadata: { scheduledAt: scheduledAt.toISOString() },
    });

    return this.toPageDetail(updated);
  }

  async archivePage(id: string, adminId: string): Promise<PageDetail> {
    await this.findPageOrThrow(id);

    const updated = await this.prisma.page.update({
      where: { id },
      data: { status: "archived", archivedAt: new Date(), updatedBy: adminId },
    });

    await this.audit.log({
      userId: adminId,
      action: "PageArchived",
      entityType: "page",
      entityId: id,
    });

    return this.toPageDetail(updated);
  }

  async listPageVersions(id: string): Promise<PageVersionSummary[]> {
    await this.findPageOrThrow(id);
    const versions = await this.prisma.pageVersion.findMany({
      where: { pageId: id },
      orderBy: { createdAt: "desc" },
    });
    return versions.map((v) => this.toPageVersionSummary(v));
  }

  async getPageVersion(pageId: string, versionId: string): Promise<PageVersionDetail> {
    await this.findPageOrThrow(pageId);
    const version = await this.prisma.pageVersion.findFirst({ where: { id: versionId, pageId } });
    if (!version) throw new NotFoundError("Version not found");
    const seo = (version.seoSnapshot ?? {}) as {
      seoTitle?: string | null;
      seoDescription?: string | null;
      seoCanonicalUrl?: string | null;
      seoOgImage?: string | null;
      seoNoIndex?: boolean;
    };
    return {
      ...this.toPageVersionSummary(version),
      fields: version.fields as unknown as PageFields,
      seo: {
        seoTitle: seo.seoTitle ?? null,
        seoDescription: seo.seoDescription ?? null,
        seoCanonicalUrl: seo.seoCanonicalUrl ?? null,
        seoOgImage: seo.seoOgImage ?? null,
        seoNoIndex: seo.seoNoIndex ?? false,
      },
    };
  }

  async restorePageVersion(pageId: string, versionId: string, adminId: string): Promise<PageDetail> {
    const page = await this.findPageOrThrow(pageId);
    const version = await this.getPageVersion(pageId, versionId);
    validatePageFields(page.type as PageType, version.fields);
    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: {
        title: version.title,
        fields: version.fields as unknown as Prisma.InputJsonValue,
        seoTitle: version.seo.seoTitle,
        seoDescription: version.seo.seoDescription,
        seoCanonicalUrl: version.seo.seoCanonicalUrl,
        seoOgImage: version.seo.seoOgImage,
        seoNoIndex: version.seo.seoNoIndex ?? false,
        updatedBy: adminId,
      },
    });
    if (updated.status === "published") {
      await this.writePageVersion(updated, adminId);
    }
    await this.audit.log({
      userId: adminId,
      action: "PageVersionRestored",
      entityType: "page",
      entityId: pageId,
      metadata: { versionId },
    });
    return this.withReusableSections(this.toPageDetail(updated));
  }

  async duplicatePage(id: string, adminId: string): Promise<PageDetail> {
    const page = await this.findPageOrThrow(id);
    const slug = await this.nextCopySlug(page.slug);
    const created = await this.prisma.page.create({
      data: {
        type: page.type,
        slug,
        title: `Copy of ${page.title}`,
        status: "draft",
        fields: page.fields as Prisma.InputJsonValue,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        seoCanonicalUrl: null,
        seoOgImage: page.seoOgImage,
        seoNoIndex: page.seoNoIndex,
        templateKey: page.templateKey,
        featuredImageUrl: page.featuredImageUrl,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: "PageDuplicated",
      entityType: "page",
      entityId: created.id,
      metadata: { sourceId: id },
    });
    return this.toPageDetail(created);
  }

  async unpublishPage(id: string, adminId: string): Promise<PageDetail> {
    await this.findPageOrThrow(id);
    const updated = await this.prisma.page.update({
      where: { id },
      data: { status: "draft", scheduledAt: null, updatedBy: adminId },
    });
    await this.audit.log({
      userId: adminId,
      action: "PageUnpublished",
      entityType: "page",
      entityId: id,
    });
    return this.toPageDetail(updated);
  }

  async deletePage(id: string, adminId: string): Promise<void> {
    await this.findPageOrThrow(id);
    await this.prisma.page.update({
      where: { id },
      data: { deletedAt: new Date(), status: "archived", archivedAt: new Date(), updatedBy: adminId },
    });
    await this.audit.log({
      userId: adminId,
      action: "PageDeleted",
      entityType: "page",
      entityId: id,
    });
  }

  async previewPage(id: string): Promise<{ url: string }> {
    const page = await this.findPageOrThrow(id);
    const token = this.config.get<string>("CMS_PREVIEW_TOKEN");
    if (!token) throw new ValidationError("Preview is not configured. Set CMS_PREVIEW_TOKEN.");
    const origin = (this.config.get<string>("STOREFRONT_URL") ?? "http://localhost:3000").replace(/\/$/, "");
    const url = `${origin}/pages/${encodeURIComponent(page.slug)}/preview?token=${encodeURIComponent(token)}`;
    return { url };
  }

  async listPublishedPaths(): Promise<string[]> {
    const pages = await this.prisma.page.findMany({
      where: { status: "published", deletedAt: null, seoNoIndex: false },
      select: { slug: true, type: true },
    });
    return [...new Set(pages.map((page) => publicPagePath(page)).filter((path): path is string => Boolean(path)))];
  }

  async getPublishedDynamic(type: PageType, source: string): Promise<PageDetail | null> {
    const page = await this.prisma.page.findFirst({
      where: {
        status: "published",
        deletedAt: null,
        type,
        OR: [{ slug: source }, { fields: { path: ["sourceSlug"], equals: source } }],
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!page) return null;
    return this.withReusableSections(this.toPageDetail(page));
  }

  // ---------------------------------------------------------------------
  // Admin — banners
  // ---------------------------------------------------------------------

  async adminListBanners(query: ListBannersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BannerWhereInput = {
      ...(query.placement ? { placement: query.placement } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
      this.prisma.banner.count({ where }),
    ]);

    return {
      items: items.map((b) => this.toBannerSummary(b)),
      meta: { pagination: buildPaginationMeta(page, pageSize, totalItems) },
    };
  }

  async adminCreateBanner(dto: CreateBannerDto, adminId: string): Promise<BannerSummary> {
    const created = await this.prisma.banner.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        mobileImageUrl: dto.mobileImageUrl,
        linkUrl: dto.linkUrl,
        altText: dto.altText,
        placement: dto.placement,
        status: "draft",
        sortOrder: dto.sortOrder ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "BannerCreated",
      entityType: "banner",
      entityId: created.id,
      metadata: { placement: created.placement },
    });

    return this.toBannerSummary(created);
  }

  async adminUpdateBanner(id: string, dto: UpdateBannerDto, adminId: string): Promise<BannerSummary> {
    await this.findBannerOrThrow(id);

    const updated = await this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.mobileImageUrl !== undefined ? { mobileImageUrl: dto.mobileImageUrl } : {}),
        ...(dto.linkUrl !== undefined ? { linkUrl: dto.linkUrl } : {}),
        ...(dto.altText !== undefined ? { altText: dto.altText } : {}),
        ...(dto.placement !== undefined ? { placement: dto.placement } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "BannerUpdated",
      entityType: "banner",
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toBannerSummary(updated);
  }

  async publishBanner(id: string, adminId: string): Promise<BannerSummary> {
    await this.findBannerOrThrow(id);

    const updated = await this.prisma.banner.update({
      where: { id },
      data: { status: "published" },
    });

    await this.audit.log({
      userId: adminId,
      action: "BannerPublished",
      entityType: "banner",
      entityId: id,
    });

    return this.toBannerSummary(updated);
  }

  // ---------------------------------------------------------------------
  // Admin — menus
  // ---------------------------------------------------------------------

  async adminListMenus(): Promise<MenuSummary[]> {
    const menus = await this.prisma.menu.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });
    return menus.map((m) => this.toMenuSummary(m));
  }

  async adminCreateMenu(dto: CreateMenuDto, adminId: string): Promise<MenuSummary> {
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictError(`A menu with code "${dto.code}" already exists`);

    const created = await this.prisma.menu.create({
      data: { code: dto.code, name: dto.name },
      include: { items: true },
    });

    await this.audit.log({
      userId: adminId,
      action: "MenuCreated",
      entityType: "menu",
      entityId: created.id,
      metadata: { code: created.code },
    });

    return this.toMenuSummary(created);
  }

  async addMenuItem(menuId: string, dto: CreateMenuItemDto, adminId: string): Promise<MenuItemSummary> {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundError("Menu not found");

    if (dto.parentId) {
      const parent = await this.prisma.menuItem.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.menuId !== menuId) {
        throw new ValidationError("parentId must reference an existing item in the same menu");
      }
    }

    const created = await this.prisma.menuItem.create({
      data: {
        menuId,
        parentId: dto.parentId ?? null,
        label: dto.label,
        url: dto.url,
        sortOrder: dto.sortOrder ?? 0,
        opensInNewTab: dto.opensInNewTab ?? false,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "MenuItemCreated",
      entityType: "menu_item",
      entityId: created.id,
      metadata: { menuId },
    });

    return this.toMenuItemSummary(created, []);
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto, adminId: string): Promise<MenuItemSummary> {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Menu item not found");

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new ValidationError("A menu item cannot be its own parent");
      }
      const parent = await this.prisma.menuItem.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.menuId !== existing.menuId) {
        throw new ValidationError("parentId must reference an existing item in the same menu");
      }
    }

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.opensInNewTab !== undefined ? { opensInNewTab: dto.opensInNewTab } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.audit.log({
      userId: adminId,
      action: "MenuItemUpdated",
      entityType: "menu_item",
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toMenuItemSummary(updated, []);
  }

  async deleteMenuItem(id: string, adminId: string): Promise<void> {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Menu item not found");

    await this.prisma.menuItem.delete({ where: { id } });

    await this.audit.log({
      userId: adminId,
      action: "MenuItemDeleted",
      entityType: "menu_item",
      entityId: id,
      metadata: { menuId: existing.menuId },
    });
  }

  async updateMenu(id: string, dto: UpdateMenuDto, adminId: string): Promise<MenuSummary> {
    const existing = await this.prisma.menu.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundError("Menu not found");
    const updated = await this.prisma.menu.update({
      where: { id },
      data: { ...(dto.name !== undefined ? { name: dto.name } : {}) },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    await this.audit.log({ userId: adminId, action: "MenuUpdated", entityType: "menu", entityId: id });
    return this.toMenuSummary(updated);
  }

  async deleteMenu(id: string, adminId: string): Promise<void> {
    const existing = await this.prisma.menu.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Menu not found");
    await this.prisma.menu.delete({ where: { id } });
    await this.audit.log({
      userId: adminId,
      action: "MenuDeleted",
      entityType: "menu",
      entityId: id,
      metadata: { code: existing.code },
    });
  }

  async reorderMenu(id: string, dto: ReorderMenuDto, adminId: string): Promise<MenuSummary> {
    const menu = await this.prisma.menu.findUnique({ where: { id }, include: { items: true } });
    if (!menu) throw new NotFoundError("Menu not found");
    const known = new Set(menu.items.map((item) => item.id));
    if (dto.items.some((item) => !known.has(item.id))) {
      throw new ValidationError("Every item must belong to this menu");
    }
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.menuItem.update({
          where: { id: item.id },
          data: { parentId: item.parentId ?? null, sortOrder: item.sortOrder },
        }),
      ),
    );
    await this.audit.log({ userId: adminId, action: "MenuReordered", entityType: "menu", entityId: id });
    return this.getMenuById(id);
  }

  // ---------------------------------------------------------------------
  // Admin — media
  // ---------------------------------------------------------------------

  async listMedia(query: ListMediaQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(60, Math.max(1, Number(query.pageSize ?? 24) || 24));
    const where: Prisma.CmsMediaAssetWhereInput = query.search
      ? {
          OR: [
            { filename: { contains: query.search, mode: "insensitive" } },
            { altText: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};
    const [items, totalItems] = await Promise.all([
      this.prisma.cmsMediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paginationSkip(page, pageSize),
        take: pageSize,
      }),
      this.prisma.cmsMediaAsset.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toMediaAsset(item)),
      meta: { pagination: buildPaginationMeta(page, pageSize, totalItems) },
    };
  }

  async uploadMedia(
    file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
    altText: string | undefined,
    adminId: string,
  ): Promise<CmsMediaAsset> {
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "video/mp4": "mp4",
      "video/webm": "webm",
    };
    const extension = allowed[file.mimetype];
    if (!extension || detectMediaMime(file.buffer) !== file.mimetype) {
      throw new ValidationError("Unsupported or mismatched media file");
    }
    const isImage = file.mimetype.startsWith("image/");
    const maxBytes = isImage ? this.storage.maxImageBytes : this.storage.maxVideoBytes;
    if (file.size > maxBytes) throw new ValidationError("File exceeds the upload size limit");
    const id = randomUUID();
    const storageKey = `cms/${id}.${extension}`;
    await this.storage.putObject(storageKey, file.buffer, file.mimetype);
    const size = isImage ? readImageSize(file.buffer, file.mimetype) : {};
    const created = await this.prisma.cmsMediaAsset.create({
      data: {
        id,
        filename: (file.originalname || `upload.${extension}`).slice(0, 200),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        width: size.width ?? null,
        height: size.height ?? null,
        altText: altText?.trim() || null,
        storageKey,
        url: this.storage.productMediaUrl(storageKey),
        createdBy: adminId,
      },
    });
    await this.audit.log({ userId: adminId, action: "MediaUploaded", entityType: "cms_media", entityId: created.id });
    return this.toMediaAsset(created);
  }

  async updateMedia(id: string, dto: UpdateMediaDto, adminId: string): Promise<CmsMediaAsset> {
    await this.findMediaOrThrow(id);
    const updated = await this.prisma.cmsMediaAsset.update({
      where: { id },
      data: {
        ...(dto.altText !== undefined ? { altText: dto.altText } : {}),
        ...(dto.filename !== undefined ? { filename: dto.filename } : {}),
      },
    });
    await this.audit.log({ userId: adminId, action: "MediaUpdated", entityType: "cms_media", entityId: id });
    return this.toMediaAsset(updated);
  }

  async deleteMedia(id: string, adminId: string): Promise<void> {
    const asset = await this.findMediaOrThrow(id);
    await this.assertMediaUnused(id);
    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.cmsMediaAsset.delete({ where: { id } });
    await this.audit.log({ userId: adminId, action: "MediaDeleted", entityType: "cms_media", entityId: id });
  }

  // ---------------------------------------------------------------------
  // Admin — reusable sections
  // ---------------------------------------------------------------------

  async listReusableSections(): Promise<ReusableSectionSummary[]> {
    const rows = await this.prisma.reusableSection.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((row) => this.toReusableSection(row));
  }

  async getReusableSection(id: string): Promise<ReusableSectionSummary> {
    const row = await this.prisma.reusableSection.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Section not found");
    return this.toReusableSection(row);
  }

  async createReusableSection(dto: CreateReusableSectionDto, adminId: string): Promise<ReusableSectionSummary> {
    const existing = await this.prisma.reusableSection.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictError(`A section with slug "${dto.slug}" already exists`);
    const blocks = sanitizeJsonStrings(dto.blocks);
    validateBlockDocument({ editor: "blocks", blocks });
    const created = await this.prisma.reusableSection.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        blocks: blocks as Prisma.InputJsonValue,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    await this.audit.log({ userId: adminId, action: "ReusableSectionCreated", entityType: "reusable_section", entityId: created.id });
    return this.toReusableSection(created);
  }

  async updateReusableSection(id: string, dto: UpdateReusableSectionDto, adminId: string): Promise<ReusableSectionSummary> {
    const existing = await this.prisma.reusableSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Section not found");
    if (dto.slug && dto.slug !== existing.slug) {
      const taken = await this.prisma.reusableSection.findUnique({ where: { slug: dto.slug } });
      if (taken) throw new ConflictError(`A section with slug "${dto.slug}" already exists`);
    }
    const blocks = dto.blocks !== undefined ? sanitizeJsonStrings(dto.blocks) : undefined;
    if (blocks !== undefined) validateBlockDocument({ editor: "blocks", blocks });
    const updated = await this.prisma.reusableSection.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(blocks !== undefined ? { blocks: blocks as Prisma.InputJsonValue } : {}),
        updatedBy: adminId,
      },
    });
    await this.audit.log({ userId: adminId, action: "ReusableSectionUpdated", entityType: "reusable_section", entityId: id });
    return this.toReusableSection(updated);
  }

  async deleteReusableSection(id: string, adminId: string): Promise<void> {
    const existing = await this.prisma.reusableSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Section not found");
    const pages = await this.prisma.page.findMany({ where: { deletedAt: null }, select: { title: true, fields: true } });
    const usedBy = pages.find((page) => JSON.stringify(page.fields).includes(id));
    if (usedBy) throw new ConflictError(`Section is used by "${usedBy.title}". Detach it there before deleting.`);
    await this.prisma.reusableSection.delete({ where: { id } });
    await this.audit.log({ userId: adminId, action: "ReusableSectionDeleted", entityType: "reusable_section", entityId: id });
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async findPageOrThrow(id: string): Promise<PageModel> {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page || page.deletedAt) throw new NotFoundError("Page not found");
    return page;
  }

  private async findBannerOrThrow(id: string): Promise<BannerModel> {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundError("Banner not found");
    return banner;
  }

  private async assertSlugAvailable(slug: string, excludingId?: string): Promise<void> {
    const existing = await this.prisma.page.findUnique({ where: { slug } });
    if (existing && existing.id !== excludingId) {
      throw new ConflictError(`A page with slug "${slug}" already exists`);
    }
  }

  private toPageSummary(page: PageModel): PageSummary {
    return {
      id: page.id,
      type: page.type as PageType,
      slug: page.slug,
      title: page.title,
      status: page.status,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoCanonicalUrl: page.seoCanonicalUrl,
      seoOgImage: page.seoOgImage,
      seoNoIndex: page.seoNoIndex,
      templateKey: page.templateKey,
      featuredImageUrl: page.featuredImageUrl,
      scheduledAt: page.scheduledAt?.toISOString() ?? null,
      publishedAt: page.publishedAt?.toISOString() ?? null,
      archivedAt: page.archivedAt?.toISOString() ?? null,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  private toPageDetail(page: PageModel): PageDetail {
    return {
      ...this.toPageSummary(page),
      fields: page.fields as unknown as PageDetail["fields"],
    };
  }

  private async writePageVersion(page: PageModel, publishedBy: string | null): Promise<void> {
    await this.prisma.pageVersion.create({
      data: {
        pageId: page.id,
        title: page.title,
        fields: page.fields as Prisma.InputJsonValue,
        seoSnapshot: {
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoCanonicalUrl: page.seoCanonicalUrl,
          seoOgImage: page.seoOgImage,
          seoNoIndex: page.seoNoIndex,
        } as Prisma.InputJsonValue,
        publishedBy,
      },
    });
  }

  private async nextCopySlug(slug: string): Promise<string> {
    let candidate = `${slug}-copy`;
    let suffix = 2;
    while (await this.prisma.page.findUnique({ where: { slug: candidate } })) {
      candidate = `${slug}-copy-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async getMenuById(id: string): Promise<MenuSummary> {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!menu) throw new NotFoundError("Menu not found");
    return this.toMenuSummary(menu);
  }

  private async withReusableSections(detail: PageDetail): Promise<PageDetail> {
    const ids = collectReusableIds(detail.fields);
    if (ids.length === 0) return detail;
    const rows = await this.prisma.reusableSection.findMany({ where: { id: { in: ids } } });
    return {
      ...detail,
      reusableSections: Object.fromEntries(rows.map((row) => [row.id, this.toReusableSection(row)])),
    };
  }

  private async findMediaOrThrow(id: string): Promise<CmsMediaAssetModel> {
    const asset = await this.prisma.cmsMediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundError("Media not found");
    return asset;
  }

  private async assertMediaUnused(id: string): Promise<void> {
    const [pages, sections] = await Promise.all([
      this.prisma.page.findMany({
        where: { deletedAt: null },
        select: { title: true, fields: true, featuredImageUrl: true, seoOgImage: true },
      }),
      this.prisma.reusableSection.findMany({ select: { name: true, blocks: true } }),
    ]);
    const pageHit = pages.find(
      (page) =>
        JSON.stringify(page.fields).includes(id) ||
        page.featuredImageUrl?.includes(id) ||
        page.seoOgImage?.includes(id),
    );
    if (pageHit) throw new ConflictError(`This image is used by “${pageHit.title}”. Remove it there before deleting.`);
    const sectionHit = sections.find((section) => JSON.stringify(section.blocks).includes(id));
    if (sectionHit) {
      throw new ConflictError(`This image is used by the “${sectionHit.name}” section. Remove it there before deleting.`);
    }
  }

  private toMediaAsset(asset: CmsMediaAssetModel): CmsMediaAsset {
    return {
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      altText: asset.altText,
      url: asset.url,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private toReusableSection(row: ReusableSectionModel): ReusableSectionSummary {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      blocks: (Array.isArray(row.blocks) ? row.blocks : []) as unknown as ContentBlock[],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPageVersionSummary(version: PageVersionModel): PageVersionSummary {
    return {
      id: version.id,
      pageId: version.pageId,
      title: version.title,
      publishedBy: version.publishedBy,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private toBannerSummary(banner: BannerModel): BannerSummary {
    return {
      id: banner.id,
      title: banner.title,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl,
      linkUrl: banner.linkUrl,
      altText: banner.altText,
      placement: banner.placement as BannerPlacement,
      status: banner.status,
      sortOrder: banner.sortOrder,
      startsAt: banner.startsAt?.toISOString() ?? null,
      endsAt: banner.endsAt?.toISOString() ?? null,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
    };
  }

  private toMenuItemSummary(item: MenuItemModel, allItems: MenuItemModel[]): MenuItemSummary {
    const children = allItems
      .filter((i) => i.parentId === item.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((child) => this.toMenuItemSummary(child, allItems));

    return {
      id: item.id,
      label: item.label,
      url: item.url,
      sortOrder: item.sortOrder,
      opensInNewTab: item.opensInNewTab,
      isActive: item.isActive,
      children,
    };
  }

  private toMenuSummary(menu: MenuModel & { items: MenuItemModel[] }): MenuSummary {
    const topLevel = menu.items
      .filter((i) => !i.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => this.toMenuItemSummary(item, menu.items));

    return {
      id: menu.id,
      code: menu.code,
      name: menu.name,
      items: topLevel,
    };
  }
}

function collectReusableIds(fields: unknown): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (record.type === "custom_section" && record.detached !== true && typeof record.reusableSectionId === "string") {
      ids.add(record.reusableSectionId);
    }
    Object.values(record).forEach(visit);
  };
  visit(fields);
  return [...ids];
}

function detectMediaMime(buffer: Buffer): string | null {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "video/webm";
  return null;
}

function readImageSize(buffer: Buffer, mime: string): { width?: number; height?: number } {
  if (mime === "image/png" && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mime === "image/gif" && buffer.length >= 10) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  return {};
}
