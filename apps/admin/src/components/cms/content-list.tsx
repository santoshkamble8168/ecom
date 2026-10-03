"use client";

import type { ContentStatus, PageKind, PageSummary } from "@ecom/types";
import { pageKindForType } from "@ecom/types";
import { Button, Card, CardContent, ConfirmDialog } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";
import { AdminPageHeader } from "@/components/layout/page-header";
import { ApiClientError } from "@/lib/api";
import { deletePage, duplicatePage, listPages, previewPage, publishPage, unpublishPage } from "@/lib/cms-api";
import { formatDateTime } from "@/lib/format";

import { ContentStatusBadge } from "./status-badge";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function ContentList({ kind }: { kind: PageKind }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ContentStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<PageSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["cms-pages", kind, status, search, page],
    queryFn: () => listPages({ kind, status, search, page, pageSize: 20 }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
  const basePath = kind === "dynamic" ? "/dynamic-pages" : "/pages";
  const title = kind === "dynamic" ? "Dynamic Pages" : "Pages";

  const action = useMutation({
    mutationFn: async (task: { type: "publish" | "unpublish" | "duplicate" | "preview" | "delete"; page: PageSummary }) => {
      if (task.type === "publish") return publishPage(task.page.id);
      if (task.type === "unpublish") return unpublishPage(task.page.id);
      if (task.type === "duplicate") return duplicatePage(task.page.id);
      if (task.type === "delete") return deletePage(task.page.id);
      return previewPage(task.page.id);
    },
    onSuccess: (result, task) => {
      setMessage(null);
      if (task.type === "preview" && result && "url" in result) {
        window.open(result.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (task.type === "duplicate" && result && "id" in result) {
        window.location.assign(`${basePath}/${result.id}`);
        return;
      }
      setPendingDelete(null);
      void refresh();
    },
    onError: (error) => setMessage(error instanceof ApiClientError ? error.message : "That action could not be completed."),
  });

  const items = query.data?.items ?? [];
  const totalPages = query.data?.meta.pagination.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={title}
        description={
          kind === "dynamic"
            ? "Collection, category, campaign, landing, and blog pages. Pick a template, then edit the content."
            : "Informational pages such as About, Contact, FAQ, and policies."
        }
        actions={
          <Link href={`${basePath}/new`}>
            <Button type="button">New {kind === "dynamic" ? "dynamic page" : "page"}</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search title or URL"
            className={`${INPUT_CLASS} min-w-0 flex-1`}
            aria-label="Search pages"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ContentStatus | "");
              setPage(1);
            }}
            className={INPUT_CLASS}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      {query.isLoading ? <AdminTableSkeleton /> : null}
      {query.isError ? <p className="text-sm text-red-600">Pages could not be loaded.</p> : null}

      {!query.isLoading && !query.isError ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">URL</th>
                {kind === "dynamic" ? <th className="px-4 py-3 font-medium">Template</th> : null}
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={kind === "dynamic" ? 6 : 5} className="px-4 py-8 text-neutral-500">
                    No pages yet. Create one to start editing.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`${basePath}/${item.id}`} className="hover:underline">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">/{item.slug}</td>
                    {kind === "dynamic" ? (
                      <td className="px-4 py-3 capitalize">{item.templateKey ?? item.type}</td>
                    ) : null}
                    <td className="px-4 py-3">
                      <ContentStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{formatDateTime(item.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`${basePath}/${item.id}`} className="text-sm font-medium hover:underline">
                          Edit
                        </Link>
                        <button type="button" className="text-sm font-medium hover:underline" onClick={() => action.mutate({ type: "duplicate", page: item })}>
                          Duplicate
                        </button>
                        <button type="button" className="text-sm font-medium hover:underline" onClick={() => action.mutate({ type: "preview", page: item })}>
                          Preview
                        </button>
                        {item.status === "published" ? (
                          <button type="button" className="text-sm font-medium hover:underline" onClick={() => action.mutate({ type: "unpublish", page: item })}>
                            Unpublish
                          </button>
                        ) : (
                          <button type="button" className="text-sm font-medium hover:underline" onClick={() => action.mutate({ type: "publish", page: item })}>
                            Publish
                          </button>
                        )}
                        <button type="button" className="text-sm font-medium text-red-600 hover:underline" onClick={() => setPendingDelete(item)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && action.mutate({ type: "delete", page: pendingDelete })}
        title="Delete page"
        description={pendingDelete ? `“${pendingDelete.title}” will be removed from the website and the content list.` : ""}
        confirmLabel="Delete"
        destructive
        loading={action.isPending}
      />
    </div>
  );
}

export function publicPathFor(page: Pick<PageSummary, "slug" | "type">): string {
  if (page.slug === "home" || page.type === "homepage") return "/";
  if (pageKindForType(page.type) === "dynamic" && page.type === "collection") return `/collections/${page.slug}`;
  if (page.type === "category") return `/categories/${page.slug}`;
  if (page.type === "campaign") return `/campaign/${page.slug}`;
  if (page.type === "blog" && page.slug === "blog") return "/blog";
  return `/pages/${page.slug}`;
}
