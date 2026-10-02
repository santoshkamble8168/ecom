import { getApiUrl } from "@/lib/api-url";
import type { ApiResponse } from "@ecom/types";

const API_URL = getApiUrl();
/** Not a credential: only tells a fresh page load that a refresh cookie was issued and is worth trying. */
const SESSION_HINT_KEY = "ecom_storefront_session";
const LEGACY_TOKEN_KEY = "ecom_storefront_token";
const LEGACY_REFRESH_TOKEN_KEY = "ecom_storefront_refresh_token";
const CLIENT_HEADERS = { "X-Ecom-Client": "storefront" } as const;

let accessToken: string | null = null;

/** In-memory access token. `null` until a login or a cookie refresh has completed in this tab. */
export function getToken(): string | null {
  return accessToken;
}

/** Synchronous "signed in" check for UI. True while a cookie refresh is still pending on page load. */
export function hasSession(): boolean {
  if (accessToken) return true;
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(SESSION_HINT_KEY) === "1" || Boolean(localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY))
  );
}

function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("auth-changed"));
}

/** Call with the `accessToken` returned by a login endpoint; the API has already set the refresh cookie. */
export function setSession(token: string): void {
  accessToken = token;
  localStorage.setItem(SESSION_HINT_KEY, "1");
  notifyAuthChanged();
}

export function clearSession(): void {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_HINT_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  }
  notifyAuthChanged();
}

export async function signOut(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
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
    // The local session still ends if the server call fails.
  }
  clearSession();
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

/** Exchanges the httpOnly refresh cookie for a new access token (the API rotates the cookie). */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  if (!hasSession()) return null;

  refreshInFlight = (async () => {
    const legacyRefreshToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...CLIENT_HEADERS },
        body: JSON.stringify(legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {}),
      });
      const body = (await response.json()) as ApiResponse<{ accessToken: string }>;
      if (!body.success || !body.data?.accessToken) {
        clearSession();
        return null;
      }
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

export async function authHeaders(): Promise<HeadersInit> {
  const token = await ensureAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  if (!retried) await ensureAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...CLIENT_HEADERS,
    ...(options.headers ?? {}),
  };
  if (accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, { credentials: "include", ...options, headers });
  const body = (await response.json()) as ApiResponse<T>;

  if (response.status === 401 && !retried && hasSession()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch(path, options, true);
  }

  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }

  return body.data;
}
