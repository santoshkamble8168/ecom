import {
  assertCancellable,
  assertExchangeEligible,
  assertReturnEligible,
  assertTransition,
  canTransition,
  generateInvoiceNumber,
  isCancellable,
  isReturnEligible,
  returnWindowEndsAt,
} from "./order-state-machine";

describe("order state machine", () => {
  it("allows the happy-path lifecycle", () => {
    expect(canTransition("pending_payment", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "processing")).toBe(true);
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
    expect(canTransition("delivered", "return_requested")).toBe(true);
    expect(canTransition("return_requested", "returned")).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransition("confirmed", "delivered")).toBe(false);
    expect(() => assertTransition("confirmed", "shipped")).toThrow();
  });

  it("rejects transitions out of terminal states", () => {
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("returned", "delivered")).toBe(false);
  });

  it("allows cancellation before shipping only", () => {
    expect(isCancellable("pending_payment")).toBe(true);
    expect(isCancellable("confirmed")).toBe(true);
    expect(isCancellable("processing")).toBe(true);
    expect(isCancellable("shipped")).toBe(false);
    expect(isCancellable("delivered")).toBe(false);
    expect(() => assertCancellable("shipped")).toThrow();
  });

  it("allows returns only for delivered orders within the return window", () => {
    const deliveredAt = new Date("2026-01-01T00:00:00Z");
    const withinWindow = new Date("2026-01-05T00:00:00Z");
    const outsideWindow = new Date("2026-02-01T00:00:00Z");

    expect(isReturnEligible("delivered", deliveredAt, withinWindow)).toBe(true);
    expect(isReturnEligible("delivered", deliveredAt, outsideWindow)).toBe(false);
    expect(isReturnEligible("shipped", deliveredAt, withinWindow)).toBe(false);

    expect(() => assertReturnEligible("delivered", deliveredAt, outsideWindow)).toThrow();
    expect(() => assertReturnEligible("delivered", null, withinWindow)).toThrow();
  });

  it("allows exchanges only for delivered orders within the exchange window", () => {
    const deliveredAt = new Date("2026-01-01T00:00:00Z");
    const withinWindow = new Date("2026-01-05T00:00:00Z");
    const outsideWindow = new Date("2026-02-01T00:00:00Z");

    expect(() => assertExchangeEligible("delivered", deliveredAt, withinWindow)).not.toThrow();
    expect(() => assertExchangeEligible("delivered", deliveredAt, outsideWindow)).toThrow();
    expect(() => assertExchangeEligible("confirmed", deliveredAt, withinWindow)).toThrow();
  });

  it("computes the return window end date", () => {
    const deliveredAt = new Date("2026-01-01T00:00:00Z");
    const end = returnWindowEndsAt(deliveredAt);
    expect(end?.toISOString()).toBe(new Date("2026-01-08T00:00:00Z").toISOString());
    expect(returnWindowEndsAt(null)).toBeNull();
  });

  it("generates invoice numbers from order numbers", () => {
    expect(generateInvoiceNumber("ECO260101123456")).toBe("INV-260101123456");
  });
});
