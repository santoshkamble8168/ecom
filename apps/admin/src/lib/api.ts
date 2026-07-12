import type { ApiResponse } from "@ecom/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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
