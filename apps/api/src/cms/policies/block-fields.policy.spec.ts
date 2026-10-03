import { ValidationError } from "@ecom/shared";

import { validateBlockDocument } from "./block-fields.policy";

describe("validateBlockDocument", () => {
  it("accepts a heading and a synced custom section", () => {
    expect(() =>
      validateBlockDocument({
        editor: "blocks",
        blocks: [
          { id: "h1", type: "heading", text: "About", level: 2 },
          { id: "s1", type: "custom_section", reusableSectionId: "section-1" },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects an unknown block and a bad color", () => {
    expect(() =>
      validateBlockDocument({
        editor: "blocks",
        blocks: [{ id: "x", type: "heading", text: "Hi", style: { backgroundColor: "red" } }],
      }),
    ).toThrow(ValidationError);
  });

  it("requires local blocks when a custom section is detached", () => {
    expect(() =>
      validateBlockDocument({
        editor: "blocks",
        blocks: [{ id: "s1", type: "custom_section", detached: true }],
      }),
    ).toThrow(ValidationError);
  });
});
