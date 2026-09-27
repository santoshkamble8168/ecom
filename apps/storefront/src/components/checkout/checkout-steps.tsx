import Link from "next/link";

const STEPS = [
  { id: "bag", label: "Bag", href: "/cart" },
  { id: "address", label: "Address", href: "/checkout" },
  { id: "payment", label: "Payment" },
] as const;

export type CheckoutStep = (typeof STEPS)[number]["id"];

export function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="mb-6 flex items-center" aria-label="Checkout progress">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const href = "href" in step ? step.href : undefined;
        const marker = (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              done || active ? "bg-neutral-950 text-white" : "bg-neutral-200 text-neutral-500"
            }`}
          >
            {done ? "✓" : index + 1}
          </span>
        );
        const label = (
          <span className={`text-sm font-semibold ${active ? "text-neutral-950" : "text-neutral-500"}`}>
            {step.label}
          </span>
        );

        return (
          <li key={step.id} className={`flex items-center ${index < STEPS.length - 1 ? "min-w-0 flex-1" : ""}`}>
            {done && href ? (
              <Link href={href} className="flex items-center gap-2 hover:underline">
                {marker}
                {label}
              </Link>
            ) : (
              <span className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
                {marker}
                {label}
              </span>
            )}
            {index < STEPS.length - 1 && (
              <span className={`mx-3 h-px min-w-4 flex-1 ${done ? "bg-neutral-950" : "bg-neutral-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
