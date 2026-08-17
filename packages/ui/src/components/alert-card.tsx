import { cn } from "../lib/cn";

const SEVERITY_CLASSES = {
  info: "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-500/10",
  warning: "border-warning-200 bg-warning-50 dark:border-warning-600/40 dark:bg-warning-500/10",
  danger: "border-danger-200 bg-danger-50 dark:border-danger-600/40 dark:bg-danger-500/10",
} as const;

const SEVERITY_TITLE = {
  info: "text-brand-700 dark:text-brand-400",
  warning: "text-warning-600",
  danger: "text-danger-600",
} as const;

export type AlertCardSeverity = keyof typeof SEVERITY_CLASSES;

export interface AlertCardProps {
  severity: AlertCardSeverity;
  title: string;
  detail: string;
  href?: string;
  className?: string;
}

export function AlertCard({ severity, title, detail, href, className }: AlertCardProps) {
  const classes = cn(
    "block rounded-lg border p-4 shadow-sm",
    SEVERITY_CLASSES[severity],
    href && "transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    className,
  );

  const body = (
    <>
      <p className={cn("text-sm font-semibold", SEVERITY_TITLE[severity])}>{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{detail}</p>
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {body}
      </a>
    );
  }

  return <div className={classes}>{body}</div>;
}
