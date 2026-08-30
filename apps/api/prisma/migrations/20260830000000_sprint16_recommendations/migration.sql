-- Sprint 16: recommendation slot config and consent-aware personalization profiles.

CREATE TABLE "recommendation_slot_configs" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "fallback_product_slugs" TEXT[] NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT 8,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_slot_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recommendation_slot_configs_slot_key" ON "recommendation_slot_configs"("slot");

CREATE TABLE "personalization_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_affinities" JSONB NOT NULL DEFAULT '[]',
    "product_affinities" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personalization_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "personalization_profiles_user_id_key" ON "personalization_profiles"("user_id");
CREATE INDEX "personalization_profiles_updated_at_idx" ON "personalization_profiles"("updated_at");

ALTER TABLE "personalization_profiles" ADD CONSTRAINT "personalization_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
