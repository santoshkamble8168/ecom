import type { ReactNode } from "react";
import type { CartLineItem } from "@ecom/types";

import { formatInr } from "@/lib/cart";

interface PriceDetailsProps {
  itemCount: number;
  items: CartLineItem[];
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  tax?: string;
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
  const bagDiscount = productDiscount + couponSavings;
  const totalMrp = Number(subtotal) + productDiscount + taxAmount;

  return (
    <>
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="text-base font-semibold text-neutral-500">Price Details</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt>
            Price ({itemCount} item{itemCount === 1 ? "" : "s"})
          </dt>
          <dd>{formatInr(totalMrp)}</dd>
        </div>
        {productDiscount > 0 && (
          <div className="flex items-center justify-between text-success-600">
            <dt>Discount</dt>
            <dd>−{formatInr(productDiscount)}</dd>
          </div>
        )}
        {couponSavings > 0 && (
          <div className="flex items-center justify-between text-success-600">
            <dt>Coupons for you</dt>
            <dd>−{formatInr(couponSavings)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt>Delivery fee</dt>
          <dd className={Number(shipping) === 0 ? "font-medium text-success-600" : ""}>
            {Number(shipping) === 0 ? "Free" : formatInr(shipping)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-neutral-300 pt-3 text-base font-semibold dark:border-neutral-700">
          <dt>Total amount</dt>
          <dd>{formatInr(total)}</dd>
        </div>
      </dl>

      {bagDiscount > 0 && (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-md bg-success-50 px-3 py-2.5 text-sm font-medium text-success-700">
          <TagIcon />
          You&apos;ll save {formatInr(bagDiscount)} on this order
        </p>
      )}

      {children}
    </div>
    <p className="mt-3 flex items-center gap-3 px-1 text-sm font-medium leading-snug text-neutral-600 dark:text-neutral-300">
      <ShieldIcon />
      <span>Safe and secure payments. Easy returns. 100% authentic products.</span>
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

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12V5h7l9 9-7 7-9-9Z" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    </svg>
  );
}
