"use client";

import type {
  CampaignPageFields,
  FaqPageFields,
  HomepageFields,
  LandingPageFields,
  PageType,
  PolicyPageFields,
} from "@ecom/types";

import { PageSectionsEditor } from "./page-sections-editor";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export type PageFieldsValue =
  | HomepageFields
  | LandingPageFields
  | PolicyPageFields
  | FaqPageFields
  | CampaignPageFields;

export function defaultFieldsFor(type: PageType): PageFieldsValue {
  switch (type) {
    case "homepage":
      return { sections: [] };
    case "landing":
      return { heroTitle: "", sections: [] };
    case "campaign":
      return { heroTitle: "", campaignSlug: "", sections: [] };
    case "policy":
      return { bodyHtml: "" };
    case "faq":
      return { items: [] };
  }
}

function LandingLikeFields({
  fields,
  onChange,
}: {
  fields: LandingPageFields;
  onChange: (next: LandingPageFields) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="hero-title">
          Hero title
        </label>
        <input
          id="hero-title"
          type="text"
          value={fields.heroTitle}
          onChange={(e) => onChange({ ...fields, heroTitle: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="hero-subtitle">
          Hero subtitle
        </label>
        <input
          id="hero-subtitle"
          type="text"
          value={fields.heroSubtitle ?? ""}
          onChange={(e) => onChange({ ...fields, heroSubtitle: e.target.value || undefined })}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="hero-image">
          Hero image URL
        </label>
        <input
          id="hero-image"
          type="text"
          value={fields.heroImageUrl ?? ""}
          onChange={(e) => onChange({ ...fields, heroImageUrl: e.target.value || undefined })}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="hero-cta-label">
            Hero CTA label
          </label>
          <input
            id="hero-cta-label"
            type="text"
            value={fields.heroCtaLabel ?? ""}
            onChange={(e) => onChange({ ...fields, heroCtaLabel: e.target.value || undefined })}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="hero-cta-url">
            Hero CTA URL
          </label>
          <input
            id="hero-cta-url"
            type="text"
            value={fields.heroCtaUrl ?? ""}
            onChange={(e) => onChange({ ...fields, heroCtaUrl: e.target.value || undefined })}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <PageSectionsEditor
        sections={fields.sections}
        onChange={(sections) => onChange({ ...fields, sections })}
      />
    </div>
  );
}

export function PageFieldsEditor({
  type,
  fields,
  onChange,
}: {
  type: PageType;
  fields: PageFieldsValue;
  onChange: (next: PageFieldsValue) => void;
}) {
  if (type === "homepage") {
    const value = fields as HomepageFields;
    return (
      <PageSectionsEditor
        sections={value.sections}
        onChange={(sections) => onChange({ ...value, sections })}
      />
    );
  }

  if (type === "landing") {
    return (
      <LandingLikeFields
        fields={fields as LandingPageFields}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (type === "campaign") {
    const value = fields as CampaignPageFields;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="campaign-slug">
            Campaign slug
          </label>
          <input
            id="campaign-slug"
            type="text"
            value={value.campaignSlug}
            onChange={(e) => onChange({ ...value, campaignSlug: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <LandingLikeFields
          fields={value}
          onChange={(next) => onChange({ ...next, campaignSlug: value.campaignSlug })}
        />
      </div>
    );
  }

  if (type === "policy") {
    const value = fields as PolicyPageFields;
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="body-html">
          Body HTML content
        </label>
        <textarea
          id="body-html"
          rows={16}
          value={value.bodyHtml}
          onChange={(e) => onChange({ ...value, bodyHtml: e.target.value })}
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>
    );
  }

  // faq
  const value = fields as FaqPageFields;
  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium">FAQ items</label>
      {value.items.length === 0 && (
        <p className="text-sm text-neutral-500">No FAQ items yet. Add one below.</p>
      )}
      <div className="flex flex-col gap-3">
        {value.items.map((item, index) => (
          <div key={index} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Item {index + 1}</span>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...value, items: value.items.filter((_, i) => i !== index) })
                }
                className="rounded-md border border-danger-300 px-2 py-1 text-xs text-danger-600 dark:border-danger-700"
              >
                Remove
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Question
                </label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      items: value.items.map((it, i) =>
                        i === index ? { ...it, question: e.target.value } : it,
                      ),
                    })
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Answer
                </label>
                <textarea
                  rows={3}
                  value={item.answer}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      items: value.items.map((it, i) =>
                        i === index ? { ...it, answer: e.target.value } : it,
                      ),
                    })
                  }
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={() =>
            onChange({ ...value, items: [...value.items, { question: "", answer: "" }] })
          }
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Add FAQ item
        </button>
      </div>
    </div>
  );
}
