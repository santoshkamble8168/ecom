import { cn } from "../lib/cn";

export interface PriceBreakdownLine {
  label: string;
  amount: string;
  muted?: boolean;
  emphasize?: boolean;
}

export function PriceBreakdown({
  lines,
  className,
}: {
  lines: PriceBreakdownLine[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-col gap-2 text-sm", className)}>
      {lines.map((line) => (
        <div key={line.label} className="flex items-center justify-between gap-4">
          <dt className={cn(line.muted && "text-neutral-500", line.emphasize && "font-semibold")}>{line.label}</dt>
          <dd className={cn(line.muted && "text-neutral-500", line.emphasize && "font-semibold")}>{line.amount}</dd>
        </div>
      ))}
    </dl>
  );
}
