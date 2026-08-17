import * as React from "react";

import { cn } from "../lib/cn";

import { Card, CardContent, CardHeader } from "./card";

const TONE_VALUE = {
  neutral: "text-neutral-900 dark:text-neutral-50",
  warning: "text-warning-600",
  danger: "text-danger-600",
  success: "text-success-700",
} as const;

const TONE_DELTA = {
  neutral: "text-neutral-500",
  warning: "text-warning-600",
  danger: "text-danger-600",
  success: "text-success-700",
} as const;

export type KpiCardTone = keyof typeof TONE_VALUE;

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  definition?: string;
  deltaLabel?: string;
  tone?: KpiCardTone;
}

export const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ label, value, definition, deltaLabel, tone = "neutral", className, ...props }, ref) => (
    <Card ref={ref} className={cn(className)} {...props}>
      <CardHeader>
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <p className={cn("text-2xl font-semibold tabular-nums tracking-tight", TONE_VALUE[tone])}>{value}</p>
      </CardHeader>
      {deltaLabel || definition ? (
        <CardContent className="flex flex-col gap-1">
          {deltaLabel ? <p className={cn("text-sm font-medium", TONE_DELTA[tone])}>{deltaLabel}</p> : null}
          {definition ? <p className="text-xs text-neutral-500">{definition}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  ),
);
KpiCard.displayName = "KpiCard";
