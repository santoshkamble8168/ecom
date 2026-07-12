import { ConflictError, NotFoundError, buildPaginationMeta, paginationSkip } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { productInclude, toAttributeSummary, toCategorySummary, toCollectionSummary, toProductDetail, toProductSummary } from "./mappers/catalog.mapper";
import { assertCanPublish, assertUniqueSku, assertUniqueSlug } from "./policies/publish.policy";
import { slugify } from "./utils/catalog.utils";

import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { CreateCollectionDto } from "./dto/create-collection.dto";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { AddProductMediaDto, CreateVariantDto, ProductListQueryDto } from "./dto/create-variant.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";
import type { UpdateCollectionDto } from "./dto/update-collection.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext("CatalogService");
  }

  // ---------------------------------------------------------------------------
  // Public reads
  // ---------------------------------------------------------------------------

  async listPublishedProducts(query: ProductListQueryDto) {
    const where: Prisma.ProductWhereInput = {
      status: "published",
      ...(query.categorySlug && {
        categories: { some: { category: { slug: query.categorySlug } } },
      }),
      ...(query.collectionSlug && {
        collections: { some: { collection: { slug: query.collectionSlug } } },
      }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { brand: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [totalItems, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { updatedAt: "desc" },
        skip: paginationSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
    ]);

    return {
      items: products.map(toProductSummary),
      meta: { pagination: buildPaginationMeta(query.page, query.pageSize, totalItems) },
    };
  }

  async getPublishedProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: "published" },
      include: productInclude,
    });
    if (!product) throw new NotFoundError("Product not found");
    return toProductDetail(product);
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return categories.map((c) => toCategorySummary(c));
  }

  async listCollections() {
    const collections = await this.prisma.collection.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return collections.map(toCollectionSummary);
  }

  async listAttributes() {
    const attributes = await this.prisma.attributeDefinition.findMany({
      include: { values: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return attributes.map(toAttributeSummary);
  }

  // ---------------------------------------------------------------------------
  // Admin product operations
  // ---------------------------------------------------------------------------

  async adminListProducts(query: ProductListQueryDto) {
    const where: Prisma.ProductWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.categorySlug && {
        categories: { some: { category: { slug: query.categorySlug } } },
      }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { slug: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [totalItems, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { updatedAt: "desc" },
        skip: paginationSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
    ]);

    return {
      items: products.map(toProductSummary),
      meta: { pagination: buildPaginationMeta(query.page, query.pageSize, totalItems) },
    };
  }

  async adminGetProduct(slug: string) {
    const product = await this.findProductOrThrow(slug);
    return toProductDetail(product);
  }

  async createProduct(dto: CreateProductDto, userId: string) {
    const slug = dto.slug ?? slugify(dto.title);
    await assertUniqueSlug(
      !!(await this.prisma.product.findUnique({ where: { slug } })),
      "Product",
    );

    const categoryIds = dto.categorySlugs?.length
      ? await this.resolveCategoryIds(dto.categorySlugs)
      : [];
    const collectionIds = dto.collectionSlugs?.length
      ? await this.resolveCollectionIds(dto.collectionSlugs)
      : [];

    const product = await this.prisma.product.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        brand: dto.brand,
        basePrice: dto.basePrice,
        compareAtPrice: dto.compareAtPrice,
        categories: categoryIds.length
          ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        collections: collectionIds.length
          ? { create: collectionIds.map((collectionId) => ({ collectionId })) }
          : undefined,
        seo: { create: {} },
      },
      include: productInclude,
    });

    this.logger.log(`Product created: ${product.slug} by user ${userId}`);
    return toProductDetail(product);
  }

  async updateProduct(slug: string, dto: UpdateProductDto, userId: string) {
    const existing = await this.findProductOrThrow(slug);

    if (dto.slug && dto.slug !== existing.slug) {
      await assertUniqueSlug(
        !!(await this.prisma.product.findUnique({ where: { slug: dto.slug } })),
        "Product",
      );
    }

    if (dto.categorySlugs) {
      const categoryIds = await this.resolveCategoryIds(dto.categorySlugs);
      await this.prisma.productCategory.deleteMany({ where: { productId: existing.id } });
      if (categoryIds.length) {
        await this.prisma.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ productId: existing.id, categoryId })),
        });
      }
    }

    if (dto.collectionSlugs) {
      const collectionIds = await this.resolveCollectionIds(dto.collectionSlugs);
      await this.prisma.productCollection.deleteMany({ where: { productId: existing.id } });
      if (collectionIds.length) {
        await this.prisma.productCollection.createMany({
          data: collectionIds.map((collectionId) => ({ productId: existing.id, collectionId })),
        });
      }
    }

    const product = await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        brand: dto.brand,
        basePrice: dto.basePrice,
        compareAtPrice: dto.compareAtPrice,
      },
      include: productInclude,
    });

    this.logger.log(`Product updated: ${product.slug} by user ${userId}`);
    return toProductDetail(product);
  }

  async deleteProduct(slug: string, userId: string) {
    const product = await this.findProductOrThrow(slug);
    await this.prisma.product.delete({ where: { id: product.id } });
    this.logger.log(`Product deleted: ${slug} by user ${userId}`);
    return { slug, deleted: true };
  }

  async addVariant(slug: string, dto: CreateVariantDto, userId: string) {
    const product = await this.findProductOrThrow(slug);
    await assertUniqueSku(!!(await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } })));

    const attributeValues = await this.prisma.attributeValue.findMany({
      where: { slug: { in: dto.optionValueSlugs } },
    });
    if (attributeValues.length !== dto.optionValueSlugs.length) {
      throw new NotFoundError("One or more attribute values not found");
    }

    await this.prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: dto.sku,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        options: {
          create: attributeValues.map((av) => ({ attributeValueId: av.id })),
        },
      },
    });

    this.logger.log(`Variant added to ${slug}: ${dto.sku} by user ${userId}`);
    return this.adminGetProduct(slug);
  }

  async addMedia(slug: string, dto: AddProductMediaDto, userId: string) {
    const product = await this.findProductOrThrow(slug);
    await this.prisma.productMedia.create({
      data: {
        productId: product.id,
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? product.media.length,
      },
    });
    this.logger.log(`Media added to ${slug} by user ${userId}`);
    return this.adminGetProduct(slug);
  }

  async publishProduct(slug: string, userId: string) {
    const product = await this.findProductOrThrow(slug);
    assertCanPublish({
      status: product.status,
      basePrice: product.basePrice,
      mediaCount: product.media.length,
      variantCount: product.variants.length,
      activeVariantCount: product.variants.filter((v) => v.isActive).length,
    });

    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data: { status: "published", publishedAt: new Date() },
      include: productInclude,
    });

    this.logger.log(`Product published: ${slug} by user ${userId}`);
    return {
      slug: updated.slug,
      status: updated.status,
      publishedAt: updated.publishedAt!.toISOString(),
    };
  }

  async archiveProduct(slug: string, userId: string) {
    const product = await this.findProductOrThrow(slug);
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data: { status: "archived" },
      include: productInclude,
    });
    this.logger.log(`Product archived: ${slug} by user ${userId}`);
    return toProductSummary(updated);
  }

  // ---------------------------------------------------------------------------
  // Admin category operations
  // ---------------------------------------------------------------------------

  async adminListCategories() {
    const categories = await this.prisma.category.findMany({
      include: { parent: true, children: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return categories.map((c) => toCategorySummary(c));
  }

  async createCategory(dto: CreateCategoryDto, userId: string) {
    const slug = dto.slug ?? slugify(dto.name);
    await assertUniqueSlug(
      !!(await this.prisma.category.findUnique({ where: { slug } })),
      "Category",
    );

    let parentId: string | undefined;
    if (dto.parentSlug) {
      const parent = await this.prisma.category.findUnique({ where: { slug: dto.parentSlug } });
      if (!parent) throw new NotFoundError("Parent category not found");
      parentId = parent.id;
    }

    const category = await this.prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          parentId,
          sortOrder: dto.sortOrder ?? 0,
        },
      });

      await tx.categoryClosure.create({
        data: { ancestorId: created.id, descendantId: created.id, depth: 0 },
      });

      if (parentId) {
        const parentClosures = await tx.categoryClosure.findMany({
          where: { descendantId: parentId },
        });
        await tx.categoryClosure.createMany({
          data: parentClosures.map((pc) => ({
            ancestorId: pc.ancestorId,
            descendantId: created.id,
            depth: pc.depth + 1,
          })),
        });
      }

      return created;
    });

    this.logger.log(`Category created: ${category.slug} by user ${userId}`);
    return toCategorySummary(category);
  }

  async updateCategory(slug: string, dto: UpdateCategoryDto, userId: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundError("Category not found");

    if (dto.slug && dto.slug !== slug) {
      await assertUniqueSlug(
        !!(await this.prisma.category.findUnique({ where: { slug: dto.slug } })),
        "Category",
      );
    }

    const category = await this.prisma.category.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        sortOrder: dto.sortOrder,
      },
      include: { parent: true },
    });

    this.logger.log(`Category updated: ${category.slug} by user ${userId}`);
    return toCategorySummary(category);
  }

  async deleteCategory(slug: string, userId: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundError("Category not found");

    const childCount = await this.prisma.category.count({ where: { parentId: category.id } });
    if (childCount > 0) {
      throw new ConflictError("Cannot delete category with child categories");
    }

    await this.prisma.category.delete({ where: { id: category.id } });
    this.logger.log(`Category deleted: ${slug} by user ${userId}`);
    return { slug, deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Admin collection operations
  // ---------------------------------------------------------------------------

  async adminListCollections() {
    const collections = await this.prisma.collection.findMany({ orderBy: { name: "asc" } });
    return collections.map(toCollectionSummary);
  }

  async createCollection(dto: CreateCollectionDto, userId: string) {
    const slug = dto.slug ?? slugify(dto.name);
    await assertUniqueSlug(
      !!(await this.prisma.collection.findUnique({ where: { slug } })),
      "Collection",
    );

    const collection = await this.prisma.collection.create({
      data: { name: dto.name, slug, description: dto.description },
    });

    this.logger.log(`Collection created: ${collection.slug} by user ${userId}`);
    return toCollectionSummary(collection);
  }

  async updateCollection(slug: string, dto: UpdateCollectionDto, userId: string) {
    const existing = await this.prisma.collection.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundError("Collection not found");

    if (dto.slug && dto.slug !== slug) {
      await assertUniqueSlug(
        !!(await this.prisma.collection.findUnique({ where: { slug: dto.slug } })),
        "Collection",
      );
    }

    const collection = await this.prisma.collection.update({
      where: { id: existing.id },
      data: { name: dto.name, slug: dto.slug, description: dto.description },
    });

    this.logger.log(`Collection updated: ${collection.slug} by user ${userId}`);
    return toCollectionSummary(collection);
  }

  async deleteCollection(slug: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { slug } });
    if (!collection) throw new NotFoundError("Collection not found");

    await this.prisma.collection.delete({ where: { id: collection.id } });
    this.logger.log(`Collection deleted: ${slug} by user ${userId}`);
    return { slug, deleted: true };
  }

  async assignProductToCollection(productSlug: string, collectionSlug: string, userId: string) {
    const product = await this.findProductOrThrow(productSlug);
    const collection = await this.prisma.collection.findUnique({ where: { slug: collectionSlug } });
    if (!collection) throw new NotFoundError("Collection not found");

    await this.prisma.productCollection.upsert({
      where: { productId_collectionId: { productId: product.id, collectionId: collection.id } },
      update: {},
      create: { productId: product.id, collectionId: collection.id },
    });

    this.logger.log(`Product ${productSlug} assigned to collection ${collectionSlug} by user ${userId}`);
    return this.adminGetProduct(productSlug);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async findProductOrThrow(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  private async resolveCategoryIds(slugs: string[]): Promise<string[]> {
    const categories = await this.prisma.category.findMany({ where: { slug: { in: slugs } } });
    if (categories.length !== slugs.length) throw new NotFoundError("One or more categories not found");
    return categories.map((c) => c.id);
  }

  private async resolveCollectionIds(slugs: string[]): Promise<string[]> {
    const collections = await this.prisma.collection.findMany({ where: { slug: { in: slugs } } });
    if (collections.length !== slugs.length) throw new NotFoundError("One or more collections not found");
    return collections.map((c) => c.id);
  }
}
