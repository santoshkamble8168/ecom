import { sendSms } from "./sms.adapter";

describe("sendSms", () => {
  const original = process.env.SMS_PROVIDER;

  afterEach(() => {
    process.env.SMS_PROVIDER = original;
  });

  it("skips when the provider is disabled", async () => {
    process.env.SMS_PROVIDER = "disabled";
    const result = await sendSms("+91111", "hello");
    expect(result.status).toBe("skipped");
  });

  it("mocks a send by default", async () => {
    process.env.SMS_PROVIDER = "mock";
    const result = await sendSms("+91111", "hello");
    expect(result.status).toBe("sent");
    expect(result.providerMessageId).toMatch(/^mock-sms-/);
  });
});
