import type { ApiErrorResponse, ApiResponseMeta, ApiSuccessResponse } from "@ecom/types";

export function buildSuccessResponse<T>(
  data: T,
  requestId: string,
  meta?: ApiResponseMeta,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function buildErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    requestId,
    timestamp: new Date().toISOString(),
  };
}
