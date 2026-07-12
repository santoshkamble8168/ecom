import { ERROR_CODES, buildErrorResponse, DomainError } from "@ecom/shared";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = request.requestId ?? "unknown";

    const { status, code, message, details } = this.resolve(exception);

    response
      .status(status)
      .json(buildErrorResponse(code, message, requestId, details));
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === "string"
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);
      return {
        status,
        code: this.codeForStatus(status),
        message: Array.isArray(message) ? message.join(", ") : message,
        details: typeof response === "object" ? response : undefined,
      };
    }

    if (exception instanceof DomainError) {
      return {
        status: this.statusForDomainCode(exception.code),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "An unexpected error occurred",
    };
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ERROR_CODES.RATE_LIMITED;
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }

  private statusForDomainCode(code: string): number {
    switch (code) {
      case ERROR_CODES.NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case ERROR_CODES.UNAUTHORIZED:
        return HttpStatus.UNAUTHORIZED;
      case ERROR_CODES.FORBIDDEN:
        return HttpStatus.FORBIDDEN;
      case ERROR_CODES.CONFLICT:
        return HttpStatus.CONFLICT;
      case ERROR_CODES.VALIDATION_FAILED:
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
