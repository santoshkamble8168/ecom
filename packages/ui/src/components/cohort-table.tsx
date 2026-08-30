import type { CohortRow } from "@ecom/types";
import * as React from "react";

import { cn } from "../lib/cn";

export interface CohortTableProps {
  cohorts: CohortRow[];
  className?: string;
}

function formatRate(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function CohortTable({ cohorts, className }: CohortTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Cohort month
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Customers
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Repeat customers
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Repeat rate
            </th>
          </tr>
        </thead>
        <tbody>
          {cohorts.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-neutral-500">
                No cohort data.
              </td>
            </tr>
          ) : (
            cohorts.map((row) => (
              <tr key={row.cohortMonth} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-50">{row.cohortMonth}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-500">{row.customers}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-500">{row.repeatCustomers}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-900 dark:text-neutral-50">
                  {formatRate(row.repeatRate)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
