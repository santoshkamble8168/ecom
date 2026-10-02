import type { BrowserContext, Cookie, Locator, Page } from "@playwright/test";

const REFRESH_COOKIE = "ecom_rt_admin";
const SESSION_HINT_KEY = "ecom_admin_session";

/**
 * Refresh cookies obtained from a real OTP login, keyed by account email and
 * reused across every test in this worker process. `POST /auth/otp/request`
 * is throttled server-side to 5 requests / 10 minutes per IP (see
 * `OTP_REQUEST_THROTTLE` in `apps/api/src/auth/auth.controller.ts`), and a
 * full suite logs in far more than 5 times across spec files, so we only
 * drive the real UI OTP flow once per account and reuse the session after.
 *
 * The refresh token lives in an httpOnly cookie and is rotated (the old one
 * revoked) on every `/auth/refresh`, so the cache follows each rotation the
 * browser performs instead of holding a snapshot.
 */
const cookieCache = new Map<string, Cookie>();

/**
 * Encapsulates the admin OTP login flow at `/login`. In development, seeded
 * demo accounts accept a fixed OTP (`DEV_DEMO_OTP`, default `123456`)
 * instead of a real one-time code — see `apps/api/src/auth/demo-accounts.ts`.
 * CMS/blog/banner admin routes are gated behind `AdminAuthGuard`, which
 * redirects to `/login` when the refresh cookie cannot restore a session,
 * so specs that need real seeded data must log in first via `loginAsAdmin()`.
 */
export class AdminLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly otpInput: Locator;
  readonly sendOtpButton: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // The email field has no accessible label in the app; it's the only
    // textbox present before the OTP step appears.
    this.emailInput = page.getByRole("textbox").first();
    this.otpInput = page.getByPlaceholder("6-digit OTP");
    this.sendOtpButton = page.getByRole("button", { name: "Send OTP" });
    this.verifyButton = page.getByRole("button", { name: "Verify & Login" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Logs in as a seeded demo account and waits for the post-login redirect.
   * Reuses the cached refresh cookie (see `cookieCache` above) instead of
   * repeating the OTP request/verify round trip whenever it is still valid.
   */
  async loginAsAdmin(email = "admin@ecom.local", otp = "123456"): Promise<void> {
    const context = this.page.context();
    trackRefreshCookie(context, email);

    const cached = cookieCache.get(email);
    if (cached) {
      await context.addCookies([cached]);
      await this.goto();
      await this.page.evaluate((key) => localStorage.setItem(key, "1"), SESSION_HINT_KEY);
      const refreshed = this.page.waitForResponse((r) => new URL(r.url()).pathname.endsWith("/auth/refresh"));
      await this.page.goto("/");
      if ((await refreshed).ok()) return;
      cookieCache.delete(email);
    }

    await this.goto();
    await this.emailInput.fill(email);
    await this.sendOtpButton.click();
    await this.otpInput.fill(otp);
    await this.verifyButton.click();
    await this.page.waitForURL((url) => new URL(url).pathname === "/");
  }
}

const trackedContexts = new WeakSet<BrowserContext>();

function trackRefreshCookie(context: BrowserContext, email: string): void {
  if (trackedContexts.has(context)) return;
  trackedContexts.add(context);
  context.on("requestfinished", (request) => {
    if (!/\/auth\/(refresh|otp\/verify)$/.test(new URL(request.url()).pathname)) return;
    void context
      .cookies()
      .then((cookies) => {
        const cookie = cookies.find((c) => c.name === REFRESH_COOKIE);
        if (cookie) cookieCache.set(email, cookie);
      })
      .catch(() => undefined);
  });
}
