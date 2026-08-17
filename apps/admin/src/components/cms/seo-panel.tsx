"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";

export interface SeoFieldsValue {
  seoTitle: string;
  seoDescription: string;
  seoCanonicalUrl: string;
  seoOgImage: string;
}

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function SeoPanel({
  value,
  onChange,
}: {
  value: SeoFieldsValue;
  onChange: (next: SeoFieldsValue) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SEO</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="seo-title" className="text-sm font-medium">
            SEO title
          </label>
          <input
            id="seo-title"
            type="text"
            value={value.seoTitle}
            onChange={(e) => onChange({ ...value, seoTitle: e.target.value })}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-neutral-500">
            {value.seoTitle.length}/60 characters recommended
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="seo-description" className="text-sm font-medium">
            SEO description
          </label>
          <textarea
            id="seo-description"
            rows={3}
            value={value.seoDescription}
            onChange={(e) => onChange({ ...value, seoDescription: e.target.value })}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-neutral-500">
            {value.seoDescription.length}/160 characters recommended
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="seo-canonical" className="text-sm font-medium">
            Canonical URL
          </label>
          <input
            id="seo-canonical"
            type="text"
            placeholder="https://example.com/page-slug"
            value={value.seoCanonicalUrl}
            onChange={(e) => onChange({ ...value, seoCanonicalUrl: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="seo-og-image" className="text-sm font-medium">
            Open Graph image URL
          </label>
          <input
            id="seo-og-image"
            type="text"
            placeholder="https://example.com/og-image.jpg"
            value={value.seoOgImage}
            onChange={(e) => onChange({ ...value, seoOgImage: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function emptySeoFields(): SeoFieldsValue {
  return { seoTitle: "", seoDescription: "", seoCanonicalUrl: "", seoOgImage: "" };
}

export function seoFieldsFrom(source: {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoCanonicalUrl?: string | null;
  seoOgImage?: string | null;
}): SeoFieldsValue {
  return {
    seoTitle: source.seoTitle ?? "",
    seoDescription: source.seoDescription ?? "",
    seoCanonicalUrl: source.seoCanonicalUrl ?? "",
    seoOgImage: source.seoOgImage ?? "",
  };
}

export function seoFieldsToPayload(value: SeoFieldsValue): {
  seoTitle?: string;
  seoDescription?: string;
  seoCanonicalUrl?: string;
  seoOgImage?: string;
} {
  return {
    seoTitle: value.seoTitle || undefined,
    seoDescription: value.seoDescription || undefined,
    seoCanonicalUrl: value.seoCanonicalUrl || undefined,
    seoOgImage: value.seoOgImage || undefined,
  };
}
