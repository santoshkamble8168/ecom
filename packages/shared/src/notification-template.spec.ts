import { ValidationError } from "./errors";
import {
  allowsNotification,
  assertRequiredVariables,
  collectTemplateVariables,
  htmlEscape,
  renderTemplate,
  sanitizePayloadPreview,
} from "./notification-template";

describe("notification template helpers", () => {
  it("renders variables and HTML-escapes interpolated values", () => {
    const body = renderTemplate("Hello {{ name }} — <b>{{ note }}</b>", { name: "Ada", note: "<script>" }, { escapeHtml: true });
    expect(body).toBe("Hello Ada — <b>&lt;script&gt;</b>");
    expect(htmlEscape(`a&b<"'>`)).toContain("&amp;");
  });

  it("collects unique variable names", () => {
    expect(collectTemplateVariables("{{orderNumber}} and {{ orderNumber }} {{otpCode}}")).toEqual([
      "orderNumber",
      "otpCode",
    ]);
  });

  it("rejects missing required variables", () => {
    expect(() => assertRequiredVariables(["otpCode"], {})).toThrow(ValidationError);
    expect(() => assertRequiredVariables(["otpCode"], { otpCode: "123456" })).not.toThrow();
  });

  it("blocks marketing without opt-in or after unsubscribe", () => {
    const optedIn = {
      emailTransactional: true,
      emailMarketing: true,
      smsTransactional: true,
      smsMarketing: false,
      unsubscribedAt: null,
    };
    expect(allowsNotification("marketing", "email", optedIn)).toBe(true);
    expect(allowsNotification("marketing", "sms", optedIn)).toBe(false);
    expect(allowsNotification("transactional", "email", null)).toBe(true);
    expect(allowsNotification("marketing", "email", { ...optedIn, unsubscribedAt: new Date() })).toBe(false);
    expect(allowsNotification("marketing", "email", null)).toBe(false);
  });

  it("redacts secrets from delivery-log previews", () => {
    const preview = sanitizePayloadPreview({ otpCode: "999111", orderNumber: "E-1" });
    expect(preview.otpCode).toBe("[redacted]");
    expect(preview.orderNumber).toBe("E-1");
  });
});
