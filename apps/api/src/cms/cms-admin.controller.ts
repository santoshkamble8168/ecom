import { PERMISSIONS } from "@ecom/types";
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { CmsService } from "./cms.service";
import { CreateBannerDto } from "./dto/create-banner.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { CreatePageDto } from "./dto/create-page.dto";
import { ListBannersQueryDto } from "./dto/list-banners-query.dto";
import { ListPagesQueryDto } from "./dto/list-pages-query.dto";
import { SchedulePageDto } from "./dto/schedule-page.dto";
import { UpdateBannerDto } from "./dto/update-banner.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { ListMediaQueryDto, UpdateMediaDto } from "./dto/update-media.dto";
import { ReorderMenuDto } from "./dto/reorder-menu.dto";
import { CreateReusableSectionDto, UpdateReusableSectionDto } from "./dto/reusable-section.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { UpdatePageDto } from "./dto/update-page.dto";

@ApiTags("admin-cms")
@Controller("admin/cms")
export class CmsAdminController {
  constructor(private readonly cmsService: CmsService) {}

  // Pages

  @Get("pages")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listPages(@Query() query: ListPagesQueryDto) {
    return this.cmsService.adminListPages(query);
  }

  @Post("pages")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  createPage(@Body() dto: CreatePageDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.adminCreatePage(dto, admin.id);
  }

  @Get("pages/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  getPage(@Param("id") id: string) {
    return this.cmsService.adminGetPage(id);
  }

  @Patch("pages/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  updatePage(@Param("id") id: string, @Body() dto: UpdatePageDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.adminUpdatePage(id, dto, admin.id);
  }

  @Post("pages/:id/publish")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  publishPage(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.publishPage(id, admin.id);
  }

  @Post("pages/:id/schedule")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  schedulePage(@Param("id") id: string, @Body() dto: SchedulePageDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.schedulePage(id, dto, admin.id);
  }

  @Post("pages/:id/archive")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  archivePage(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.archivePage(id, admin.id);
  }

  @Get("pages/:id/versions")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listPageVersions(@Param("id") id: string) {
    return this.cmsService.listPageVersions(id);
  }

  @Get("pages/:id/versions/:versionId")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  getPageVersion(@Param("id") id: string, @Param("versionId") versionId: string) {
    return this.cmsService.getPageVersion(id, versionId);
  }

  @Post("pages/:id/versions/:versionId/restore")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  restorePageVersion(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.cmsService.restorePageVersion(id, versionId, admin.id);
  }

  @Post("pages/:id/duplicate")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  duplicatePage(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.duplicatePage(id, admin.id);
  }

  @Post("pages/:id/unpublish")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  unpublishPage(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.unpublishPage(id, admin.id);
  }

  @Delete("pages/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  deletePage(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.deletePage(id, admin.id);
  }

  @Get("pages/:id/preview")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  previewPage(@Param("id") id: string) {
    return this.cmsService.previewPage(id);
  }

  // Banners

  @Get("banners")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listBanners(@Query() query: ListBannersQueryDto) {
    return this.cmsService.adminListBanners(query);
  }

  @Post("banners")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  createBanner(@Body() dto: CreateBannerDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.adminCreateBanner(dto, admin.id);
  }

  @Patch("banners/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  updateBanner(@Param("id") id: string, @Body() dto: UpdateBannerDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.adminUpdateBanner(id, dto, admin.id);
  }

  @Post("banners/:id/publish")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  publishBanner(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.publishBanner(id, admin.id);
  }

  // Menus

  @Get("menus")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listMenus() {
    return this.cmsService.adminListMenus();
  }

  @Post("menus")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  createMenu(@Body() dto: CreateMenuDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.adminCreateMenu(dto, admin.id);
  }

  @Patch("menus/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  updateMenu(@Param("id") id: string, @Body() dto: UpdateMenuDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.updateMenu(id, dto, admin.id);
  }

  @Delete("menus/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  deleteMenu(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.deleteMenu(id, admin.id);
  }

  @Post("menus/:id/reorder")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  reorderMenu(@Param("id") id: string, @Body() dto: ReorderMenuDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.reorderMenu(id, dto, admin.id);
  }

  @Post("menus/:id/items")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  addMenuItem(@Param("id") id: string, @Body() dto: CreateMenuItemDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.addMenuItem(id, dto, admin.id);
  }

  @Patch("menu-items/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  updateMenuItem(@Param("id") id: string, @Body() dto: UpdateMenuItemDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.updateMenuItem(id, dto, admin.id);
  }

  @Delete("menu-items/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  deleteMenuItem(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.deleteMenuItem(id, admin.id);
  }

  // Media

  @Get("media")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listMedia(@Query() query: ListMediaQueryDto) {
    return this.cmsService.listMedia(query);
  }

  @Post("media")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 100 * 1024 * 1024, files: 1 } }))
  uploadMedia(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname?: string } | undefined,
    @Body("altText") altText: string | undefined,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException("A media file is required");
    return this.cmsService.uploadMedia(file, altText, admin.id);
  }

  @Patch("media/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  updateMedia(@Param("id") id: string, @Body() dto: UpdateMediaDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.updateMedia(id, dto, admin.id);
  }

  @Delete("media/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  deleteMedia(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.deleteMedia(id, admin.id);
  }

  // Reusable sections

  @Get("sections")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listSections() {
    return this.cmsService.listReusableSections();
  }

  @Post("sections")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  createSection(@Body() dto: CreateReusableSectionDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.createReusableSection(dto, admin.id);
  }

  @Get("sections/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  getSection(@Param("id") id: string) {
    return this.cmsService.getReusableSection(id);
  }

  @Patch("sections/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  updateSection(@Param("id") id: string, @Body() dto: UpdateReusableSectionDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.updateReusableSection(id, dto, admin.id);
  }

  @Delete("sections/:id")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  deleteSection(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.cmsService.deleteReusableSection(id, admin.id);
  }
}
