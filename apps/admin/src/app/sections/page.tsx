"use client";

import type { ContentBlock, ReusableSectionSummary } from "@ecom/types";
import { Button, Card, CardContent, ConfirmDialog } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { BlockCanvas } from "@/components/cms/block-canvas";
import { slugifyTitle } from "@/components/cms/block-model";
import { AdminPageHeader } from "@/components/layout/page-header";
import { ApiClientError } from "@/lib/api";
import { createSection, deleteSection, listSections, updateSection } from "@/lib/cms-api";

export default function ReusableSectionsPage() {
  const queryClient = useQueryClient();
  const sections = useQuery({ queryKey: ["cms-sections"], queryFn: listSections });
  const [editing, setEditing] = useState<ReusableSectionSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReusableSectionSummary | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const slug = slugifyTitle(name);
      if (!name.trim() || !slug) throw new ApiClientError("Name is required.");
      if (editing) return updateSection(editing.id, { name, slug, blocks });
      return createSection({ name, slug, blocks });
    },
    onSuccess: () => {
      setCreating(false);
      setEditing(null);
      setName("");
      setBlocks([]);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["cms-sections"] });
    },
    onError: (reason) => setError(reason instanceof ApiClientError ? reason.message : "Save failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => {
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["cms-sections"] });
    },
    onError: (reason) => setError(reason instanceof ApiClientError ? reason.message : "This section is still used."),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Reusable Sections"
        description="Build a section once, then insert it on any page. Detach it on a page when that page needs its own copy."
        actions={<Button type="button" onClick={() => { setCreating(true); setEditing(null); setName(""); setBlocks([]); }}>New section</Button>}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4">
        {(sections.data ?? []).map((section) => (
          <Card key={section.id}>
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{section.name}</p>
                <p className="text-sm text-neutral-500">{section.blocks.length} blocks · /{section.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setEditing(section); setCreating(true); setName(section.name); setBlocks(section.blocks); }}>Edit</Button>
                <Button type="button" variant="outline" onClick={() => setPendingDelete(section)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {creating ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <input className="rounded-md border border-neutral-300 px-3 py-2 text-sm" value={name} placeholder="Section name" onChange={(event) => setName(event.target.value)} />
            <BlockCanvas blocks={blocks} selectedId={null} onSelect={() => undefined} onChange={setBlocks} />
            <div className="flex gap-2">
              <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>Save section</Button>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
            <p className="text-xs text-neutral-500">
              Insert saved sections from the page editor with the Custom Section block. <Link href="/pages" className="underline">Go to pages</Link>
            </p>
          </CardContent>
        </Card>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        title="Delete section"
        description="Pages that still embed this section must detach it first."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
      />
    </div>
  );
}
