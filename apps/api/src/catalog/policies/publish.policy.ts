import { ConflictError, ValidationError } from "@ecom/shared";
import type { ProductStatus } from "@prisma/client";

export interface PublishValidationInput {
  status: ProductStatus;
  basePrice: { toString(): string } | null;
  mediaCount: number;
  variantCount: number;
  activeVariantCount: number;
}

export function assertCanPublish(input: PublishValidationInput): void {
  if (input.status === "published") {
    throw new ValidationError("Product is already published");
  }

  if (input.status === "archived") {
    throw new ValidationError("Archived products cannot be published");
  }

  if (input.mediaCount === 0) {
    throw new ValidationError("At least one product image is required before publishing");
  }

  if (input.variantCount === 0) {
    throw new ValidationError("At least one variant is required before publishing");
  }

  if (input.activeVariantCount === 0) {
    throw new ValidationError("At least one active variant is required before publishing");
  }

  const hasPrice =
    input.basePrice != null && Number(input.basePrice.toString()) > 0;
  if (!hasPrice) {
    throw new ValidationError("A valid base price is required before publishing");
  }
}

export function assertUniqueSlug(existing: boolean, entity: string): void {
  if (existing) {
    throw new ConflictError(`${entity} slug already exists`);
  }
}

export function assertUniqueSku(existing: boolean): void {
  if (existing) {
    throw new ConflictError("SKU already exists");
  }
}
