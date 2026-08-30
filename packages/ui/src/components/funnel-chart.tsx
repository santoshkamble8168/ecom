import type { FunnelStep } from "@ecom/types";
import * as React from "react";

import { cn } from "../lib/cn";

import { Card, CardContent, CardHeader } from "./card";

export interface FunnelChartProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  steps: FunnelStep[];
}

export const FunnelChart = React.forwardRef<HTMLDivElement, FunnelChartProps>(
  ({ label = "Conversion funnel", steps, className, ...props }, ref) => {
    const maxSessions = Math.max(1, ...steps.map((step) => step.sessions));

    return (
      <Card ref={ref} className={cn(className)} {...props}>
        <CardHeader>
          <p className="text-lg font-semibold leading-none">{label}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {steps.length === 0 ? (
            <p className="text-sm text-neutral-500">No funnel data.</p>
          ) : (
            <>
              <ol className="flex flex-col gap-3" aria-label={label}>
                {steps.map((step) => {
                  const width = Math.max(4, (step.sessions / maxSessions) * 100);
                  const conversion =
                    step.conversionFromPrevious == null
                      ? null
                      : `${Math.round(step.conversionFromPrevious * 1000) / 10}% from previous`;
                  return (
                    <li key={step.key} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-neutral-900 dark:text-neutral-50">{step.label}</span>
                        <span className="tabular-nums text-neutral-500">{step.sessions} sessions</span>
                      </div>
                      <div
                        className="h-3 rounded-sm bg-neutral-100 dark:bg-neutral-800"
                        role="img"
                        aria-label={`${step.label}: ${step.sessions} sessions${conversion ? `, ${conversion}` : ""}`}
                      >
                        <div className="h-3 rounded-sm bg-brand-500" style={{ width: `${width}%` }} />
                      </div>
                      {conversion ? <p className="text-xs text-neutral-500">{conversion}</p> : null}
                    </li>
                  );
                })}
              </ol>
              <table className="sr-only">
                <caption>{label} as a table</caption>
                <thead>
                  <tr>
                    <th scope="col">Step</th>
                    <th scope="col">Sessions</th>
                    <th scope="col">Conversion from previous</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.key}>
                      <td>{step.label}</td>
                      <td>{step.sessions}</td>
                      <td>
                        {step.conversionFromPrevious == null
                          ? "—"
                          : `${Math.round(step.conversionFromPrevious * 1000) / 10}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    );
  },
);
FunnelChart.displayName = "FunnelChart";
