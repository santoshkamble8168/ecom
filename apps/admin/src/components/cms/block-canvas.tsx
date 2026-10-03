"use client";

import type { ContentBlock } from "@ecom/types";
import { BLOCK_LIBRARY } from "@ecom/types";
import { Button } from "@ecom/ui";
import { useState } from "react";

import { createBlock, duplicateBlock, moveItem } from "./block-model";

export function BlockCanvas({
  blocks,
  selectedId,
  onSelect,
  onChange,
}: {
  blocks: ContentBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (blocks: ContentBlock[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {BLOCK_LIBRARY.map((item) => (
          <Button
            key={item.type}
            type="button"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={() => {
              const block = createBlock(item.type);
              onChange([...blocks, block]);
              onSelect(block.id);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-sm text-neutral-500">
          Add a block to start building this section.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null) return;
                onChange(moveItem(blocks, dragIndex, index));
                setDragIndex(null);
              }}
              className={`rounded-lg border bg-white p-3 dark:bg-neutral-950 ${
                selectedId === block.id ? "border-neutral-900" : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(block.id)}>
                  <span className="text-xs uppercase tracking-wide text-neutral-500">{block.type.replaceAll("_", " ")}</span>
                  <span className="mt-1 block truncate text-sm">{blockSummary(block)}</span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => onChange(moveItem(blocks, index, index - 1))}>
                    Up
                  </Button>
                  <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => onChange(moveItem(blocks, index, index + 1))}>
                    Down
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => onChange([...blocks.slice(0, index + 1), duplicateBlock(block), ...blocks.slice(index + 1)])}
                  >
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      onChange(blocks.filter((item) => item.id !== block.id));
                      if (selectedId === block.id) onSelect(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function blockSummary(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
      return block.text;
    case "paragraph":
      return block.html.replace(/<[^>]+>/g, " ").trim() || "Paragraph";
    case "image":
      return block.alt || "Image";
    case "video":
      return block.title || block.url;
    case "button":
      return block.label;
    case "banner":
      return block.title || "Banner";
    case "gallery":
      return `${block.items.length} images`;
    case "columns":
      return `${block.columns.length} columns`;
    case "testimonials":
      return `${block.items.length} quotes`;
    case "faq":
      return `${block.items.length} questions`;
    case "custom_section":
      return block.detached ? block.title || "Custom section" : "Reusable section";
    case "product_grid":
      return block.title || block.slug;
    default:
      return "Block";
  }
}
