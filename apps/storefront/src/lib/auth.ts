import { getApiUrl } from "@/lib/api-url";
import type { ApiResponse } from "@ecom/types";

const API_URL = getApiUrl();
const TOKEN_KEY = "ecom_storefront_token";
const REFRESH_TOKEN_KEY = "ecom_storefront_refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("auth-changed"));
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  notifyAuthChanged();
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChanged();
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyAuthChanged();
}

export async function signOut(): Promise<void> {
  const refreshToken = getRefreshToken();
  const token = getToken();
  if (refreshToken && token) {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // The local session still ends if the server call fails.
    }
  }
  clearToken();
}

type JwtPayload = { email?: string; roles?: string[]; exp?: number };

let refreshInFlight: Promise<string | null> | null = null;

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as JwtPayload;
  } catch {
    return null;
  }
}

function accessTokenExpired(token: string): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  if (!exp) return false;
  return exp * 1000 <= Date.now() + 15_000;
}

/** Access tokens last 15 minutes. A stored token still means "signed in" in the UI, so renew it before protected calls. */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    if (getToken()) clearToken();
    return null;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await response.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
      if (!body.success || !body.data?.accessToken || !body.data.refreshToken) {
        clearToken();
        return null;
      }
      setTokens(body.data.accessToken, body.data.refreshToken);
      return body.data.accessToken;
    } catch {
      clearToken();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureAccessToken(): Promise<string | null> {
  const token = getToken();
  if (token && !accessTokenExpired(token)) return token;
  if (!token && !getRefreshToken()) return null;
  return refreshAccessToken();
}

export async function authHeaders(): Promise<HeadersInit> {
  const token = await ensureAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  if (!retried) await ensureAccessToken();
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

  if (response.status === 401 && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch(path, options, true);
  }

  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }

  return body.data;
}
