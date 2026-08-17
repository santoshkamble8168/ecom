import type { Prisma } from "@prisma/client";

type DecimalInput = Prisma.Decimal | string | number;

export interface EffectivePriceInput {
  sellingPrice: DecimalInput;
  salePrice: DecimalInput | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
}

export interface EffectivePriceResult {
  effectivePrice: string;
  saleActive: boolean;
}

function toMoneyString(value: DecimalInput): string {
  return typeof value === "number" ? value.toFixed(2) : value.toString();
}

/**
 * A sale is active only while `now` falls within `[saleStartsAt, saleEndsAt]`.
 * A missing bound is treated as unbounded on that side (open-ended sale).
 */
export function resolveEffectivePrice(price: EffectivePriceInput, now = new Date()): EffectivePriceResult {
  if (price.salePrice === null || price.salePrice === undefined) {
    return { effectivePrice: toMoneyString(price.sellingPrice), saleActive: false };
  }

  const afterStart = !price.saleStartsAt || now >= price.saleStartsAt;
  const beforeEnd = !price.saleEndsAt || now <= price.saleEndsAt;
  const saleActive = afterStart && beforeEnd;

  return {
    effectivePrice: toMoneyString(saleActive ? price.salePrice : price.sellingPrice),
    saleActive,
  };
}

export interface TaxRuleCandidate {
  rate: string | number;
  categoryId: string | null;
  priority: number;
  isActive: boolean;
}

/**
 * Picks the highest-priority active rule scoped to `categoryId`; falls back to
 * sitewide rules (`categoryId: null`) when no category-specific rule matches.
 * Returns 0 when no rule matches at all.
 */
export function resolveTaxRate(rules: TaxRuleCandidate[], categoryId: string | null): number {
  const active = rules.filter((rule) => rule.isActive);

  const categoryMatches = categoryId ? active.filter((rule) => rule.categoryId === categoryId) : [];
  const sitewide = active.filter((rule) => rule.categoryId === null);

  const pool = categoryMatches.length > 0 ? categoryMatches : sitewide;
  if (pool.length === 0) return 0;

  const best = pool.reduce((highest, candidate) => (candidate.priority > highest.priority ? candidate : highest));
  return typeof best.rate === "number" ? best.rate : Number(best.rate);
}
