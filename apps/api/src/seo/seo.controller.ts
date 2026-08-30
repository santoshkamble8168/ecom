import { Controller, Get, Header, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Response } from "express";

import { Public } from "../common/decorators/public.decorator";

import { SeoService } from "./seo.service";

@ApiExcludeController()
@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Public()
  @Get("robots.txt")
  @Header("Content-Type", "text/plain; charset=utf-8")
  async robots(@Res() res: Response) {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(this.seo.robotsTxt());
  }

  @Public()
  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  async sitemap(@Res() res: Response) {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(await this.seo.sitemapXml());
  }
}
