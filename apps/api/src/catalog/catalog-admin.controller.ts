import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { CatalogService } from "./catalog.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { AddProductMediaDto, CreateVariantDto, ProductListQueryDto } from "./dto/create-variant.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@ApiTags("admin-catalog")
@Controller("admin")
export class CatalogAdminController {
  constructor(private readonly catalogService: CatalogService) {}

  // Products
  @Permissions(PERMISSIONS.CATALOG_READ)
  @Get("products")
  listProducts(@Query() query: ProductListQueryDto) {
    return this.catalogService.adminListProducts(query);
  }

  @Permissions(PERMISSIONS.CATALOG_READ)
  @Get("products/:slug")
  getProduct(@Param("slug") slug: string) {
    return this.catalogService.adminGetProduct(slug);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("products")
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.createProduct(dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Patch("products/:slug")
  updateProduct(
    @Param("slug") slug: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.updateProduct(slug, dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Delete("products/:slug")
  @HttpCode(HttpStatus.OK)
  deleteProduct(@Param("slug") slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.deleteProduct(slug, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("products/:slug/variants")
  addVariant(
    @Param("slug") slug: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.addVariant(slug, dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("products/:slug/media")
  addMedia(
    @Param("slug") slug: string,
    @Body() dto: AddProductMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.addMedia(slug, dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("products/:slug/publish")
  @HttpCode(HttpStatus.OK)
  publishProduct(@Param("slug") slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.publishProduct(slug, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("products/:slug/archive")
  @HttpCode(HttpStatus.OK)
  archiveProduct(@Param("slug") slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.archiveProduct(slug, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("products/:slug/collections/:collectionSlug")
  @HttpCode(HttpStatus.OK)
  assignCollection(
    @Param("slug") slug: string,
    @Param("collectionSlug") collectionSlug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.assignProductToCollection(slug, collectionSlug, user.id);
  }

  // Categories
  @Permissions(PERMISSIONS.CATALOG_READ)
  @Get("categories")
  listCategories() {
    return this.catalogService.adminListCategories();
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("categories")
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.createCategory(dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Patch("categories/:slug")
  updateCategory(
    @Param("slug") slug: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.updateCategory(slug, dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Delete("categories/:slug")
  @HttpCode(HttpStatus.OK)
  deleteCategory(@Param("slug") slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.deleteCategory(slug, user.id);
  }

  // Collections
  @Permissions(PERMISSIONS.CATALOG_READ)
  @Get("collections")
  listCollections() {
    return this.catalogService.adminListCollections();
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Post("collections")
  createCollection(@Body() dto: CreateCollectionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.createCollection(dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Patch("collections/:slug")
  updateCollection(
    @Param("slug") slug: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.updateCollection(slug, dto, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_WRITE)
  @Delete("collections/:slug")
  @HttpCode(HttpStatus.OK)
  deleteCollection(@Param("slug") slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.deleteCollection(slug, user.id);
  }

  @Permissions(PERMISSIONS.CATALOG_READ)
  @Get("attributes")
  listAttributes() {
    return this.catalogService.listAttributes();
  }
}
