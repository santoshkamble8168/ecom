import { cn } from "../lib/cn";

import { Button } from "./button";

export interface AuditTableLog {
  id: string;
  action: string;
  actorEmail: string | null;
  entityType: string;
  createdAt: string;
}

export interface AuditTableProps {
  logs: AuditTableLog[];
  onRowClick?: (log: AuditTableLog) => void;
  className?: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function AuditTable({ logs, onRowClick, className }: AuditTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Time
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Actor
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Action
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
              Entity
            </th>
            {onRowClick ? (
              <th scope="col" className="px-3 py-2 font-medium text-neutral-500">
                <span className="sr-only">Open</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={onRowClick ? 5 : 4} className="px-3 py-6 text-neutral-500">
                No audit logs.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr
                key={log.id}
                className={cn(
                  "border-b border-neutral-100 dark:border-neutral-800",
                  onRowClick && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
                )}
                onClick={onRowClick ? () => onRowClick(log) : undefined}
              >
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  <time dateTime={log.createdAt}>{formatTimestamp(log.createdAt)}</time>
                </td>
                <td className="px-3 py-2 text-neutral-900 dark:text-neutral-50">{log.actorEmail ?? "System"}</td>
                <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-50">{log.action}</td>
                <td className="px-3 py-2 text-neutral-500">{log.entityType}</td>
                {onRowClick ? (
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRowClick(log);
                      }}
                    >
                      View
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
