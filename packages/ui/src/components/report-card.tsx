import * as React from "react";

import { cn } from "../lib/cn";

import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export interface ReportCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  kind: string;
  description?: string | null;
  onExport?: () => void;
  exportDisabled?: boolean;
}

export const ReportCard = React.forwardRef<HTMLDivElement, ReportCardProps>(
  ({ name, kind, description, onExport, exportDisabled, className, ...props }, ref) => (
    <Card ref={ref} className={cn(className)} {...props}>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{kind}</p>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {description ? <p className="text-sm text-neutral-500">{description}</p> : null}
        {onExport || exportDisabled ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={onExport}
            disabled={exportDisabled || !onExport}
          >
            Export
          </Button>
        ) : null}
      </CardContent>
    </Card>
  ),
);
ReportCard.displayName = "ReportCard";
