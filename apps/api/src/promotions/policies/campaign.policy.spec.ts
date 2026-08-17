import {
  assertCampaignTransition,
  canTransition,
  isTerminalCampaignStatus,
} from "./campaign.policy";

describe("campaign policy", () => {
  it("allows the happy-path lifecycle", () => {
    expect(canTransition("scheduled", "active")).toBe(true);
    expect(canTransition("active", "ended")).toBe(true);
  });

  it("allows cancelling from scheduled or active", () => {
    expect(canTransition("scheduled", "cancelled")).toBe(true);
    expect(canTransition("active", "cancelled")).toBe(true);
    expect(() => assertCampaignTransition("scheduled", "cancelled")).not.toThrow();
  });

  it("rejects skipping states", () => {
    expect(canTransition("scheduled", "ended")).toBe(false);
    expect(() => assertCampaignTransition("scheduled", "ended")).toThrow();
  });

  it("rejects transitions out of terminal states", () => {
    expect(canTransition("ended", "active")).toBe(false);
    expect(canTransition("cancelled", "active")).toBe(false);
    expect(() => assertCampaignTransition("ended", "active")).toThrow();
    expect(() => assertCampaignTransition("cancelled", "scheduled")).toThrow();
  });

  it("identifies terminal statuses", () => {
    expect(isTerminalCampaignStatus("ended")).toBe(true);
    expect(isTerminalCampaignStatus("cancelled")).toBe(true);
    expect(isTerminalCampaignStatus("scheduled")).toBe(false);
    expect(isTerminalCampaignStatus("active")).toBe(false);
  });
});
