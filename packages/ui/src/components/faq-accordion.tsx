import { cn } from "../lib/cn";

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items, className }: { items: FaqItem[]; className?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No questions yet.</p>;
  }

  return (
    <div className={cn("divide-y divide-neutral-200 dark:divide-neutral-800", className)}>
      {items.map((item, index) => (
        <details key={`${item.question}-${index}`} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
            {item.question}
            <span className="shrink-0 text-neutral-400 transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
