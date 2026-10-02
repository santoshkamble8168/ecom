import Link from "next/link";

const STEPS = [
  { id: "bag", label: "Bag", href: "/cart" },
  { id: "address", label: "Address", href: "/checkout" },
  { id: "payment", label: "Payment" },
] as const;

export type CheckoutStep = (typeof STEPS)[number]["id"];

export function CheckoutProgress({ current, className = "" }: { current: CheckoutStep; className?: string }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className={`flex items-center justify-center ${className}`} aria-label="Checkout progress">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const href = "href" in step ? step.href : undefined;
        const labelClass = `border-b-2 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.2em] ${
          active
            ? "border-brand-600 text-brand-700 dark:text-brand-400"
            : "border-transparent text-neutral-600 dark:text-neutral-400"
        }`;

        return (
          <li key={step.id} className="flex items-center">
            {done && href ? (
              <Link href={href} className={`${labelClass} hover:text-neutral-900 dark:hover:text-neutral-100`}>
                {step.label}
              </Link>
            ) : (
              <span className={labelClass} aria-current={active ? "step" : undefined}>
                {step.label}
              </span>
            )}
            {index < STEPS.length - 1 && (
              <span
                className="mx-1.5 w-4 border-t border-dashed border-neutral-400 sm:mx-3 sm:w-20"
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
