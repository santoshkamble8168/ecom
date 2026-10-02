import type { ApiResponse, ApiResponseMeta } from "@ecom/types";

import { getApiUrl } from "./api-url";

/** Not a credential: only tells a fresh page load that a refresh cookie was issued and is worth trying. */
const SESSION_HINT_KEY = "ecom_admin_session";
const LEGACY_REFRESH_KEY = "ecom_admin_refresh_token";
const LEGACY_KEYS = ["ecom_admin_token", LEGACY_REFRESH_KEY] as const;
const CLIENT_HEADERS = { "X-Ecom-Client": "admin" } as const;

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function getToken(): string | null {
  return accessToken;
}

/** True when this tab holds an access token or a refresh cookie was issued earlier. */
export function hasSession(): boolean {
  if (accessToken) return true;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_HINT_KEY) === "1" || Boolean(localStorage.getItem(LEGACY_REFRESH_KEY));
}

/** Call with the `accessToken` returned by a login endpoint; the API has already set the refresh cookie. */
export function setSession(token: string): void {
  accessToken = token;
  localStorage.setItem(SESSION_HINT_KEY, "1");
}

export function clearSession(): void {
  accessToken = null;
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_HINT_KEY);
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}

const API_UNREACHABLE =
  "Cannot reach the API. Keep `pnpm run dev` running so the API is on :4000, and run `pnpm docker:up` for Postgres.";

function redirectToLoginIfUnauthorized(path: string, body: ApiResponse<unknown>): void {
  if (typeof window === "undefined") return;
  if (body.success) return;
  if (body.error?.code !== "UNAUTHORIZED") return;
  if (path.startsWith("/auth/")) return;
  clearSession();
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

function accessTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return Boolean(exp && exp * 1000 <= Date.now() + 15_000);
  } catch {
    return false;
  }
}

/** Exchanges the httpOnly refresh cookie for a new access token (the API rotates the cookie). */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  if (!hasSession()) {
    clearSession();
    return null;
  }

  refreshInFlight = (async () => {
    // One-time migration: a pre-cookie session still has its refresh token in storage.
    const legacyRefreshToken = localStorage.getItem(LEGACY_REFRESH_KEY);
    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...CLIENT_HEADERS },
        body: JSON.stringify(legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {}),
      });
      const body = await readApiResponse<{ accessToken: string }>(response);
      if (!body.success || !body.data?.accessToken) {
        clearSession();
        return null;
      }
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      setSession(body.data.accessToken);
      return body.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureAccessToken(): Promise<string | null> {
  if (accessToken && !accessTokenExpired(accessToken)) return accessToken;
  return refreshAccessToken();
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...CLIENT_HEADERS,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: "{}",
    });
  } catch {
    // Best-effort logout
  }
  clearSession();
}

async function authorizedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) => {
    const headers: Record<string, string> = {
      ...CLIENT_HEADERS,
      ...((options.headers as Record<string, string> | undefined) ?? {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${getApiUrl()}${path}`, { credentials: "include", ...options, headers });
  };

  try {
    const isAuthRoute = path.startsWith("/auth/");
    const token = isAuthRoute ? accessToken : await ensureAccessToken();
    const response = await send(token);
    if (response.status !== 401 || isAuthRoute || !hasSession()) return response;
    const refreshed = await refreshAccessToken();
    return refreshed ? send(refreshed) : response;
  } catch {
    throw new Error(API_UNREACHABLE);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
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
  const response = await authorizedFetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await readApiResponse<T>(response);

  if (!body.success) {
    redirectToLoginIfUnauthorized(path, body);
    throw new Error(body.error?.message ?? "Request failed");
  }

  return { data: body.data, meta: body.meta };
}

/** Download a non-JSON response (CSV export) using the admin bearer token. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const response = await authorizedFetch(path);
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
