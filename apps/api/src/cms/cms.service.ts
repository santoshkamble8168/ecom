import { ConflictError, ForbiddenError, NotFoundError, ValidationError, buildPaginationMeta, paginationSkip } from "@ecom/shared";
import type {
  BannerPlacement,
  BannerSummary,
  MenuItemSummary,
  MenuSummary,
  PageDetail,
  PageSummary,
  PageType,
  PageVersionSummary,
} from "@ecom/types";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Banner as BannerModel, Menu as MenuModel, MenuItem as MenuItemModel, Page as PageModel, PageVersion as PageVersionModel, Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { sanitizeJsonStrings } from "../common/utils/sanitize-html";
import { PrismaService } from "../prisma/prisma.service";

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
import { validatePageFields } from "./policies/page-fields.policy";

const DEFAULT_PREVIEW_TOKEN = "dev-preview-token";

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------
  // Public — pages
  // ---------------------------------------------------------------------

  async getPublishedBySlug(slug: string): Promise<PageDetail> {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || page.status !== "published") {
      throw new NotFoundError("Page not found");
    }
    return this.toPageDetail(page);
  }

  async getPreviewBySlug(slug: string, token: string): Promise<PageDetail> {
    const expectedToken = this.config.get<string>("CMS_PREVIEW_TOKEN", DEFAULT_PREVIEW_TOKEN);
    if (token !== expectedToken) {
      throw new ForbiddenError("Invalid preview token");
    }

    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundError("Page not found");
    return this.toPageDetail(page);
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
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

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
    return this.toPageDetail(page);
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
    await this.prisma.pageVersion.create({
      data: {
        pageId: id,
        title: updated.title,
        fields: updated.fields as Prisma.InputJsonValue,
        seoSnapshot: {
          seoTitle: updated.seoTitle,
          seoDescription: updated.seoDescription,
          seoCanonicalUrl: updated.seoCanonicalUrl,
          seoOgImage: updated.seoOgImage,
        } as Prisma.InputJsonValue,
        publishedBy: adminId,
      },
    });

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

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async findPageOrThrow(id: string): Promise<PageModel> {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundError("Page not found");
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
