import type { ProductSortKey } from "@ecom/types";
import type { Prisma } from "@prisma/client";

export function buildProductOrderBy(sort: ProductSortKey): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ basePrice: "asc" }];
    case "price_desc":
      return [{ basePrice: "desc" }];
    case "discount":
      return [{ compareAtPrice: "desc" }, { basePrice: "asc" }];
    case "popular":
    case "newest":
    default:
      return [{ publishedAt: "desc" }];
  }
}
