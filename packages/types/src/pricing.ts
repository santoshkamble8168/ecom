/** Pricing domain (Sprint 10): price lists, scheduled/sale pricing, tax rules, price history, simulation. */

export interface PriceListSummary {
  id: string;
  code: string;
  name: string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ProductPriceSummary {
  id: string;
  priceListId: string;
  variantSku: string;
  mrp: string;
  sellingPrice: string;
  salePrice: string | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  /** True if a sale window is configured and currently active (server-computed). */
  saleActive: boolean;
  /** The price a customer actually pays right now: `salePrice` if active, else `sellingPrice`. */
  effectivePrice: string;
  isActive: boolean;
  updatedAt: string;
}

export interface UpsertProductPriceInput {
  priceListId?: string;
  variantSku: string;
  mrp: string;
  sellingPrice: string;
  salePrice?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  reason?: string;
}

export interface PriceHistoryEntry {
  id: string;
  variantSku: string;
  oldMrp: string | null;
  newMrp: string;
  oldSellingPrice: string | null;
  newSellingPrice: string;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface TaxRuleSummary {
  id: string;
  name: string;
  rate: string;
  appliesTo: string;
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface UpsertTaxRuleInput {
  name: string;
  rate: string;
  appliesTo?: string;
  categoryId?: string | null;
  priority?: number;
  isActive?: boolean;
}

export interface PriceSimulationInput {
  variantSku: string;
  quantity?: number;
  couponCode?: string;
}

export interface PriceSimulationResult {
  variantSku: string;
  mrp: string;
  sellingPrice: string;
  effectivePrice: string;
  quantity: number;
  subtotal: string;
  discount: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  couponApplied: string | null;
}
