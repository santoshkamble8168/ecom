import type { ApiResponse } from "@ecom/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  const token = getToken();
  if (refreshToken && token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
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

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = (await response.json()) as ApiResponse<T>;

  if (!body.success) {
    throw new Error(body.error.message);
  }

  return body.data;
}

export async function apiFetchWithMeta<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta?: ApiResponse<T> extends { meta?: infer M } ? M : never }> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json();

  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }

  return { data: body.data as T, meta: body.meta };
}

/** Download a non-JSON response (CSV export) using the admin bearer token. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { headers });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as ApiResponse<unknown>;
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
