-- Content CMS: block pages, media library, and reusable sections.
-- New enum values are not used in this migration.

ALTER TYPE "PageType" ADD VALUE 'static';
ALTER TYPE "PageType" ADD VALUE 'collection';
ALTER TYPE "PageType" ADD VALUE 'category';
ALTER TYPE "PageType" ADD VALUE 'blog';

ALTER TABLE "pages" ADD COLUMN "seo_no_index" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pages" ADD COLUMN "template_key" TEXT;
ALTER TABLE "pages" ADD COLUMN "featured_image_url" TEXT;
ALTER TABLE "pages" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "pages_template_key_idx" ON "pages"("template_key");
CREATE INDEX "pages_deleted_at_idx" ON "pages"("deleted_at");

CREATE TABLE "cms_media_assets" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cms_media_assets_storage_key_key" ON "cms_media_assets"("storage_key");
CREATE INDEX "cms_media_assets_created_at_idx" ON "cms_media_assets"("created_at");

CREATE TABLE "reusable_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "blocks" JSONB NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reusable_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reusable_sections_slug_key" ON "reusable_sections"("slug");
