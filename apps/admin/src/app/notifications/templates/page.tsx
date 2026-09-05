"use client";

import type { NotificationTemplateSummary, TemplateStatus } from "@ecom/types";
import { CONTENT_STATUS_PILLS, StatusPill } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";

type TemplatesResponse = { templates: NotificationTemplateSummary[] } | NotificationTemplateSummary[];

function normalizeTemplates(data: TemplatesResponse): NotificationTemplateSummary[] {
  return Array.isArray(data) ? data : data.templates;
}

function templateStatusPill(status: TemplateStatus) {
  return CONTENT_STATUS_PILLS[status] ?? { label: status, tone: "neutral" as const };
}

export default function NotificationTemplatesPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-notification-templates"],
    queryFn: async () => {
      const result = await apiFetch<TemplatesResponse>("/admin/notifications/templates");
      return normalizeTemplates(result);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Templates</h1>

      {isLoading && <AdminTableSkeleton />}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load templates."}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Template
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Channel
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Version
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Updated
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.map((template) => {
                const pill = templateStatusPill(template.status);
                return (
                  <tr key={template.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      <p className="font-medium">{template.name}</p>
                      <p className="font-mono text-xs text-neutral-500">{template.key}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{template.channel}</td>
                    <td className="px-4 py-3 text-neutral-500">{template.category}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={pill.label} tone={pill.tone} />
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{template.latestVersion ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatDateTime(template.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/notifications/templates/${template.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data?.length === 0 ? (
            <p className="p-6 text-center text-neutral-500">No notification templates found.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
