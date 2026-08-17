import type { DashboardActivityItem } from "@ecom/types";
import { Card, CardContent, CardHeader } from "@ecom/ui";

import { formatDateTime } from "@/lib/format";

export function ActivityFeed({ activity }: { activity: DashboardActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold leading-none">Activity</h2>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-neutral-500">No recent activity.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activity.map((item) => (
              <li
                key={item.id}
                className="border-l-2 border-neutral-200 pl-3 text-sm dark:border-neutral-700"
              >
                <p className="font-medium">{item.action}</p>
                <p className="text-neutral-500">
                  {item.entityType}
                  {item.entityId ? ` · ${item.entityId}` : ""}
                  {item.actorEmail ? ` · ${item.actorEmail}` : ""}
                </p>
                <p className="text-neutral-500">{formatDateTime(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
