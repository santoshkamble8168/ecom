import type { Locator, Page } from "@playwright/test";

interface CachedTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Tokens obtained from a real OTP login, keyed by account email and reused
 * across every test in this worker process. `POST /auth/otp/request` is
 * throttled server-side to 5 requests / 10 minutes per IP (see
 * `OTP_REQUEST_THROTTLE` in `apps/api/src/auth/auth.controller.ts`), and a
 * full suite logs in far more than 5 times across spec files, so we only
 * drive the real UI OTP flow once per account and reuse the resulting
 * tokens afterwards by writing them straight into `localStorage`.
 */
const tokenCache = new Map<string, CachedTokens>();

/**
 * Encapsulates the admin OTP login flow at `/login`. In development, seeded
 * demo accounts accept a fixed OTP (`DEV_DEMO_OTP`, default `123456`)
 * instead of a real one-time code — see `apps/api/src/auth/demo-accounts.ts`.
 * CMS/blog/banner admin routes are gated behind `AdminAuthGuard`, which
 * redirects to `/login` whenever no token is present in `localStorage`, so
 * specs that need real seeded data must log in first via `loginAsAdmin()`.
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
   * Reuses a cached token (see `tokenCache` above) instead of repeating the
   * OTP request/verify round trip whenever one is already available for
   * this email in the current worker process.
   */
  async loginAsAdmin(email = "admin@ecom.local", otp = "123456"): Promise<void> {
    const cached = tokenCache.get(email);
    if (cached) {
      await this.goto();
      await this.page.evaluate((tokens: CachedTokens) => {
        localStorage.setItem("ecom_admin_token", tokens.accessToken);
        localStorage.setItem("ecom_admin_refresh_token", tokens.refreshToken);
      }, cached);
      await this.page.goto("/products");
      return;
    }

    await this.goto();
    await this.emailInput.fill(email);
    await this.sendOtpButton.click();
    await this.otpInput.fill(otp);
    await this.verifyButton.click();
    await this.page.waitForURL(/\/products$/);

    const tokens = await this.page.evaluate(() => ({
      accessToken: localStorage.getItem("ecom_admin_token"),
      refreshToken: localStorage.getItem("ecom_admin_refresh_token"),
    }));
    if (tokens.accessToken && tokens.refreshToken) {
      tokenCache.set(email, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    }
  }
}
