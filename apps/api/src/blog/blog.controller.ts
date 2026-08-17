import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";

import { BlogService } from "./blog.service";
import { ListBlogPostsQueryDto } from "./dto/list-blog-posts-query.dto";

@ApiTags("blog")
@SkipThrottle()
@Public()
@Controller("blog")
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get("posts")
  listPosts(@Query() query: ListBlogPostsQueryDto) {
    return this.blogService.listPublished(query);
  }

  @Get("categories")
  listCategories() {
    return this.blogService.listCategories();
  }

  @Get("tags")
  listTags() {
    return this.blogService.listTags();
  }

  @Get("posts/:slug")
  getPost(@Param("slug") slug: string) {
    return this.blogService.getPublishedBySlug(slug);
  }
}
