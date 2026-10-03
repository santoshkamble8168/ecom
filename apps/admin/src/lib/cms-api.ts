import type {
  CmsMediaAsset,
  ContentStatus,
  PageDetail,
  PageKind,
  PagePreviewLink,
  PageSummary,
  PageType,
  PageVersionDetail,
  PageVersionSummary,
  PaginationMeta,
  ReusableSectionSummary,
} from "@ecom/types";

import { apiFetch, apiUpload } from "./api";

export interface CmsListResponse<T> {
  items: T[];
  meta: { pagination: PaginationMeta };
}

export interface PageWriteInput {
  type: PageType;
  slug: string;
  title: string;
  fields: Record<string, unknown>;
  seoTitle?: string;
  seoDescription?: string;
  seoCanonicalUrl?: string;
  seoOgImage?: string;
  seoNoIndex?: boolean;
  templateKey?: string;
  featuredImageUrl?: string;
}

export function listPages(params: {
  kind?: PageKind;
  type?: PageType | "";
  status?: ContentStatus | "";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params.kind) query.set("kind", params.kind);
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  return apiFetch<CmsListResponse<PageSummary>>(`/admin/cms/pages?${query.toString()}`);
}

export const getPage = (id: string) => apiFetch<PageDetail>(`/admin/cms/pages/${id}`);
export const createPage = (input: PageWriteInput) =>
  apiFetch<PageDetail>("/admin/cms/pages", { method: "POST", body: JSON.stringify(input) });
export const updatePage = (id: string, input: Partial<PageWriteInput>) =>
  apiFetch<PageDetail>(`/admin/cms/pages/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const publishPage = (id: string) => apiFetch<PageDetail>(`/admin/cms/pages/${id}/publish`, { method: "POST" });
export const unpublishPage = (id: string) => apiFetch<PageDetail>(`/admin/cms/pages/${id}/unpublish`, { method: "POST" });
export const archivePage = (id: string) => apiFetch<PageDetail>(`/admin/cms/pages/${id}/archive`, { method: "POST" });
export const schedulePage = (id: string, scheduledAt: string) =>
  apiFetch<PageDetail>(`/admin/cms/pages/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt }) });
export const duplicatePage = (id: string) => apiFetch<PageDetail>(`/admin/cms/pages/${id}/duplicate`, { method: "POST" });
export const deletePage = (id: string) => apiFetch<void>(`/admin/cms/pages/${id}`, { method: "DELETE" });
export const previewPage = (id: string) => apiFetch<PagePreviewLink>(`/admin/cms/pages/${id}/preview`);
export const listVersions = (id: string) => apiFetch<PageVersionSummary[]>(`/admin/cms/pages/${id}/versions`);
export const restoreVersion = (id: string, versionId: string) =>
  apiFetch<PageDetail>(`/admin/cms/pages/${id}/versions/${versionId}/restore`, { method: "POST" });
export const getVersion = (id: string, versionId: string) =>
  apiFetch<PageVersionDetail>(`/admin/cms/pages/${id}/versions/${versionId}`);

export function listMedia(search = "", page = 1) {
  const query = new URLSearchParams({ page: String(page), pageSize: "24" });
  if (search) query.set("search", search);
  return apiFetch<CmsListResponse<CmsMediaAsset>>(`/admin/cms/media?${query.toString()}`);
}

export function uploadMedia(file: File, altText?: string) {
  const body = new FormData();
  body.set("file", file);
  if (altText) body.set("altText", altText);
  return apiUpload<CmsMediaAsset>("/admin/cms/media", body);
}

export const updateMedia = (id: string, input: { altText?: string; filename?: string }) =>
  apiFetch<CmsMediaAsset>(`/admin/cms/media/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteMedia = (id: string) => apiFetch<void>(`/admin/cms/media/${id}`, { method: "DELETE" });

export const listSections = () => apiFetch<ReusableSectionSummary[]>("/admin/cms/sections");
export const getSection = (id: string) => apiFetch<ReusableSectionSummary>(`/admin/cms/sections/${id}`);
export const createSection = (input: { name: string; slug: string; description?: string; blocks: unknown[] }) =>
  apiFetch<ReusableSectionSummary>("/admin/cms/sections", { method: "POST", body: JSON.stringify(input) });
export const updateSection = (id: string, input: { name?: string; slug?: string; description?: string; blocks?: unknown[] }) =>
  apiFetch<ReusableSectionSummary>(`/admin/cms/sections/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteSection = (id: string) => apiFetch<void>(`/admin/cms/sections/${id}`, { method: "DELETE" });
