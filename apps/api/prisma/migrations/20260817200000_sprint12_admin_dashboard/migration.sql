-- AlterTable
ALTER TABLE "feature_flags" ADD COLUMN     "environment" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "rollout_percent" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "after" JSONB;

-- CreateIndex
CREATE INDEX "feature_flags_environment_is_enabled_idx" ON "feature_flags"("environment", "is_enabled");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('sales', 'inventory', 'taxes', 'customer_retention', 'product_performance', 'category_performance', 'search', 'coupons', 'campaigns');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "customer_support_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_support_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ReportKind" NOT NULL,
    "description" TEXT,
    "default_params" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'queued',
    "format" TEXT NOT NULL DEFAULT 'csv',
    "params" JSONB NOT NULL DEFAULT '{}',
    "file_path" TEXT,
    "error_message" TEXT,
    "row_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_job_runs" (
    "id" TEXT NOT NULL,
    "job_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "scheduled_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_support_notes_user_id_created_at_idx" ON "customer_support_notes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_support_notes_author_id_idx" ON "customer_support_notes"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_slug_key" ON "report_definitions"("slug");

-- CreateIndex
CREATE INDEX "report_definitions_kind_idx" ON "report_definitions"("kind");

-- CreateIndex
CREATE INDEX "export_jobs_status_created_at_idx" ON "export_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "export_jobs_requested_by_id_idx" ON "export_jobs"("requested_by_id");

-- CreateIndex
CREATE INDEX "export_jobs_report_id_idx" ON "export_jobs"("report_id");

-- CreateIndex
CREATE INDEX "saved_views_user_id_entity_idx" ON "saved_views"("user_id", "entity");

-- CreateIndex
CREATE INDEX "scheduled_job_runs_job_key_started_at_idx" ON "scheduled_job_runs"("job_key", "started_at");

-- AddForeignKey
ALTER TABLE "customer_support_notes" ADD CONSTRAINT "customer_support_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_support_notes" ADD CONSTRAINT "customer_support_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "report_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
