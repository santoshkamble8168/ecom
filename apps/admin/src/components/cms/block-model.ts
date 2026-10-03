import type { ContentBlock, DynamicSlot } from "@ecom/types";

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createBlock(type: ContentBlock["type"]): ContentBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading":
      return { id, type, text: "Heading", level: 2 };
    case "paragraph":
      return { id, type, html: "<p>Write something here.</p>" };
    case "image":
      return { id, type, alt: "Image", url: "" };
    case "video":
      return { id, type, url: "https://", title: "" };
    case "button":
      return { id, type, label: "Learn more", href: "/" };
    case "banner":
      return { id, type, title: "Banner headline", subtitle: "", ctaLabel: "Shop now", ctaHref: "/" };
    case "gallery":
      return { id, type, items: [{ alt: "Image", url: "" }] };
    case "columns":
      return {
        id,
        type,
        columns: [
          { blocks: [{ id: crypto.randomUUID(), type: "paragraph", html: "<p>Column one</p>" }] },
          { blocks: [{ id: crypto.randomUUID(), type: "paragraph", html: "<p>Column two</p>" }] },
        ],
      };
    case "testimonials":
      return { id, type, items: [{ quote: "A short quote.", author: "Customer" }] };
    case "faq":
      return { id, type, items: [{ question: "Question", answer: "Answer" }] };
    case "custom_section":
      return { id, type, title: "Custom section", detached: true, blocks: [] };
    case "product_grid":
      return { id, type, title: "Products", source: "collection", slug: "best-sellers", limit: 8 };
    default:
      return { id, type: "paragraph", html: "<p></p>" };
  }
}

export function duplicateBlock(block: ContentBlock): ContentBlock {
  const copy = structuredClone(block);
  copy.id = crypto.randomUUID();
  if (copy.type === "columns") {
    copy.columns = copy.columns.map((column) => ({
      blocks: column.blocks.map((child) => duplicateBlock(child)),
    }));
  }
  if (copy.type === "custom_section" && copy.blocks) {
    copy.blocks = copy.blocks.map((child) => duplicateBlock(child));
  }
  return copy;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

export const EMPTY_SLOTS: Partial<Record<DynamicSlot, ContentBlock[]>> = {};
