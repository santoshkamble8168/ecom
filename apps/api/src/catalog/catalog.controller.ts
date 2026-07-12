import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { Public } from "../common/decorators/public.decorator";

import { CatalogService } from "./catalog.service";
import { ProductListQueryDto } from "./dto/create-variant.dto";

@ApiTags("catalog")
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get("products")
  listProducts(@Query() query: ProductListQueryDto) {
    return this.catalogService.listPublishedProducts(query);
  }

  @Public()
  @Get("products/:slug")
  getProduct(@Param("slug") slug: string) {
    return this.catalogService.getPublishedProductBySlug(slug);
  }

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
