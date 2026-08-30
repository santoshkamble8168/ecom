import type { SearchAnalyticsSnapshot } from "@ecom/types";
import * as React from "react";

import { cn } from "../lib/cn";

import { Card, CardContent, CardHeader } from "./card";

export interface SearchAnalyticsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  snapshot: SearchAnalyticsSnapshot;
}

export const SearchAnalyticsCard = React.forwardRef<HTMLDivElement, SearchAnalyticsCardProps>(
  ({ snapshot, className, ...props }, ref) => (
    <Card ref={ref} className={cn(className)} {...props}>
      <CardHeader>
        <p className="text-lg font-semibold leading-none">Search</p>
        <p className="text-sm text-neutral-500">
          {snapshot.totalSearches} searches · {Math.round(snapshot.zeroResultRate * 1000) / 10}% zero results
        </p>
      </CardHeader>
      <CardContent>
        {snapshot.topQueries.length === 0 ? (
          <p className="text-sm text-neutral-500">No search queries in this range.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th scope="col" className="py-2 font-medium text-neutral-500">
                  Query
                </th>
                <th scope="col" className="py-2 font-medium text-neutral-500">
                  Searches
                </th>
                <th scope="col" className="py-2 font-medium text-neutral-500">
                  Zero results
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topQueries.map((row) => (
                <tr key={row.query} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 text-neutral-900 dark:text-neutral-50">{row.query}</td>
                  <td className="py-2 tabular-nums text-neutral-500">{row.searches}</td>
                  <td className="py-2 tabular-nums text-neutral-500">{row.zeroResults}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  ),
);
SearchAnalyticsCard.displayName = "SearchAnalyticsCard";
