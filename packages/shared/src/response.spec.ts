import { buildErrorResponse, buildSuccessResponse } from "./response";

describe("buildSuccessResponse", () => {
  it("wraps data in the success envelope with request id and timestamp", () => {
    const result = buildSuccessResponse({ id: "1" }, "req-1");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "1" });
    expect(result.requestId).toBe("req-1");
    expect(typeof result.timestamp).toBe("string");
    expect(result).not.toHaveProperty("meta");
  });

  it("includes meta only when provided", () => {
    const meta = { pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } };
    const result = buildSuccessResponse([1, 2], "req-2", meta);

    expect(result.meta).toEqual(meta);
  });
});

describe("buildErrorResponse", () => {
  it("wraps the error in the error envelope", () => {
    const result = buildErrorResponse("NOT_FOUND", "Resource not found", "req-3");

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ code: "NOT_FOUND", message: "Resource not found" });
    expect(result.requestId).toBe("req-3");
  });

  it("includes details only when provided", () => {
    const result = buildErrorResponse("VALIDATION_FAILED", "Invalid input", "req-4", {
      field: "email",
    });

    expect(result.error.details).toEqual({ field: "email" });
  });
});
