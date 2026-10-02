import type { CookieOptions, Request, Response } from "express";

/**
 * Browser apps identify themselves with this header to opt into cookie-held
 * refresh tokens. Being a custom header, it also forces a CORS preflight for
 * cross-origin callers, so a third-party page cannot drive refresh/logout
 * with the victim's cookie.
 */
export const AUTH_CLIENT_HEADER = "x-ecom-client";

const COOKIE_NAMES = {
  storefront: "ecom_rt_storefront",
  admin: "ecom_rt_admin",
} as const;

/** Storefront and admin share a host in development (cookies ignore ports), so each gets its own cookie. */
export type AuthClient = keyof typeof COOKIE_NAMES;

export const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function authClientFrom(request: Request): AuthClient | null {
  const value = request.headers[AUTH_CLIENT_HEADER];
  const client = Array.isArray(value) ? value[0] : value;
  return client === "storefront" || client === "admin" ? client : null;
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}

export function readRefreshCookie(request: Request, client: AuthClient): string | undefined {
  return readCookie(request, COOKIE_NAMES[client]);
}

function cookieOptions(): CookieOptions {
  const sameSite = (process.env.AUTH_COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none";
  const secure =
    process.env.AUTH_COOKIE_SECURE !== undefined
      ? process.env.AUTH_COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production" || sameSite === "none";
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: `/${(process.env.API_PREFIX ?? "api/v1").replace(/^\/+|\/+$/g, "")}/auth`,
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(response: Response, client: AuthClient, refreshToken: string): void {
  response.cookie(COOKIE_NAMES[client], refreshToken, {
    ...cookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export function clearRefreshCookie(response: Response, client: AuthClient): void {
  response.clearCookie(COOKIE_NAMES[client], cookieOptions());
}
