import {
  assertPurchaseOrderTransition,
  canTransitionPurchaseOrder,
  generatePoNumber,
  isTerminalPurchaseOrderStatus,
  nextPurchaseOrderStatusAfterReceipt,
} from "./purchase-order.policy";

describe("purchase order policy", () => {
  it("allows the happy-path lifecycle", () => {
    expect(canTransitionPurchaseOrder("draft", "ordered")).toBe(true);
    expect(canTransitionPurchaseOrder("ordered", "partially_received")).toBe(true);
    expect(canTransitionPurchaseOrder("ordered", "received")).toBe(true);
    expect(canTransitionPurchaseOrder("partially_received", "received")).toBe(true);
  });

  it("rejects skipping straight from draft to received", () => {
    expect(canTransitionPurchaseOrder("draft", "received")).toBe(false);
    expect(() => assertPurchaseOrderTransition("draft", "received")).toThrow();
  });

  it("allows cancelling from any non-terminal status", () => {
    expect(canTransitionPurchaseOrder("draft", "cancelled")).toBe(true);
    expect(canTransitionPurchaseOrder("ordered", "cancelled")).toBe(true);
    expect(canTransitionPurchaseOrder("partially_received", "cancelled")).toBe(true);
  });

  it("rejects transitions out of terminal statuses", () => {
    expect(canTransitionPurchaseOrder("received", "cancelled")).toBe(false);
    expect(canTransitionPurchaseOrder("cancelled", "draft")).toBe(false);
    expect(isTerminalPurchaseOrderStatus("received")).toBe(true);
    expect(isTerminalPurchaseOrderStatus("cancelled")).toBe(true);
    expect(isTerminalPurchaseOrderStatus("ordered")).toBe(false);
  });

  describe("nextPurchaseOrderStatusAfterReceipt", () => {
    it("stays partially_received when some items are short", () => {
      const status = nextPurchaseOrderStatusAfterReceipt([
        { quantityOrdered: 10, quantityReceived: 10 },
        { quantityOrdered: 5, quantityReceived: 2 },
      ]);
      expect(status).toBe("partially_received");
    });

    it("moves to received once every item is fully received", () => {
      const status = nextPurchaseOrderStatusAfterReceipt([
        { quantityOrdered: 10, quantityReceived: 10 },
        { quantityOrdered: 5, quantityReceived: 5 },
      ]);
      expect(status).toBe("received");
    });
  });

  it("generates PO numbers with a PO prefix", () => {
    expect(generatePoNumber(new Date("2026-08-17T00:00:00Z"))).toMatch(/^PO2608\d{6}$/);
  });
});
