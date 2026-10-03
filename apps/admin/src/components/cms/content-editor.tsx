"use client";

import type { ContentBlock, DynamicSlot, PageDetail, PageType } from "@ecom/types";
import { DYNAMIC_TEMPLATES, isBlockPageFields } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminTableSkeleton } from "@/components/layout/admin-skeleton";
import { ApiClientError } from "@/lib/api";
import {
  archivePage,
  createPage,
  getPage,
  listVersions,
  previewPage,
  publishPage,
  restoreVersion,
  schedulePage,
  unpublishPage,
  updatePage,
  type PageWriteInput,
} from "@/lib/cms-api";

import { BlockCanvas } from "./block-canvas";
import { slugifyTitle } from "./block-model";
import { BlockSettings, MediaPicker } from "./block-settings";
import { ContentStatusBadge } from "./status-badge";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

type EditorMode = "static" | "dynamic";

interface EditorDraft {
  type: PageType;
  templateKey: string;
  title: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  sourceSlug: string;
  featuredImageUrl: string;
  blocks: ContentBlock[];
  slots: Partial<Record<DynamicSlot, ContentBlock[]>>;
  seoTitle: string;
  seoDescription: string;
  seoCanonicalUrl: string;
  seoOgImage: string;
  seoNoIndex: boolean;
}

function blankDraft(mode: EditorMode): EditorDraft {
  const template = DYNAMIC_TEMPLATES[0];
  return {
    type: mode === "dynamic" ? template?.pageType ?? "landing" : "static",
    templateKey: mode === "dynamic" ? template?.key ?? "landing" : "",
    title: "",
    slug: "",
    slugEdited: false,
    description: "",
    sourceSlug: "",
    featuredImageUrl: "",
    blocks: [],
    slots: {},
    seoTitle: "",
    seoDescription: "",
    seoCanonicalUrl: "",
    seoOgImage: "",
    seoNoIndex: false,
  };
}

function fromPage(page: PageDetail, mode: EditorMode): EditorDraft {
  const fields = isBlockPageFields(page.fields) ? page.fields : null;
  return {
    type: page.type,
    templateKey: page.templateKey || (mode === "dynamic" ? page.type : ""),
    title: page.title,
    slug: page.slug,
    slugEdited: true,
    description: fields?.description ?? "",
    sourceSlug: fields?.sourceSlug ?? page.slug,
    featuredImageUrl: page.featuredImageUrl ?? "",
    blocks: fields?.blocks ?? [],
    slots: fields?.slots ?? {},
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    seoCanonicalUrl: page.seoCanonicalUrl ?? "",
    seoOgImage: page.seoOgImage ?? "",
    seoNoIndex: page.seoNoIndex ?? false,
  };
}

function toInput(draft: EditorDraft): PageWriteInput {
  return {
    type: draft.type,
    slug: draft.slug,
    title: draft.title,
    templateKey: draft.templateKey || undefined,
    featuredImageUrl: draft.featuredImageUrl || undefined,
    seoTitle: draft.seoTitle || undefined,
    seoDescription: draft.seoDescription || undefined,
    seoCanonicalUrl: draft.seoCanonicalUrl || undefined,
    seoOgImage: draft.seoOgImage || undefined,
    seoNoIndex: draft.seoNoIndex,
    fields: {
      editor: "blocks",
      blocks: draft.blocks,
      description: draft.description,
      sourceSlug: draft.sourceSlug || draft.slug,
      slots: draft.slots,
    },
  };
}

export function ContentEditor({ mode, pageId }: { mode: EditorMode; pageId?: string }) {
  const queryClient = useQueryClient();
  const pageQuery = useQuery({ queryKey: ["cms-page", pageId], queryFn: () => getPage(pageId!), enabled: Boolean(pageId) });
  const versions = useQuery({ queryKey: ["cms-versions", pageId], queryFn: () => listVersions(pageId!), enabled: Boolean(pageId) });
  const [draft, setDraft] = useState<EditorDraft>(() => blankDraft(mode));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(toInput(blankDraft(mode))));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slotKey, setSlotKey] = useState<DynamicSlot | "overrides">("hero");
  const [error, setError] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [preview, setPreview] = useState<{ url: string; viewport: "desktop" | "mobile" } | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [ready, setReady] = useState(!pageId);

  useEffect(() => {
    if (!pageQuery.data) return;
    const next = fromPage(pageQuery.data, mode);
    setDraft(next);
    setSavedSnapshot(JSON.stringify(toInput(next)));
    setReady(true);
  }, [pageQuery.data, mode]);

  const dirty = ready && JSON.stringify(toInput(draft)) !== savedSnapshot;
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const template = DYNAMIC_TEMPLATES.find((item) => item.key === draft.templateKey);
  const activeBlocks = mode === "dynamic" && slotKey !== "overrides" ? draft.slots[slotKey] ?? [] : draft.blocks;
  const selected = useMemo(() => findBlock(activeBlocks, selectedId), [activeBlocks, selectedId]);

  function updateActive(blocks: ContentBlock[]) {
    if (mode === "dynamic" && slotKey !== "overrides") {
      setDraft((current) => ({ ...current, slots: { ...current.slots, [slotKey]: blocks } }));
      return;
    }
    setDraft((current) => ({ ...current, blocks }));
  }

  function updateSelected(block: ContentBlock) {
    updateActive(activeBlocks.map((item) => (item.id === block.id ? block : item)));
  }

  const save = useMutation({
    mutationFn: async () => {
      const input = toInput(draft);
      if (!input.title.trim() || !input.slug.trim()) throw new ApiClientError("Title and URL are required.");
      if (pageId) return updatePage(pageId, input);
      return createPage(input);
    },
    onSuccess: (page) => {
      setError(null);
      setSavedSnapshot(JSON.stringify(toInput(fromPage(page, mode))));
      queryClient.setQueryData(["cms-page", page.id], page);
      if (!pageId) window.location.assign(`${mode === "dynamic" ? "/dynamic-pages" : "/pages"}/${page.id}`);
    },
    onError: (reason) => setError(reason instanceof ApiClientError ? reason.message : "Save failed."),
  });

  async function runLifecycle(task: "publish" | "unpublish" | "archive" | "schedule") {
    if (!pageId) {
      setError("Save the page before publishing.");
      return;
    }
    if (dirty) {
      const ok = window.confirm("Save your changes before continuing?");
      if (!ok) return;
      await save.mutateAsync();
    }
    try {
      const page =
        task === "publish"
          ? await publishPage(pageId)
          : task === "unpublish"
            ? await unpublishPage(pageId)
            : task === "archive"
              ? await archivePage(pageId)
              : await schedulePage(pageId, new Date(scheduleAt).toISOString());
      queryClient.setQueryData(["cms-page", pageId], page);
      void versions.refetch();
      setError(null);
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : "Publishing failed.");
    }
  }

  async function openPreview(viewport: "desktop" | "mobile") {
    if (!pageId) {
      setError("Save a draft before previewing.");
      return;
    }
    if (dirty) {
      const ok = window.confirm("You have unsaved changes. Save before preview?");
      if (!ok) return;
      await save.mutateAsync();
    }
    const link = await previewPage(pageId);
    setPreview({ url: link.url, viewport });
  }

  if (pageQuery.isLoading || !ready) return <AdminTableSkeleton />;
  if (pageQuery.isError) return <p className="text-sm text-red-600">This page could not be loaded.</p>;

  const listHref = mode === "dynamic" ? "/dynamic-pages" : "/pages";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">
            <Link href="/content" className="hover:underline">Content</Link>
            <span> / </span>
            <Link href={listHref} className="hover:underline">{mode === "dynamic" ? "Dynamic Pages" : "Pages"}</Link>
            <span> / </span>
            <span>{draft.title || "New"}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">{pageId ? "Edit" : "Create"}</h1>
            {pageQuery.data ? <ContentStatusBadge status={pageQuery.data.status} /> : <ContentStatusBadge status="draft" />}
            {dirty ? <span className="text-sm text-amber-700">Unsaved changes</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void openPreview("desktop")}>Preview</Button>
          <Button type="button" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>Save draft</Button>
          <Button type="button" onClick={() => void runLifecycle("publish")}>Publish</Button>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Add content</CardTitle></CardHeader>
          <CardContent className="text-sm text-neutral-500">
            Choose a block in the canvas. Drag a block to reorder it, or use the buttons on each row.
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="grid gap-3 pt-6 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                Title
                <input className={INPUT_CLASS} value={draft.title} onChange={(event) => {
                  const title = event.target.value;
                  setDraft((current) => ({ ...current, title, slug: current.slugEdited ? current.slug : slugifyTitle(title) }));
                }} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                URL
                <input className={INPUT_CLASS} value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: slugifyTitle(event.target.value), slugEdited: true }))} />
              </label>
              {mode === "dynamic" ? (
                <label className="flex flex-col gap-1 text-sm">
                  Template
                  <select className={INPUT_CLASS} value={draft.templateKey} onChange={(event) => {
                    const next = DYNAMIC_TEMPLATES.find((item) => item.key === event.target.value);
                    if (!next) return;
                    setDraft((current) => ({ ...current, templateKey: next.key, type: next.pageType }));
                    setSlotKey(next.slots[0]?.key ?? "hero");
                  }}>
                    {DYNAMIC_TEMPLATES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </label>
              ) : (
                <label className="flex flex-col gap-1 text-sm">
                  Page type
                  <select className={INPUT_CLASS} value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as PageType }))}>
                    <option value="static">Page</option>
                    <option value="homepage">Homepage</option>
                    <option value="policy">Policy</option>
                    <option value="faq">FAQ</option>
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                Description
                <textarea className={INPUT_CLASS} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
              </label>
              {mode === "dynamic" ? (
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  Catalog slug
                  <input className={INPUT_CLASS} value={draft.sourceSlug} placeholder="best-sellers" onChange={(event) => setDraft((current) => ({ ...current, sourceSlug: event.target.value }))} />
                </label>
              ) : null}
              <div className="flex items-center gap-2 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setMediaOpen(true)}>Featured image</Button>
                <span className="truncate text-xs text-neutral-500">{draft.featuredImageUrl || "None selected"}</span>
              </div>
            </CardContent>
          </Card>
          {mode === "dynamic" && template ? (
            <div className="flex flex-wrap gap-2">
              {template.slots.map((slot) => (
                <Button key={slot.key} type="button" variant={slotKey === slot.key ? "primary" : "outline"} onClick={() => { setSlotKey(slot.key); setSelectedId(null); }}>
                  {slot.label}
                </Button>
              ))}
              <Button type="button" variant={slotKey === "overrides" ? "primary" : "outline"} onClick={() => { setSlotKey("overrides"); setSelectedId(null); }}>
                Page overrides
              </Button>
            </div>
          ) : null}
          {mode === "dynamic" && slotKey !== "overrides" && template?.slots.find((slot) => slot.key === slotKey)?.locked ? (
            <Card>
              <CardContent className="pt-6 text-sm text-neutral-600">
                This slot is filled by the {template.label.toLowerCase()} template using the catalog slug. The layout stays in sync for every page that uses this template.
              </CardContent>
            </Card>
          ) : (
            <BlockCanvas blocks={activeBlocks} selectedId={selectedId} onSelect={setSelectedId} onChange={updateActive} />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Block settings</CardTitle></CardHeader>
            <CardContent>
              {selected ? <BlockSettings block={selected} onChange={updateSelected} /> : <p className="text-sm text-neutral-500">Select a block to edit its content, image, link, color, alignment, spacing, and visibility.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <input className={INPUT_CLASS} placeholder="SEO title" value={draft.seoTitle} onChange={(event) => setDraft((current) => ({ ...current, seoTitle: event.target.value }))} />
              <textarea className={INPUT_CLASS} placeholder="Meta description" value={draft.seoDescription} onChange={(event) => setDraft((current) => ({ ...current, seoDescription: event.target.value }))} />
              <input className={INPUT_CLASS} placeholder="Canonical URL" value={draft.seoCanonicalUrl} onChange={(event) => setDraft((current) => ({ ...current, seoCanonicalUrl: event.target.value }))} />
              <input className={INPUT_CLASS} placeholder="Social image URL" value={draft.seoOgImage} onChange={(event) => setDraft((current) => ({ ...current, seoOgImage: event.target.value }))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.seoNoIndex} onChange={(event) => setDraft((current) => ({ ...current, seoNoIndex: event.target.checked }))} />
                Hide from search engines
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void openPreview("desktop")}>Desktop</Button>
                <Button type="button" variant="outline" onClick={() => void openPreview("mobile")}>Mobile</Button>
              </div>
              <Button type="button" variant="outline" onClick={() => void runLifecycle("unpublish")}>Unpublish</Button>
              <Button type="button" variant="outline" onClick={() => void runLifecycle("archive")}>Archive</Button>
              <input className={INPUT_CLASS} type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
              <Button type="button" variant="outline" onClick={() => void runLifecycle("schedule")}>Schedule</Button>
              <div className="flex flex-col gap-2">
                {(versions.data ?? []).map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    className="text-left text-xs text-neutral-600 hover:underline"
                    onClick={() => {
                      if (!pageId) return;
                      if (dirty && !window.confirm("Restoring replaces unsaved changes.")) return;
                      void restoreVersion(pageId, version.id).then((page) => {
                        queryClient.setQueryData(["cms-page", pageId], page);
                        const next = fromPage(page, mode);
                        setDraft(next);
                        setSavedSnapshot(JSON.stringify(toInput(next)));
                      });
                    }}
                  >
                    Restore {new Date(version.createdAt).toLocaleString()}
                  </button>
                ))}
                {pageId && (versions.data ?? []).length === 0 ? <p className="text-xs text-neutral-500">Versions appear after you publish.</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MediaPicker open={mediaOpen} onClose={() => setMediaOpen(false)} onSelect={(asset) => { setDraft((current) => ({ ...current, featuredImageUrl: asset.url, seoOgImage: current.seoOgImage || asset.url })); setMediaOpen(false); }} />
      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.viewport === "mobile" ? "Mobile preview" : "Desktop preview"} className="sm:max-w-5xl">
        {preview ? (
          <iframe title="Page preview" src={preview.url} className={`mx-auto h-[70vh] rounded-md border border-neutral-200 ${preview.viewport === "mobile" ? "w-[390px]" : "w-full"}`} />
        ) : null}
      </Dialog>
    </div>
  );
}

function findBlock(blocks: ContentBlock[], id: string | null): ContentBlock | null {
  if (!id) return null;
  return blocks.find((block) => block.id === id) ?? null;
}
