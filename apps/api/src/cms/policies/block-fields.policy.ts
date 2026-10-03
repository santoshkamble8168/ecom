import { ValidationError } from "@ecom/shared";
import type { DynamicSlot } from "@ecom/types";

const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "image",
  "video",
  "button",
  "banner",
  "gallery",
  "columns",
  "testimonials",
  "faq",
  "custom_section",
  "product_grid",
] as const;

const SLOTS = ["hero", "description", "featured", "grid", "promo", "faq", "footer"] as const;
const ALIGNS = ["left", "center", "right"] as const;
const SPACING = ["none", "sm", "md", "lg"] as const;
const VISIBILITY = ["all", "desktop", "mobile"] as const;
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function validateStyle(style: unknown, path: string, errors: string[]): void {
  if (style === undefined) return;
  if (!isRecord(style)) {
    errors.push(`${path}.style must be an object`);
    return;
  }
  if (style.align !== undefined && !(ALIGNS as readonly string[]).includes(String(style.align))) {
    errors.push(`${path}.style.align is invalid`);
  }
  if (style.spacing !== undefined && !(SPACING as readonly string[]).includes(String(style.spacing))) {
    errors.push(`${path}.style.spacing is invalid`);
  }
  if (style.visibility !== undefined && !(VISIBILITY as readonly string[]).includes(String(style.visibility))) {
    errors.push(`${path}.style.visibility is invalid`);
  }
  for (const key of ["backgroundColor", "textColor"] as const) {
    if (style[key] !== undefined && (typeof style[key] !== "string" || !HEX_COLOR.test(style[key]))) {
      errors.push(`${path}.style.${key} must be a hex color`);
    }
  }
}

function validateBlocks(value: unknown, path: string, errors: string[], depth: number): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  value.forEach((block, index) => validateBlock(block, `${path}[${index}]`, errors, depth));
}

function validateBlock(block: unknown, path: string, errors: string[], depth: number): void {
  if (!isRecord(block)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (!isNonEmptyString(block.id)) errors.push(`${path}.id is required`);
  if (typeof block.type !== "string" || !(BLOCK_TYPES as readonly string[]).includes(block.type)) {
    errors.push(`${path}.type must be one of: ${BLOCK_TYPES.join(", ")}`);
    return;
  }
  validateStyle(block.style, path, errors);

  switch (block.type) {
    case "heading":
      if (!isNonEmptyString(block.text)) errors.push(`${path}.text is required`);
      if (block.level !== undefined && ![1, 2, 3, 4].includes(block.level as number)) {
        errors.push(`${path}.level must be 1, 2, 3, or 4`);
      }
      break;
    case "paragraph":
      if (!isNonEmptyString(block.html)) errors.push(`${path}.html is required`);
      break;
    case "image":
      if (!isNonEmptyString(block.alt)) errors.push(`${path}.alt is required`);
      if (!isOptionalString(block.caption)) errors.push(`${path}.caption must be a string`);
      if (!isOptionalString(block.url) || (block.mediaId !== undefined && typeof block.mediaId !== "string")) {
        errors.push(`${path} has an invalid image reference`);
      }
      break;
    case "video":
      if (!isNonEmptyString(block.url)) errors.push(`${path}.url is required`);
      break;
    case "button":
      if (!isNonEmptyString(block.label)) errors.push(`${path}.label is required`);
      if (!isNonEmptyString(block.href)) errors.push(`${path}.href is required`);
      break;
    case "banner":
      if (!isOptionalString(block.title) || !isOptionalString(block.subtitle)) {
        errors.push(`${path} title and subtitle must be strings`);
      }
      break;
    case "gallery":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        errors.push(`${path}.items is required`);
      } else {
        block.items.forEach((item, index) => {
          if (!isRecord(item) || !isNonEmptyString(item.alt)) {
            errors.push(`${path}.items[${index}].alt is required`);
          }
        });
      }
      break;
    case "columns":
      if (depth > 0) {
        errors.push(`${path} cannot contain nested columns`);
        break;
      }
      if (!Array.isArray(block.columns) || block.columns.length < 2 || block.columns.length > 3) {
        errors.push(`${path}.columns must contain 2 or 3 columns`);
      } else {
        block.columns.forEach((column, index) => {
          if (!isRecord(column)) {
            errors.push(`${path}.columns[${index}] must be an object`);
            return;
          }
          validateBlocks(column.blocks, `${path}.columns[${index}].blocks`, errors, depth + 1);
        });
      }
      break;
    case "testimonials":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        errors.push(`${path}.items is required`);
      } else {
        block.items.forEach((item, index) => {
          if (!isRecord(item) || !isNonEmptyString(item.quote) || !isNonEmptyString(item.author)) {
            errors.push(`${path}.items[${index}] needs quote and author`);
          }
        });
      }
      break;
    case "faq":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        errors.push(`${path}.items is required`);
      } else {
        block.items.forEach((item, index) => {
          if (!isRecord(item) || !isNonEmptyString(item.question) || !isNonEmptyString(item.answer)) {
            errors.push(`${path}.items[${index}] needs question and answer`);
          }
        });
      }
      break;
    case "custom_section":
      if (block.detached === true || !isNonEmptyString(block.reusableSectionId)) {
        if (!Array.isArray(block.blocks)) errors.push(`${path}.blocks is required when the section is not linked`);
        else validateBlocks(block.blocks, `${path}.blocks`, errors, depth + 1);
      }
      break;
    case "product_grid":
      if (!["collection", "category", "campaign"].includes(String(block.source))) {
        errors.push(`${path}.source is invalid`);
      }
      if (!isNonEmptyString(block.slug)) errors.push(`${path}.slug is required`);
      if (block.limit !== undefined && typeof block.limit !== "number") errors.push(`${path}.limit must be a number`);
      break;
    default:
      break;
  }
}

/** Validates the block document used by the visual editor. */
export function validateBlockDocument(fields: unknown): void {
  if (!isRecord(fields) || fields.editor !== "blocks") {
    throw new ValidationError("Block pages require fields.editor = \"blocks\"");
  }
  const errors: string[] = [];
  validateBlocks(fields.blocks, "fields.blocks", errors, 0);
  if (fields.description !== undefined && typeof fields.description !== "string") {
    errors.push("fields.description must be a string");
  }
  if (fields.sourceSlug !== undefined && typeof fields.sourceSlug !== "string") {
    errors.push("fields.sourceSlug must be a string");
  }
  if (fields.slots !== undefined) {
    if (!isRecord(fields.slots)) {
      errors.push("fields.slots must be an object");
    } else {
      for (const [slot, blocks] of Object.entries(fields.slots)) {
        if (!(SLOTS as readonly string[]).includes(slot)) {
          errors.push(`fields.slots.${slot} is not a known template slot`);
          continue;
        }
        validateBlocks(blocks, `fields.slots.${slot as DynamicSlot}`, errors, 0);
      }
    }
  }
  if (errors.length > 0) {
    throw new ValidationError(`Invalid block fields: ${errors.join("; ")}`, { errors });
  }
}
