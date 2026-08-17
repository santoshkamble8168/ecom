import { PERMISSIONS } from "@ecom/types";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

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
}
