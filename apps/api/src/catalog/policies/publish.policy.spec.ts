import { ValidationError } from "@ecom/shared";

import { assertCanPublish } from "./publish.policy";

describe("assertCanPublish", () => {
  const validInput = {
    status: "draft" as const,
    basePrice: { toString: () => "499.00" },
    mediaCount: 1,
    variantCount: 1,
    activeVariantCount: 1,
  };

  it("passes when all publish rules are met", () => {
    expect(() => assertCanPublish(validInput)).not.toThrow();
  });

  it("rejects already published products", () => {
    expect(() =>
      assertCanPublish({ ...validInput, status: "published" }),
    ).toThrow(ValidationError);
  });

  it("rejects products without images", () => {
    expect(() => assertCanPublish({ ...validInput, mediaCount: 0 })).toThrow(ValidationError);
  });

  it("rejects products without variants", () => {
    expect(() => assertCanPublish({ ...validInput, variantCount: 0 })).toThrow(ValidationError);
  });

  it("rejects products without a base price", () => {
    expect(() => assertCanPublish({ ...validInput, basePrice: null })).toThrow(ValidationError);
  });
});
