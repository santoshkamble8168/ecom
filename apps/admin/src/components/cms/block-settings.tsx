"use client";

import type { CmsMediaAsset, ContentBlock, ReusableSectionSummary } from "@ecom/types";
import { Button, Dialog } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listMedia, listSections } from "@/lib/cms-api";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function BlockSettings({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
}) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const sections = useQuery({ queryKey: ["cms-sections"], queryFn: listSections });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{block.type.replaceAll("_", " ")}</p>
      {block.type === "heading" ? (
        <>
          <input className={INPUT_CLASS} value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
          <select className={INPUT_CLASS} value={block.level ?? 2} onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 1 | 2 | 3 | 4 })}>
            <option value={1}>Heading 1</option>
            <option value={2}>Heading 2</option>
            <option value={3}>Heading 3</option>
            <option value={4}>Heading 4</option>
          </select>
        </>
      ) : null}
      {block.type === "paragraph" ? (
        <textarea className={`${INPUT_CLASS} min-h-32`} value={block.html} onChange={(event) => onChange({ ...block, html: event.target.value })} />
      ) : null}
      {block.type === "image" ? (
        <>
          <input className={INPUT_CLASS} placeholder="Alt text" value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
          <input className={INPUT_CLASS} placeholder="Caption" value={block.caption ?? ""} onChange={(event) => onChange({ ...block, caption: event.target.value })} />
          <Button type="button" variant="outline" onClick={() => setMediaOpen(true)}>Choose image</Button>
          {block.url ? <p className="truncate text-xs text-neutral-500">{block.url}</p> : null}
        </>
      ) : null}
      {block.type === "video" ? (
        <>
          <input className={INPUT_CLASS} placeholder="Video URL" value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} />
          <input className={INPUT_CLASS} placeholder="Title" value={block.title ?? ""} onChange={(event) => onChange({ ...block, title: event.target.value })} />
        </>
      ) : null}
      {block.type === "button" ? (
        <>
          <input className={INPUT_CLASS} value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} />
          <input className={INPUT_CLASS} value={block.href} onChange={(event) => onChange({ ...block, href: event.target.value })} />
        </>
      ) : null}
      {block.type === "banner" ? (
        <>
          <input className={INPUT_CLASS} placeholder="Title" value={block.title ?? ""} onChange={(event) => onChange({ ...block, title: event.target.value })} />
          <input className={INPUT_CLASS} placeholder="Subtitle" value={block.subtitle ?? ""} onChange={(event) => onChange({ ...block, subtitle: event.target.value })} />
          <input className={INPUT_CLASS} placeholder="Button label" value={block.ctaLabel ?? ""} onChange={(event) => onChange({ ...block, ctaLabel: event.target.value })} />
          <input className={INPUT_CLASS} placeholder="Button link" value={block.ctaHref ?? ""} onChange={(event) => onChange({ ...block, ctaHref: event.target.value })} />
          <Button type="button" variant="outline" onClick={() => setMediaOpen(true)}>Choose image</Button>
        </>
      ) : null}
      {block.type === "faq" ? (
        <FaqFields items={block.items} onChange={(items) => onChange({ ...block, items })} />
      ) : null}
      {block.type === "testimonials" ? (
        <div className="flex flex-col gap-2">
          {block.items.map((item, index) => (
            <div key={`${block.id}-${index}`} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-2">
              <textarea className={INPUT_CLASS} value={item.quote} onChange={(event) => onChange({ ...block, items: block.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, quote: event.target.value } : entry) })} />
              <input className={INPUT_CLASS} value={item.author} onChange={(event) => onChange({ ...block, items: block.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, author: event.target.value } : entry) })} />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => onChange({ ...block, items: [...block.items, { quote: "Quote", author: "Name" }] })}>Add quote</Button>
        </div>
      ) : null}
      {block.type === "product_grid" ? (
        <>
          <input className={INPUT_CLASS} placeholder="Title" value={block.title ?? ""} onChange={(event) => onChange({ ...block, title: event.target.value })} />
          <select className={INPUT_CLASS} value={block.source} onChange={(event) => onChange({ ...block, source: event.target.value as "collection" | "category" | "campaign" })}>
            <option value="collection">Collection</option>
            <option value="category">Category</option>
            <option value="campaign">Campaign</option>
          </select>
          <input className={INPUT_CLASS} placeholder="Slug" value={block.slug} onChange={(event) => onChange({ ...block, slug: event.target.value })} />
        </>
      ) : null}
      {block.type === "custom_section" ? (
        <CustomSectionFields block={block} sections={sections.data ?? []} onChange={onChange} />
      ) : null}
      {block.type === "gallery" ? (
        <div className="flex flex-col gap-2">
          {block.items.map((item, index) => (
            <input
              key={`${block.id}-gallery-${index}`}
              className={INPUT_CLASS}
              placeholder="Alt text"
              value={item.alt}
              onChange={(event) => onChange({ ...block, items: block.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, alt: event.target.value } : entry) })}
            />
          ))}
          <Button type="button" variant="outline" onClick={() => setMediaOpen(true)}>Add image from library</Button>
        </div>
      ) : null}
      <StyleFields block={block} onChange={onChange} />
      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(asset) => {
          if (block.type === "image") {
            onChange({ ...block, mediaId: asset.id, url: asset.url, alt: block.alt || asset.altText || asset.filename });
          } else if (block.type === "banner") {
            onChange({ ...block, mediaId: asset.id, url: asset.url, alt: asset.altText || asset.filename });
          } else if (block.type === "gallery") {
            onChange({ ...block, items: [...block.items, { mediaId: asset.id, url: asset.url, alt: asset.altText || asset.filename }] });
          }
          setMediaOpen(false);
        }}
      />
    </div>
  );
}

function StyleFields({ block, onChange }: { block: ContentBlock; onChange: (block: ContentBlock) => void }) {
  const style = block.style ?? {};
  return (
    <div className="grid grid-cols-2 gap-2">
      <select className={INPUT_CLASS} value={style.align ?? "left"} onChange={(event) => onChange({ ...block, style: { ...style, align: event.target.value as "left" | "center" | "right" } })}>
        <option value="left">Align left</option>
        <option value="center">Align center</option>
        <option value="right">Align right</option>
      </select>
      <select className={INPUT_CLASS} value={style.spacing ?? "md"} onChange={(event) => onChange({ ...block, style: { ...style, spacing: event.target.value as "none" | "sm" | "md" | "lg" } })}>
        <option value="none">No spacing</option>
        <option value="sm">Small spacing</option>
        <option value="md">Medium spacing</option>
        <option value="lg">Large spacing</option>
      </select>
      <select className={INPUT_CLASS} value={style.visibility ?? "all"} onChange={(event) => onChange({ ...block, style: { ...style, visibility: event.target.value as "all" | "desktop" | "mobile" } })}>
        <option value="all">Desktop and mobile</option>
        <option value="desktop">Desktop only</option>
        <option value="mobile">Mobile only</option>
      </select>
      <input className={INPUT_CLASS} placeholder="#111111" value={style.backgroundColor ?? ""} onChange={(event) => onChange({ ...block, style: { ...style, backgroundColor: event.target.value || undefined } })} />
    </div>
  );
}

function FaqFields({
  items,
  onChange,
}: {
  items: Array<{ question: string; answer: string }>;
  onChange: (items: Array<{ question: string; answer: string }>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={`faq-${index}`} className="flex flex-col gap-2">
          <input className={INPUT_CLASS} value={item.question} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, question: event.target.value } : entry))} />
          <textarea className={INPUT_CLASS} value={item.answer} onChange={(event) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, answer: event.target.value } : entry))} />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...items, { question: "Question", answer: "Answer" }])}>Add question</Button>
    </div>
  );
}

function CustomSectionFields({
  block,
  sections,
  onChange,
}: {
  block: Extract<ContentBlock, { type: "custom_section" }>;
  sections: ReusableSectionSummary[];
  onChange: (block: ContentBlock) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <select
        className={INPUT_CLASS}
        value={block.reusableSectionId ?? ""}
        onChange={(event) => {
          const section = sections.find((item) => item.id === event.target.value);
          onChange({ ...block, reusableSectionId: section?.id, detached: false, title: section?.name ?? block.title, blocks: undefined });
        }}
      >
        <option value="">Choose a reusable section</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>{section.name}</option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const source = sections.find((section) => section.id === block.reusableSectionId);
          onChange({ ...block, detached: true, reusableSectionId: undefined, blocks: source?.blocks ?? block.blocks ?? [] });
        }}
      >
        Detach as page content
      </Button>
    </div>
  );
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: CmsMediaAsset) => void;
}) {
  const [search, setSearch] = useState("");
  const media = useQuery({ queryKey: ["cms-media", search], queryFn: () => listMedia(search), enabled: open });
  return (
    <Dialog open={open} onClose={onClose} title="Media library">
      <div className="flex flex-col gap-3">
        <input className={INPUT_CLASS} placeholder="Search images" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="grid max-h-80 grid-cols-3 gap-2 overflow-auto">
          {(media.data?.items ?? []).map((asset) => (
            <button key={asset.id} type="button" className="overflow-hidden rounded-md border border-neutral-200 text-left" onClick={() => onSelect(asset)}>
              {asset.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={asset.altText ?? asset.filename} className="h-20 w-full object-cover" />
              ) : (
                <span className="block p-3 text-xs">{asset.filename}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
