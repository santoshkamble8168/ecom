import { PERMISSIONS } from "@ecom/types";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { BlogService } from "./blog.service";
import { AdminListBlogPostsQueryDto } from "./dto/admin-list-blog-posts-query.dto";
import { CreateBlogCategoryDto } from "./dto/create-blog-category.dto";
import { CreateBlogTagDto } from "./dto/create-blog-tag.dto";
import { ScheduleBlogPostDto } from "./dto/schedule-blog-post.dto";
import { CreateBlogPostDto, UpdateBlogPostDto } from "./dto/upsert-blog-post.dto";

@ApiTags("admin-blog")
@Permissions(PERMISSIONS.ADMIN_ACCESS)
@Controller("admin/blog")
export class BlogAdminController {
  constructor(private readonly blogService: BlogService) {}

  @Get("posts")
  listPosts(@Query() query: AdminListBlogPostsQueryDto) {
    return this.blogService.adminList(query);
  }

  @Post("posts")
  createPost(@Body() dto: CreateBlogPostDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.blogService.adminCreate(dto, admin.id);
  }

  @Get("posts/:id")
  getPost(@Param("id") id: string) {
    return this.blogService.adminGetById(id);
  }

  @Patch("posts/:id")
  updatePost(@Param("id") id: string, @Body() dto: UpdateBlogPostDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.blogService.adminUpdate(id, dto, admin.id);
  }

  @Post("posts/:id/publish")
  publishPost(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.blogService.adminPublish(id, admin.id);
  }

  @Post("posts/:id/schedule")
  schedulePost(
    @Param("id") id: string,
    @Body() dto: ScheduleBlogPostDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.blogService.adminSchedule(id, dto, admin.id);
  }

  @Get("categories")
  listCategories() {
    return this.blogService.adminListCategories();
  }

  @Post("categories")
  createCategory(@Body() dto: CreateBlogCategoryDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.blogService.adminCreateCategory(dto, admin.id);
  }

  @Get("tags")
  listTags() {
    return this.blogService.adminListTags();
  }

  @Post("tags")
  createTag(@Body() dto: CreateBlogTagDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.blogService.adminCreateTag(dto, admin.id);
  }
}
