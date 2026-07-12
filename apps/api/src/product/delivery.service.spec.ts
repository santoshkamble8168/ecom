import { ValidationError } from "@ecom/shared";

import { DeliveryService } from "./delivery.service";

describe("DeliveryService", () => {
  const service = new DeliveryService();

  it("returns metro delivery estimate for Bangalore pincode", () => {
    const result = service.estimate("560001");
    expect(result.estimatedDaysMin).toBe(2);
    expect(result.codAvailable).toBe(true);
  });

  it("throws for invalid pincode", () => {
    expect(() => service.estimate("abc")).toThrow(ValidationError);
  });
});
