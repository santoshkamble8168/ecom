"use client";

import type { CmsMediaAsset } from "@ecom/types";
import { Button, Card, CardContent, ConfirmDialog } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AdminPageHeader } from "@/components/layout/page-header";
import { ApiClientError } from "@/lib/api";
import { deleteMedia, listMedia, updateMedia, uploadMedia } from "@/lib/cms-api";

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<CmsMediaAsset | null>(null);
  const media = useQuery({ queryKey: ["cms-media", search], queryFn: () => listMedia(search) });

  const upload = useMutation({
    mutationFn: (file: File) => uploadMedia(file),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["cms-media"] });
    },
    onError: (reason) => setError(reason instanceof ApiClientError ? reason.message : "Upload failed."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["cms-media"] });
    },
    onError: (reason) => setError(reason instanceof ApiClientError ? reason.message : "This file is still in use."),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Media"
        description="Upload images once and reuse them across pages, banners, and reusable sections."
        actions={
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
            <span className="inline-flex h-10 items-center rounded-md bg-accent-500 px-4 text-sm font-medium text-neutral-950">Upload</span>
          </label>
        }
      />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search media"
        className="max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
        aria-label="Search media"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(media.data?.items ?? []).map((asset) => (
          <Card key={asset.id}>
            <CardContent className="flex flex-col gap-3 pt-6">
              {asset.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={asset.altText ?? asset.filename} className="h-36 w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-md bg-neutral-100 text-sm">{asset.filename}</div>
              )}
              <input
                defaultValue={asset.altText ?? ""}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                aria-label={`Alt text for ${asset.filename}`}
                onBlur={(event) => {
                  if (event.target.value !== (asset.altText ?? "")) {
                    void updateMedia(asset.id, { altText: event.target.value }).then(() => queryClient.invalidateQueries({ queryKey: ["cms-media"] }));
                  }
                }}
              />
              <p className="truncate text-xs text-neutral-500">{asset.filename}</p>
              <Button type="button" variant="outline" onClick={() => setPending(asset)}>Delete</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => pending && remove.mutate(pending.id)}
        title="Delete media"
        description="Delete this file? It cannot be removed while a page or reusable section still uses it."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
      />
    </div>
  );
}
