import { buildPaginationMeta, paginationSkip } from "./pagination";

describe("buildPaginationMeta", () => {
  it("computes total pages from total items and page size", () => {
    expect(buildPaginationMeta(1, 10, 25)).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
  });

  it("returns at least 1 total page when there are no items", () => {
    expect(buildPaginationMeta(1, 10, 0).totalPages).toBe(1);
  });
});

describe("paginationSkip", () => {
  it("returns 0 for the first page", () => {
    expect(paginationSkip(1, 20)).toBe(0);
  });

  it("computes the offset for later pages", () => {
    expect(paginationSkip(3, 20)).toBe(40);
  });

  it("clamps non-positive page numbers to the first page", () => {
    expect(paginationSkip(0, 20)).toBe(0);
    expect(paginationSkip(-5, 20)).toBe(0);
  });
});
