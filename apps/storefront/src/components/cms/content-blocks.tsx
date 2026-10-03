import type { BlockStyle, ContentBlock, ProductListResult, ReusableSectionSummary } from "@ecom/types";
import { FaqAccordion, ProductCard } from "@ecom/ui";
import Link from "next/link";
import type { ReactNode } from "react";

import { StorefrontImage } from "@/components/media/storefront-image";
import { apiFetch } from "@/lib/api";

import { RichHtml } from "./rich-html";

const SPACING: Record<NonNullable<BlockStyle["spacing"]>, string> = {
  none: "",
  sm: "py-4",
  md: "py-8",
  lg: "py-16",
};

const ALIGN: Record<NonNullable<BlockStyle["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function frame(style: BlockStyle | undefined, children: ReactNode) {
  const visibility =
    style?.visibility === "desktop" ? "hidden md:block" : style?.visibility === "mobile" ? "md:hidden" : "";
  return (
    <section
      className={`mx-auto max-w-6xl px-4 ${SPACING[style?.spacing ?? "md"]} ${ALIGN[style?.align ?? "left"]} ${visibility}`}
      style={{ backgroundColor: style?.backgroundColor, color: style?.textColor }}
    >
      {children}
    </section>
  );
}

export function ContentBlocks({
  blocks,
  sections,
}: {
  blocks: ContentBlock[];
  sections?: Record<string, ReusableSectionSummary>;
}) {
  return (
    <>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} sections={sections} />
      ))}
    </>
  );
}

function BlockView({
  block,
  sections,
}: {
  block: ContentBlock;
  sections?: Record<string, ReusableSectionSummary>;
}) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level ?? 2}` as "h1" | "h2" | "h3" | "h4";
      return frame(block.style, <Tag className="font-display text-3xl font-bold">{block.text}</Tag>);
    }
    case "paragraph":
      return frame(block.style, <RichHtml html={block.html} />);
    case "image":
      return frame(
        block.style,
        block.url ? (
          <figure>
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
              <StorefrontImage src={block.url} alt={block.alt} className="object-cover" sizes="100vw" />
            </div>
            {block.caption ? <figcaption className="mt-2 text-sm text-neutral-500">{block.caption}</figcaption> : null}
          </figure>
        ) : null,
      );
    case "video":
      return frame(
        block.style,
        <div className="aspect-video overflow-hidden rounded-xl bg-neutral-900">
          <iframe title={block.title || "Video"} src={block.url} className="h-full w-full" allowFullScreen />
        </div>,
      );
    case "button":
      return frame(
        block.style,
        <Link href={block.href} className="inline-flex h-11 items-center rounded-md bg-accent-500 px-5 font-semibold text-neutral-950">
          {block.label}
        </Link>,
      );
    case "banner":
      return frame(
        block.style,
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 px-6 py-16 text-white">
          {block.url ? <StorefrontImage src={block.url} alt={block.alt || block.title || "Banner"} className="object-cover" sizes="100vw" /> : null}
          <div className="relative z-10 max-w-xl">
            {block.title ? <h2 className="text-4xl font-display font-bold">{block.title}</h2> : null}
            {block.subtitle ? <p className="mt-3 text-lg text-neutral-200">{block.subtitle}</p> : null}
            {block.ctaLabel && block.ctaHref ? (
              <Link href={block.ctaHref} className="mt-6 inline-flex h-11 items-center rounded-md bg-accent-500 px-5 font-semibold text-neutral-950">
                {block.ctaLabel}
              </Link>
            ) : null}
          </div>
        </div>,
      );
    case "gallery":
      return frame(
        block.style,
        <div className="grid gap-3 sm:grid-cols-3">
          {block.items.map((item, index) =>
            item.url ? (
              <div key={`${block.id}-${index}`} className="relative aspect-square overflow-hidden rounded-lg">
                <StorefrontImage src={item.url} alt={item.alt} className="object-cover" sizes="33vw" />
              </div>
            ) : null,
          )}
        </div>,
      );
    case "columns":
      return frame(
        block.style,
        <div className={`grid gap-6 ${block.columns.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {block.columns.map((column, index) => (
            <div key={`${block.id}-col-${index}`}>
              <ContentBlocks blocks={column.blocks} sections={sections} />
            </div>
          ))}
        </div>,
      );
    case "testimonials":
      return frame(
        block.style,
        <div className="grid gap-4 md:grid-cols-2">
          {block.items.map((item, index) => (
            <blockquote key={`${block.id}-quote-${index}`} className="rounded-xl border border-neutral-200 p-5">
              <p>{item.quote}</p>
              <footer className="mt-3 text-sm text-neutral-500">
                {item.author}
                {item.role ? ` · ${item.role}` : ""}
              </footer>
            </blockquote>
          ))}
        </div>,
      );
    case "faq":
      return frame(block.style, <FaqAccordion items={block.items} />);
    case "custom_section": {
      const linked = !block.detached && block.reusableSectionId ? sections?.[block.reusableSectionId] : undefined;
      const blocks = linked?.blocks ?? block.blocks ?? [];
      return frame(block.style, <ContentBlocks blocks={blocks} sections={sections} />);
    }
    case "product_grid":
      return frame(block.style, <ProductGridBlock block={block} />);
    default:
      return null;
  }
}

async function ProductGridBlock({ block }: { block: Extract<ContentBlock, { type: "product_grid" }> }) {
  const path =
    block.source === "category"
      ? `/categories/${block.slug}/products`
      : block.source === "campaign"
        ? `/campaigns/${block.slug}/products`
        : `/collections/${block.slug}/products`;
  let products: ProductListResult | null = null;
  try {
    products = await apiFetch<ProductListResult>(`${path}?pageSize=${block.limit ?? 8}`);
  } catch {
    products = null;
  }
  if (!products?.items.length) return null;
  return (
    <div>
      {block.title ? <h2 className="mb-4 text-2xl font-display font-bold">{block.title}</h2> : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.items.map((product) => (
          <ProductCard key={product.slug} product={product} showStatus={false} />
        ))}
      </div>
    </div>
  );
}
