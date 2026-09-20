import { ValidationError } from "@ecom/shared";
import type { PageType } from "@ecom/types";

import { PAGE_SECTION_KINDS } from "../cms.constants";

type PageSectionKind = (typeof PAGE_SECTION_KINDS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Validates a single `PageSection` union member against the fixed field set
 * its `kind` requires (see `packages/types/src/cms.ts`).
 */
function validateSection(section: unknown, index: number, errors: string[]): void {
  const path = `fields.sections[${index}]`;
  if (!isRecord(section)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const kind = section.kind;
  if (typeof kind !== "string" || !(PAGE_SECTION_KINDS as readonly string[]).includes(kind)) {
    errors.push(`${path}.kind must be one of: ${PAGE_SECTION_KINDS.join(", ")}`);
    return;
  }

  switch (kind as PageSectionKind) {
    case "hero_banner":
      if (!isNonEmptyString(section.bannerId)) {
        errors.push(`${path}.bannerId is required and must be a non-empty string`);
      }
      break;
    case "banner_strip":
      if (!isStringArray(section.bannerIds) || section.bannerIds.length === 0) {
        errors.push(`${path}.bannerIds is required and must be a non-empty array of strings`);
      }
      break;
    case "collection_grid":
      if (!isNonEmptyString(section.title)) {
        errors.push(`${path}.title is required and must be a non-empty string`);
      }
      if (!isNonEmptyString(section.collectionSlug)) {
        errors.push(`${path}.collectionSlug is required and must be a non-empty string`);
      }
      if (section.limit !== undefined && typeof section.limit !== "number") {
        errors.push(`${path}.limit must be a number when provided`);
      }
      break;
    case "campaign_grid":
      if (!isNonEmptyString(section.title)) {
        errors.push(`${path}.title is required and must be a non-empty string`);
      }
      if (!isNonEmptyString(section.campaignSlug)) {
        errors.push(`${path}.campaignSlug is required and must be a non-empty string`);
      }
      break;
    case "rich_text":
      if (!isOptionalString(section.title)) {
        errors.push(`${path}.title must be a string when provided`);
      }
      if (!isNonEmptyString(section.html)) {
        errors.push(`${path}.html is required and must be a non-empty string`);
      }
      break;
    case "hero":
      if (!isNonEmptyString(section.headline)) errors.push(`${path}.headline is required`);
      if (!isNonEmptyString(section.subheadline)) errors.push(`${path}.subheadline is required`);
      if (!isNonEmptyString(section.ctaLabel)) errors.push(`${path}.ctaLabel is required`);
      if (!isNonEmptyString(section.ctaHref)) errors.push(`${path}.ctaHref is required`);
      if (!isNonEmptyString(section.imageUrl)) errors.push(`${path}.imageUrl is required`);
      if (!isNonEmptyString(section.imageAlt)) errors.push(`${path}.imageAlt is required`);
      break;
    case "feature_grid":
    case "trust_row":
      if (kind === "feature_grid" && !isNonEmptyString(section.title)) {
        errors.push(`${path}.title is required`);
      }
      if (kind === "trust_row" && !isOptionalString(section.title)) {
        errors.push(`${path}.title must be a string when provided`);
      }
      if (!Array.isArray(section.items) || section.items.length === 0) {
        errors.push(`${path}.items is required and must be a non-empty array`);
      } else {
        section.items.forEach((item, itemIndex) => {
          if (!isRecord(item) || !isNonEmptyString(item.title) || !isNonEmptyString(item.description)) {
            errors.push(`${path}.items[${itemIndex}] must include title and description`);
          }
        });
      }
      break;
    case "fit_guide":
    case "story":
      if (!isNonEmptyString(section.title)) errors.push(`${path}.title is required`);
      if (!isNonEmptyString(section.html)) errors.push(`${path}.html is required`);
      if (kind === "fit_guide" && !isOptionalString(section.imageUrl)) {
        errors.push(`${path}.imageUrl must be a string when provided`);
      }
      break;
    case "cta_banner":
      if (!isNonEmptyString(section.headline)) errors.push(`${path}.headline is required`);
      if (!isOptionalString(section.subheadline)) errors.push(`${path}.subheadline must be a string when provided`);
      if (!isNonEmptyString(section.ctaLabel)) errors.push(`${path}.ctaLabel is required`);
      if (!isNonEmptyString(section.ctaHref)) errors.push(`${path}.ctaHref is required`);
      break;
  }
}

function validateSections(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("fields.sections is required and must be an array");
    return;
  }
  value.forEach((section, index) => validateSection(section, index, errors));
}

/** Shared by `landing` and `campaign` (`CampaignPageFields extends LandingPageFields`). */
function validateLandingLikeFields(fields: Record<string, unknown>, errors: string[]): void {
  if (!isNonEmptyString(fields.heroTitle)) {
    errors.push("fields.heroTitle is required and must be a non-empty string");
  }
  if (!isOptionalString(fields.heroSubtitle)) {
    errors.push("fields.heroSubtitle must be a string when provided");
  }
  if (!isOptionalString(fields.heroImageUrl)) {
    errors.push("fields.heroImageUrl must be a string when provided");
  }
  if (!isOptionalString(fields.heroCtaLabel)) {
    errors.push("fields.heroCtaLabel must be a string when provided");
  }
  if (!isOptionalString(fields.heroCtaUrl)) {
    errors.push("fields.heroCtaUrl must be a string when provided");
  }
  validateSections(fields.sections, errors);
}

function validateFaqItems(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("fields.items is required and must be a non-empty array");
    return;
  }
  value.forEach((item, index) => {
    const path = `fields.items[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!isNonEmptyString(item.question)) {
      errors.push(`${path}.question is required and must be a non-empty string`);
    }
    if (!isNonEmptyString(item.answer)) {
      errors.push(`${path}.answer is required and must be a non-empty string`);
    }
    if (item.sortOrder !== undefined && typeof item.sortOrder !== "number") {
      errors.push(`${path}.sortOrder must be a number when provided`);
    }
  });
}

/**
 * Validates a `Page.fields` JSON blob against the fixed shape its `PageType`
 * requires (see `packages/types/src/cms.ts` for the authoritative contracts).
 * Throws a `ValidationError` listing every missing/invalid key when the
 * shape doesn't match — never partially accepts malformed content.
 */
export function validatePageFields(type: PageType, fields: unknown): void {
  if (!isRecord(fields)) {
    throw new ValidationError(`Invalid fields for page type "${type}": expected an object`);
  }

  const errors: string[] = [];

  switch (type) {
    case "homepage":
      validateSections(fields.sections, errors);
      break;
    case "landing":
      validateLandingLikeFields(fields, errors);
      break;
    case "campaign":
      validateLandingLikeFields(fields, errors);
      if (!isNonEmptyString(fields.campaignSlug)) {
        errors.push("fields.campaignSlug is required and must be a non-empty string");
      }
      break;
    case "policy":
      if (!isNonEmptyString(fields.bodyHtml)) {
        errors.push("fields.bodyHtml is required and must be a non-empty string");
      }
      break;
    case "faq":
      validateFaqItems(fields.items, errors);
      break;
    default:
      errors.push(`Unknown page type "${type as string}"`);
  }

  if (errors.length > 0) {
    throw new ValidationError(`Invalid fields for page type "${type}": ${errors.join("; ")}`, { errors });
  }
}
