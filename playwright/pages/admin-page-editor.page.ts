import type { Locator, Page } from "@playwright/test";

/**
 * Encapsulates the admin CMS page editor at `/pages/[id]`, covering the SEO
 * panel (`SeoPanel`) and the section list (`PageSectionsEditor`) shared by
 * `homepage`, `landing`, and `campaign` page types.
 */
export class AdminPageEditorPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly seoTitleInput: Locator;
  readonly seoDescriptionInput: Locator;
  readonly seoCanonicalInput: Locator;
  readonly seoOgImageInput: Locator;
  readonly sectionsLabel: Locator;
  readonly saveButton: Locator;
  readonly publishButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Edit Page" });
    this.seoTitleInput = page.getByLabel("SEO title");
    this.seoDescriptionInput = page.getByLabel("SEO description");
    this.seoCanonicalInput = page.getByLabel("Canonical URL");
    this.seoOgImageInput = page.getByLabel("Open Graph image URL");
    this.sectionsLabel = page.getByText("Sections", { exact: true });
    this.saveButton = page.getByRole("button", { name: "Save" });
    this.publishButton = page.getByRole("button", { name: "Publish now" });
  }

  /** Locates a section's header row by its `PageSection["kind"]` label, e.g. "Hero Banner". */
  sectionHeading(kindLabel: string): Locator {
    return this.page.getByText(new RegExp(`\\d+\\.\\s*${kindLabel}`));
  }
}
