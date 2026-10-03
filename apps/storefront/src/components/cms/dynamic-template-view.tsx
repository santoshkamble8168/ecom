import type { BlockPageFields, DynamicSlot, PageDetail } from "@ecom/types";
import { DYNAMIC_TEMPLATES, isBlockPageFields } from "@ecom/types";
import type { ReactNode } from "react";

import { ContentBlocks } from "./content-blocks";

export function DynamicTemplateView({ page, grid }: { page: PageDetail; grid?: ReactNode }) {
  if (!isBlockPageFields(page.fields)) return null;
  const fields = page.fields;
  const template = DYNAMIC_TEMPLATES.find((item) => item.key === (page.templateKey ?? page.type));
  if (!template) {
    return <ContentBlocks blocks={fields.blocks} sections={page.reusableSections} />;
  }

  return (
    <div>
      {template.slots.map((slot) => (
        <TemplateSlot key={slot.key} slot={slot.key} locked={slot.locked} fields={fields} page={page} grid={grid} />
      ))}
      {fields.blocks.length > 0 ? <ContentBlocks blocks={fields.blocks} sections={page.reusableSections} /> : null}
    </div>
  );
}

function TemplateSlot({
  slot,
  locked,
  fields,
  page,
  grid,
}: {
  slot: DynamicSlot;
  locked?: boolean;
  fields: BlockPageFields;
  page: PageDetail;
  grid?: ReactNode;
}) {
  if (locked) return grid ?? null;
  const blocks = fields.slots?.[slot] ?? [];
  if (blocks.length === 0 && slot === "description" && fields.description) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 text-lg text-neutral-700">
        <p>{fields.description}</p>
      </section>
    );
  }
  return <ContentBlocks blocks={blocks} sections={page.reusableSections} />;
}
