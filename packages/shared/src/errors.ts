export const ERROR_CODES = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Base class for all domain-level errors thrown across services. */
export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Resource not found", details?: unknown) {
    super(ERROR_CODES.NOT_FOUND, message, details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(ERROR_CODES.UNAUTHORIZED, message, details);
  }
}
