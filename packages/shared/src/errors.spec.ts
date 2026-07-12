import { DomainError, ERROR_CODES, NotFoundError, UnauthorizedError } from "./errors";

describe("DomainError", () => {
  it("sets the error name to the concrete subclass name", () => {
    const error = new NotFoundError();
    expect(error.name).toBe("NotFoundError");
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });

  it("carries the error code and optional details", () => {
    const error = new UnauthorizedError("Session expired", { reason: "expired" });
    expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    expect(error.message).toBe("Session expired");
    expect(error.details).toEqual({ reason: "expired" });
  });

  it("uses sensible default messages", () => {
    expect(new NotFoundError().message).toBe("Resource not found");
    expect(new UnauthorizedError().message).toBe("Unauthorized");
  });
});
