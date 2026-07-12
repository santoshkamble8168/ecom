/** Standard API response envelope shared by every backend endpoint. */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiResponseMeta {
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
