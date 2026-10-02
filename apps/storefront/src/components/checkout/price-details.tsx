import type { CartLineItem } from "@ecom/types";
import { cn } from "@ecom/ui";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatInr } from "@/lib/cart";

interface PriceDetailsProps {
  itemCount: number;
  items: CartLineItem[];
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  tax?: string;
  /** When set, a zero coupon discount renders as an "Apply Coupon" action. */
  onApplyCoupon?: () => void;
  className?: string;
  children?: ReactNode;
}

export function PriceDetails({
  itemCount,
  items,
  subtotal,
  discount,
  shipping,
  total,
  tax = "0",
  onApplyCoupon,
  className,
  children,
}: PriceDetailsProps) {
  const productDiscount = items.reduce((sum, item) => {
    const compare = item.product?.compareAtPrice;
    if (!compare) return sum;
    const diff = Number(compare) - Number(item.unitPrice);
    return diff > 0 ? sum + diff * item.quantity : sum;
  }, 0);
  const couponSavings = Number(discount);
  const taxAmount = Number(tax);
  const totalMrp = Number(subtotal) + productDiscount + taxAmount;

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950",
          className,
        )}
      >
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          Price Details ({itemCount} Item{itemCount === 1 ? "" : "s"})
        </h2>
        <dl className="mt-4 space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
          <div className="flex items-center justify-between">
            <dt>Total MRP</dt>
            <dd>{formatInr(totalMrp)}</dd>
          </div>
          {productDiscount > 0 && (
            <div className="flex items-center justify-between">
              <dt>Discount on MRP</dt>
              <dd className="text-success-600">−{formatInr(productDiscount)}</dd>
            </div>
          )}
          {(couponSavings > 0 || onApplyCoupon) && (
            <div className="flex items-center justify-between">
              <dt>Coupon Discount</dt>
              <dd>
                {couponSavings > 0 ? (
                  <span className="text-success-600">−{formatInr(couponSavings)}</span>
                ) : (
                  <button type="button" className="text-brand-600 hover:underline" onClick={onApplyCoupon}>
                    Apply Coupon
                  </button>
                )}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt>Shipping Fee</dt>
            <dd className={Number(shipping) === 0 ? "font-medium uppercase text-success-600" : ""}>
              {Number(shipping) === 0 ? "Free" : formatInr(shipping)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200 pt-3 font-bold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
            <dt>Total Amount</dt>
            <dd>{formatInr(total)}</dd>
          </div>
        </dl>

        {children && (
          <p className="mt-4 text-[11px] text-neutral-600 dark:text-neutral-400">
            By placing the order, you agree to Ecom&apos;s{" "}
            <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        )}

        {children}
      </div>
      <p className="mt-3 flex items-center gap-3 px-1 text-sm font-medium leading-snug text-neutral-600 dark:text-neutral-300">
        <ShieldIcon />
        <span>Safe and secure payments. 100% authentic products.</span>
      </p>
    </>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8 shrink-0 text-neutral-500" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v6c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}
