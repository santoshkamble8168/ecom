export const COOKIE_CONSENT_KEY = "ecom_cookie_consent";
export const CONSENT_CHANGED_EVENT = "ecom-consent-changed";

export type CookieConsent = "accepted" | "rejected";

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function writeCookieConsent(value: CookieConsent): void {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent() === "accepted";
}
