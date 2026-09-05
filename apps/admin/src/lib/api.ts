import type { ApiResponse, ApiResponseMeta } from "@ecom/types";

import { getApiUrl } from "./api-url";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ecom_admin_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ecom_admin_refresh_token");
}

export function setToken(token: string, refreshToken?: string): void {
  localStorage.setItem("ecom_admin_token", token);
  if (refreshToken) {
    localStorage.setItem("ecom_admin_refresh_token", refreshToken);
  }
}

export function clearToken(): void {
  localStorage.removeItem("ecom_admin_token");
  localStorage.removeItem("ecom_admin_refresh_token");
}

const API_UNREACHABLE =
  "Cannot reach the API. Keep `pnpm run dev` running so the API is on :4000, and run `pnpm docker:up` for Postgres.";

function redirectToLoginIfUnauthorized(path: string, body: ApiResponse<unknown>): void {
  if (typeof window === "undefined") return;
  if (body.success) return;
  if (body.error?.code !== "UNAUTHORIZED") return;
  if (path.startsWith("/auth/")) return;
  clearToken();
  if (!window.location.pathname.startsWith("/login")) {
    window.location.replace("/login");
  }
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const looksJson = contentType.includes("application/json") || text.startsWith("{") || text.startsWith("[");

  if (!looksJson) {
    throw new Error(API_UNREACHABLE);
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(API_UNREACHABLE);
  }
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  const token = getToken();
  if (refreshToken && token) {
    try {
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Best-effort logout
    }
  }
  clearToken();
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  } catch {
    throw new Error(API_UNREACHABLE);
  }
  const body = await readApiResponse<T>(response);

  if (!body.success) {
    redirectToLoginIfUnauthorized(path, body);
    throw new Error(body.error.message);
  }

  return body.data;
}

export async function apiFetchWithMeta<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta?: ApiResponseMeta }> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  } catch {
    throw new Error(API_UNREACHABLE);
  }
  const body = await readApiResponse<T>(response);

  if (!body.success) {
    redirectToLoginIfUnauthorized(path, body);
    throw new Error(body.error?.message ?? "Request failed");
  }

  return { data: body.data, meta: body.meta };
}

/** Download a non-JSON response (CSV export) using the admin bearer token. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiUrl()}${path}`, { headers });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as ApiResponse<unknown>;
      redirectToLoginIfUnauthorized(path, body);
      throw new Error(body.success === false ? body.error.message : `Download failed (${response.status})`);
    }
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
