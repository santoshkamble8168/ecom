import { PrismaClient } from "@prisma/client";
import { DEFAULT_RECOMMENDATION_SLOTS } from "@ecom/types";

/**
 * Sprint 16 defaults: merchandising slots with deterministic rule strategies
 * and catalog fallback slugs. Safe to re-run (upsert by slot key).
 */
export async function seedRecommendations(prisma: PrismaClient): Promise<void> {
  for (const slot of DEFAULT_RECOMMENDATION_SLOTS) {
    await prisma.recommendationSlotConfig.upsert({
      where: { slot: slot.slot },
      update: {
        title: slot.title,
        strategy: slot.strategy,
        isEnabled: slot.isEnabled,
        fallbackProductSlugs: slot.fallbackProductSlugs,
        limit: slot.limit,
      },
      create: {
        slot: slot.slot,
        title: slot.title,
        strategy: slot.strategy,
        isEnabled: slot.isEnabled,
        fallbackProductSlugs: slot.fallbackProductSlugs,
        limit: slot.limit,
      },
    });
  }
}
