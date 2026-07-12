import { parseCsvFilter, parsePrice, parseSortKey } from "./filter.parser";

describe("filter parser", () => {
  it("parses sort keys with fallback", () => {
    expect(parseSortKey("price_asc")).toBe("price_asc");
    expect(parseSortKey("invalid")).toBe("newest");
  });

  it("parses csv filters", () => {
    expect(parseCsvFilter("m,l,xl")).toEqual(["m", "l", "xl"]);
    expect(parseCsvFilter("")).toEqual([]);
  });

  it("parses prices", () => {
    expect(parsePrice("499")).toBe(499);
    expect(parsePrice("bad")).toBeUndefined();
  });
});
