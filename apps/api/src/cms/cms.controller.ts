import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";

import { CmsService } from "./cms.service";
import { PreviewPageQueryDto } from "./dto/preview-page-query.dto";
import { PublicBannersQueryDto } from "./dto/public-banners-query.dto";

@ApiTags("cms")
@SkipThrottle()
@Public()
@Controller("cms")
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get("pages/:slug/preview")
  getPagePreview(@Param("slug") slug: string, @Query() query: PreviewPageQueryDto) {
    return this.cmsService.getPreviewBySlug(slug, query.token);
  }

  @Get("pages/:slug")
  getPage(@Param("slug") slug: string) {
    return this.cmsService.getPublishedBySlug(slug);
  }

  @Get("banners")
  listBanners(@Query() query: PublicBannersQueryDto) {
    return this.cmsService.listActiveBanners(query.placement);
  }

  @Get("menus/:code")
  getMenu(@Param("code") code: string) {
    return this.cmsService.getMenuByCode(code);
  }
}
