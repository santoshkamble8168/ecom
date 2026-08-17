import { ValidationError } from "@ecom/shared";

import { validatePageFields } from "./page-fields.policy";

describe("validatePageFields", () => {
  it("rejects fields that are not an object", () => {
    expect(() => validatePageFields("homepage", null)).toThrow(ValidationError);
    expect(() => validatePageFields("homepage", "not-an-object")).toThrow(ValidationError);
    expect(() => validatePageFields("homepage", [])).toThrow(ValidationError);
  });

  describe("homepage", () => {
    it("accepts a valid set of sections", () => {
      expect(() =>
        validatePageFields("homepage", {
          sections: [
            { kind: "hero_banner", bannerId: "banner-1" },
            { kind: "banner_strip", bannerIds: ["banner-1", "banner-2"] },
            { kind: "collection_grid", title: "New Arrivals", collectionSlug: "new-arrivals", limit: 8 },
            { kind: "campaign_grid", title: "Sale", campaignSlug: "summer-sale" },
            { kind: "rich_text", title: "Why shop with us", html: "<p>Fast shipping</p>" },
          ],
        }),
      ).not.toThrow();
    });

    it("rejects a missing sections array", () => {
      expect(() => validatePageFields("homepage", {})).toThrow(ValidationError);
    });

    it("rejects a section with an unknown kind", () => {
      expect(() =>
        validatePageFields("homepage", { sections: [{ kind: "not_a_kind" }] }),
      ).toThrow(ValidationError);
    });

    it("rejects a collection_grid section missing collectionSlug", () => {
      expect(() =>
        validatePageFields("homepage", { sections: [{ kind: "collection_grid", title: "New Arrivals" }] }),
      ).toThrow(ValidationError);
    });

    it("rejects a hero_banner section missing bannerId", () => {
      expect(() =>
        validatePageFields("homepage", { sections: [{ kind: "hero_banner" }] }),
      ).toThrow(ValidationError);
    });

    it("rejects a banner_strip section with an empty bannerIds array", () => {
      expect(() =>
        validatePageFields("homepage", { sections: [{ kind: "banner_strip", bannerIds: [] }] }),
      ).toThrow(ValidationError);
    });

    it("rejects a rich_text section missing html", () => {
      expect(() =>
        validatePageFields("homepage", { sections: [{ kind: "rich_text", title: "Foo" }] }),
      ).toThrow(ValidationError);
    });
  });

  describe("landing", () => {
    it("accepts a valid landing page", () => {
      expect(() =>
        validatePageFields("landing", {
          heroTitle: "Oversized Tees",
          heroSubtitle: "Comfort meets style",
          sections: [{ kind: "rich_text", html: "<p>Shop now</p>" }],
        }),
      ).not.toThrow();
    });

    it("rejects a missing heroTitle", () => {
      expect(() =>
        validatePageFields("landing", { sections: [] }),
      ).toThrow(ValidationError);
    });

    it("rejects a missing sections array", () => {
      expect(() =>
        validatePageFields("landing", { heroTitle: "Oversized Tees" }),
      ).toThrow(ValidationError);
    });
  });

  describe("policy", () => {
    it("accepts a valid policy page", () => {
      expect(() => validatePageFields("policy", { bodyHtml: "<h2>Privacy Policy</h2>" })).not.toThrow();
    });

    it("rejects a missing bodyHtml", () => {
      expect(() => validatePageFields("policy", {})).toThrow(ValidationError);
    });

    it("rejects a non-string bodyHtml", () => {
      expect(() => validatePageFields("policy", { bodyHtml: 123 })).toThrow(ValidationError);
    });
  });

  describe("faq", () => {
    it("accepts a valid faq page", () => {
      expect(() =>
        validatePageFields("faq", {
          items: [
            { question: "What is your return policy?", answer: "30 days." },
            { question: "Do you ship internationally?", answer: "Not yet." },
          ],
        }),
      ).not.toThrow();
    });

    it("rejects an empty items array", () => {
      expect(() => validatePageFields("faq", { items: [] })).toThrow(ValidationError);
    });

    it("rejects items missing an answer", () => {
      expect(() =>
        validatePageFields("faq", { items: [{ question: "What is your return policy?" }] }),
      ).toThrow(ValidationError);
    });
  });

  describe("campaign", () => {
    it("accepts a valid campaign page", () => {
      expect(() =>
        validatePageFields("campaign", {
          heroTitle: "Summer Sale",
          campaignSlug: "summer-sale",
          sections: [{ kind: "collection_grid", title: "Sale Picks", collectionSlug: "sale" }],
        }),
      ).not.toThrow();
    });

    it("rejects a missing campaignSlug", () => {
      expect(() =>
        validatePageFields("campaign", {
          heroTitle: "Summer Sale",
          sections: [],
        }),
      ).toThrow(ValidationError);
    });

    it("rejects a missing heroTitle (inherited from landing fields)", () => {
      expect(() =>
        validatePageFields("campaign", {
          campaignSlug: "summer-sale",
          sections: [],
        }),
      ).toThrow(ValidationError);
    });
  });
});
