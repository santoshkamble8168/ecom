import type {
  AttributeDefinitionSummary,
  CategorySummary,
  CollectionSummary,
  ProductDetail,
  ProductSummary,
  ProductVariantSummary,
  VariantOptionSummary,
} from "@ecom/types";
import type {
  AttributeDefinition,
  AttributeValue,
  Category,
  Collection,
  Product,
  ProductMedia,
  ProductSeo,
  ProductVariant,
  Tag,
  VariantOption,
} from "@prisma/client";

import { decimalToString } from "../utils/catalog.utils";

type ProductWithRelations = Product & {
  media: ProductMedia[];
  categories: { category: Category }[];
  collections: { collection: Collection }[];
  tags: { tag: Tag }[];
  seo: ProductSeo | null;
  variants: (ProductVariant & {
    options: (VariantOption & { attributeValue: AttributeValue & { attribute: AttributeDefinition } })[];
  })[];
};

export function toProductSummary(product: ProductWithRelations): ProductSummary {
  const primaryImage = product.media[0]
    ? {
        url: product.media[0].url,
        altText: product.media[0].altText,
        type: product.media[0].type as "image" | "video",
        sortOrder: product.media[0].sortOrder,
      }
    : null;

  return {
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    status: product.status,
    basePrice: decimalToString(product.basePrice),
    compareAtPrice: decimalToString(product.compareAtPrice),
    primaryImage,
    categorySlugs: product.categories.map((c) => c.category.slug),
    publishedAt: product.publishedAt?.toISOString() ?? null,
  };
}

export function toProductDetail(product: ProductWithRelations): ProductDetail {
  return {
    ...toProductSummary(product),
    description: product.description,
    variants: product.variants.map(toVariantSummary),
    media: product.media.map((m) => ({
      url: m.url,
      altText: m.altText,
      type: m.type as "image" | "video",
      sortOrder: m.sortOrder,
    })),
    collections: product.collections.map((c) => toCollectionSummary(c.collection)),
    tags: product.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })),
    seo: product.seo
      ? {
          metaTitle: product.seo.metaTitle,
          metaDescription: product.seo.metaDescription,
          metaKeywords: product.seo.metaKeywords,
          canonicalUrl: product.seo.canonicalUrl,
        }
      : null,
  };
}

function toVariantSummary(
  variant: ProductVariant & {
    options: (VariantOption & { attributeValue: AttributeValue & { attribute: AttributeDefinition } })[];
  },
): ProductVariantSummary {
  return {
    sku: variant.sku,
    price: variant.price.toString(),
    compareAtPrice: decimalToString(variant.compareAtPrice),
    isActive: variant.isActive,
    options: variant.options.map(toOptionSummary),
  };
}

function toOptionSummary(
  option: VariantOption & { attributeValue: AttributeValue & { attribute: AttributeDefinition } },
): VariantOptionSummary {
  return {
    attributeKey: option.attributeValue.attribute.key,
    attributeName: option.attributeValue.attribute.name,
    value: option.attributeValue.value,
    valueSlug: option.attributeValue.slug,
  };
}

export function toCategorySummary(
  category: Category & { parent?: Category | null; children?: Category[] },
): CategorySummary {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description,
    parentSlug: category.parent?.slug ?? null,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    children: category.children?.map((c) => toCategorySummary(c)),
  };
}

export function toCollectionSummary(collection: Collection): CollectionSummary {
  return {
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    isActive: collection.isActive,
  };
}

export function toAttributeSummary(
  attr: AttributeDefinition & { values: AttributeValue[] },
): AttributeDefinitionSummary {
  return {
    key: attr.key,
    name: attr.name,
    type: attr.type as "select" | "text" | "number",
    values: attr.values.map((v) => ({
      slug: v.slug,
      value: v.value,
      sortOrder: v.sortOrder,
    })),
  };
}

export const productInclude = {
  media: { orderBy: { sortOrder: "asc" as const } },
  categories: { include: { category: true } },
  collections: { include: { collection: true } },
  tags: { include: { tag: true } },
  seo: true,
  variants: {
    include: {
      options: {
        include: {
          attributeValue: { include: { attribute: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};
