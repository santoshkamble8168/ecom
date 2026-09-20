import { shouldDropAsBot } from "./bot-protection";

describe("shouldDropAsBot", () => {
  it("ignores empty honeypot values", () => {
    expect(shouldDropAsBot(undefined)).toBe(false);
    expect(shouldDropAsBot(null)).toBe(false);
    expect(shouldDropAsBot("")).toBe(false);
    expect(shouldDropAsBot("   ")).toBe(false);
  });

  it("drops submissions that fill the hidden field", () => {
    expect(shouldDropAsBot("https://spam.example")).toBe(true);
  });
});
