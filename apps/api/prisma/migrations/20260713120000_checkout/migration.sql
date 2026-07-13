-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('draft', 'address_selected', 'shipping_selected', 'payment_selected', 'reviewed', 'order_prepared', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "CheckoutPaymentMethod" AS ENUM ('razorpay', 'cod');

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "shipping_fee" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "address_id" TEXT,
    "guest_address" JSONB,
    "shipping_method_code" TEXT,
    "shipping_label" TEXT,
    "estimated_days_min" INTEGER,
    "estimated_days_max" INTEGER,
    "payment_method" "CheckoutPaymentMethod",
    "line_items_snapshot" JSONB NOT NULL,
    "coupons_snapshot" JSONB NOT NULL,
    "review_valid_at" TIMESTAMP(3),
    "prepared_order_ref" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_idempotency" (
    "id" TEXT NOT NULL,
    "checkout_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "base_fee" DECIMAL(10,2) NOT NULL,
    "estimated_days_min" INTEGER NOT NULL,
    "estimated_days_max" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pincode_prefixes" TEXT[],
    "shipping_method_id" TEXT NOT NULL,
    "fee_override" DECIMAL(10,2),
    "is_serviceable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "applies_to" TEXT NOT NULL DEFAULT 'all',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessions_prepared_order_ref_key" ON "checkout_sessions"("prepared_order_ref");

-- CreateIndex
CREATE INDEX "checkout_sessions_user_id_idx" ON "checkout_sessions"("user_id");

-- CreateIndex
CREATE INDEX "checkout_sessions_session_id_idx" ON "checkout_sessions"("session_id");

-- CreateIndex
CREATE INDEX "checkout_sessions_cart_id_idx" ON "checkout_sessions"("cart_id");

-- CreateIndex
CREATE INDEX "checkout_sessions_status_idx" ON "checkout_sessions"("status");

-- CreateIndex
CREATE INDEX "checkout_sessions_expires_at_idx" ON "checkout_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_idempotency_checkout_id_idempotency_key_key" ON "checkout_idempotency"("checkout_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "checkout_idempotency_expires_at_idx" ON "checkout_idempotency"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_methods_code_key" ON "shipping_methods"("code");

-- CreateIndex
CREATE INDEX "shipping_zones_shipping_method_id_idx" ON "shipping_zones"("shipping_method_id");

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_idempotency" ADD CONSTRAINT "checkout_idempotency_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
