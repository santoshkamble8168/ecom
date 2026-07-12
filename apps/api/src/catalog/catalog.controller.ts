import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";

import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@SkipThrottle()
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Product detail is served by ProductModule (Sprint 5 PDP read model).

  @Public()
  @Get("categories")
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Public()
  @Get("collections")
  listCollections() {
    return this.catalogService.listCollections();
  }

  @Public()
  @Get("attributes")
  listAttributes() {
    return this.catalogService.listAttributes();
  }
}
