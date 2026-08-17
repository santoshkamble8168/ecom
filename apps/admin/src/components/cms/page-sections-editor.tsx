"use client";

import type { PageSection } from "@ecom/types";
import { Button } from "@ecom/ui";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const SECTION_KIND_LABELS: Record<PageSection["kind"], string> = {
  hero_banner: "Hero Banner",
  banner_strip: "Banner Strip",
  collection_grid: "Collection Grid",
  campaign_grid: "Campaign Grid",
  rich_text: "Rich Text",
};

function defaultSectionFor(kind: PageSection["kind"]): PageSection {
  switch (kind) {
    case "hero_banner":
      return { kind, bannerId: "" };
    case "banner_strip":
      return { kind, bannerIds: [] };
    case "collection_grid":
      return { kind, title: "", collectionSlug: "" };
    case "campaign_grid":
      return { kind, title: "", campaignSlug: "" };
    case "rich_text":
      return { kind, html: "" };
  }
}

function SectionFields({
  section,
  onChange,
}: {
  section: PageSection;
  onChange: (next: PageSection) => void;
}) {
  switch (section.kind) {
    case "hero_banner":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Banner ID</label>
          <input
            type="text"
            value={section.bannerId}
            onChange={(e) => onChange({ ...section, bannerId: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      );
    case "banner_strip":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Banner IDs (comma-separated)
          </label>
          <input
            type="text"
            value={section.bannerIds.join(", ")}
            onChange={(e) =>
              onChange({
                ...section,
                bannerIds: e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            className={INPUT_CLASS}
          />
        </div>
      );
    case "collection_grid":
      return (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Title</label>
            <input
              type="text"
              value={section.title}
              onChange={(e) => onChange({ ...section, title: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Collection slug
            </label>
            <input
              type="text"
              value={section.collectionSlug}
              onChange={(e) => onChange({ ...section, collectionSlug: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex w-28 flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Limit (optional)
            </label>
            <input
              type="number"
              min={1}
              value={section.limit ?? ""}
              onChange={(e) =>
                onChange({
                  ...section,
                  limit: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className={INPUT_CLASS}
            />
          </div>
        </div>
      );
    case "campaign_grid":
      return (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Title</label>
            <input
              type="text"
              value={section.title}
              onChange={(e) => onChange({ ...section, title: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Campaign slug
            </label>
            <input
              type="text"
              value={section.campaignSlug}
              onChange={(e) => onChange({ ...section, campaignSlug: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      );
    case "rich_text":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Title (optional)
            </label>
            <input
              type="text"
              value={section.title ?? ""}
              onChange={(e) => onChange({ ...section, title: e.target.value || undefined })}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              HTML content
            </label>
            <textarea
              rows={5}
              value={section.html}
              onChange={(e) => onChange({ ...section, html: e.target.value })}
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
        </div>
      );
  }
}

export function PageSectionsEditor({
  sections,
  onChange,
}: {
  sections: PageSection[];
  onChange: (next: PageSection[]) => void;
}) {
  const addSection = (kind: PageSection["kind"]) => {
    onChange([...sections, defaultSectionFor(kind)]);
  };

  const updateSection = (index: number, next: PageSection) => {
    onChange(sections.map((s, i) => (i === index ? next : s)));
  };

  const removeSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium">Sections</label>
      {sections.length === 0 && (
        <p className="text-sm text-neutral-500">No sections yet. Add one below.</p>
      )}
      <div className="flex flex-col gap-3">
        {sections.map((section, index) => (
          <div
            key={index}
            className="rounded-md border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {index + 1}. {SECTION_KIND_LABELS[section.kind]}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
                  aria-label="Move section up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
                  aria-label="Move section down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="rounded-md border border-danger-300 px-2 py-1 text-xs text-danger-600 dark:border-danger-700"
                >
                  Remove
                </button>
              </div>
            </div>
            <SectionFields section={section} onChange={(next) => updateSection(index, next)} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <span className="text-xs text-neutral-500">Add section:</span>
        {(Object.keys(SECTION_KIND_LABELS) as PageSection["kind"][]).map((kind) => (
          <Button key={kind} type="button" variant="outline" size="sm" onClick={() => addSection(kind)}>
            {SECTION_KIND_LABELS[kind]}
          </Button>
        ))}
      </div>
    </div>
  );
}
