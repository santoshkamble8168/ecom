import * as React from "react";

import { cn } from "../lib/cn";

import { Card, CardContent, CardHeader } from "./card";

export interface DashboardChartPoint {
  date: string;
  value: number;
}

export interface DashboardChartProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  points: DashboardChartPoint[];
  unit?: string;
}

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 140;
const PAD_X = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 24;
const PLOT_HEIGHT = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;

function formatTick(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function tickIndexes(length: number): number[] {
  if (length <= 1) return length === 1 ? [0] : [];
  if (length === 2) return [0, 1];
  return [0, Math.floor((length - 1) / 2), length - 1];
}

export const DashboardChart = React.forwardRef<HTMLDivElement, DashboardChartProps>(
  ({ label, points, unit, className, ...props }, ref) => {
    const maxValue = Math.max(0, ...points.map((point) => point.value), 1);
    const barSlot = points.length > 0 ? (VIEW_WIDTH - PAD_X * 2) / points.length : 0;
    const accessibleName = unit ? `${label} (${unit})` : label;

    return (
      <Card ref={ref} className={cn(className)} {...props}>
        <CardHeader>
          <p className="text-lg font-semibold leading-none">{label}</p>
          {unit ? <p className="text-sm text-neutral-500">{unit}</p> : null}
        </CardHeader>
        <CardContent>
          <figure aria-label={accessibleName}>
            {points.length === 0 ? (
              <p className="text-sm text-neutral-500">No data to display.</p>
            ) : (
              <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                className="h-40 w-full"
                role="img"
                aria-hidden="true"
              >
                {points.map((point, index) => {
                  const barHeight = (point.value / maxValue) * PLOT_HEIGHT;
                  const x = PAD_X + index * barSlot + barSlot * 0.18;
                  const width = barSlot * 0.64;
                  const y = PAD_TOP + PLOT_HEIGHT - barHeight;
                  return (
                    <rect
                      key={`${point.date}-${index}`}
                      x={x}
                      y={y}
                      width={width}
                      height={Math.max(barHeight, 0)}
                      className="fill-brand-500"
                      rx={2}
                    >
                      <title>{`${formatTick(point.date)}: ${point.value}`}</title>
                    </rect>
                  );
                })}
                {tickIndexes(points.length).map((index) => {
                  const point = points[index];
                  if (!point) return null;
                  const x = PAD_X + index * barSlot + barSlot / 2;
                  return (
                    <text
                      key={`tick-${point.date}-${index}`}
                      x={x}
                      y={VIEW_HEIGHT - 6}
                      textAnchor="middle"
                      className="fill-neutral-500 text-[10px]"
                    >
                      {formatTick(point.date)}
                    </text>
                  );
                })}
              </svg>
            )}
          </figure>
        </CardContent>
      </Card>
    );
  },
);
DashboardChart.displayName = "DashboardChart";
