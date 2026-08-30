import * as React from "react";

import { cn } from "../lib/cn";

import { Button } from "./button";

export interface ReportFilterValues {
  from: string;
  to: string;
}

export interface ReportFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  className?: string;
}

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function ReportFilter({ from, to, onFromChange, onToChange, onApply, className }: ReportFilterProps) {
  return (
    <form
      className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">From</span>
        <input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} className={INPUT_CLASS} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">To</span>
        <input type="date" value={to} onChange={(event) => onToChange(event.target.value)} className={INPUT_CLASS} />
      </label>
      <Button type="submit" variant="secondary" size="sm">
        Apply range
      </Button>
    </form>
  );
}
