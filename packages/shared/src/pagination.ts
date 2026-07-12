import type { PaginationMeta } from "@ecom/types";

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

export function paginationSkip(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}
