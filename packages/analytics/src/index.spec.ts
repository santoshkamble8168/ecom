import { configureAnalytics, isAnalyticsDebug, track } from "./index";

describe("analytics client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    configureAnalytics({ enabled: true, debug: false, endpoint: "/api/v1/analytics/events" });
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { pathname: "/" },
        localStorage: {
          getItem: jest.fn().mockReturnValue("sess-1"),
          setItem: jest.fn(),
        },
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "11111111-1111-4111-8111-111111111111" },
      configurable: true,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("posts a fire-and-forget ingest payload", () => {
    track("page_view", { campaign: "home" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/analytics/events",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      }),
    );
  });

  it("skips when disabled", () => {
    configureAnalytics({ enabled: false });
    track("page_view");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("treats localStorage flag as debug", () => {
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      key === "ecom_analytics_debug" ? "1" : "sess-1",
    );
    expect(isAnalyticsDebug()).toBe(true);
  });
});
