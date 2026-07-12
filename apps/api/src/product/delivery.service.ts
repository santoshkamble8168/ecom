import type { DeliveryEstimate } from "@ecom/types";
import { ValidationError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DeliveryService {
  estimate(pincode: string, productSlug?: string): DeliveryEstimate {
    if (!/^\d{6}$/.test(pincode)) {
      throw new ValidationError("Pincode must be 6 digits");
    }

    const metroPrefixes = ["11", "12", "40", "41", "50", "56", "60", "70"];
    const prefix = pincode.slice(0, 2);
    const isMetro = metroPrefixes.includes(prefix);

    return {
      pincode,
      estimatedDaysMin: isMetro ? 2 : 4,
      estimatedDaysMax: isMetro ? 4 : 7,
      codAvailable: true,
      freeShippingEligible: true,
      message: isMetro
        ? `Delivery to ${pincode} in ${isMetro ? "2–4" : "4–7"} business days${productSlug ? "" : ""}.`
        : `Standard delivery to ${pincode} in 4–7 business days.`,
    };
  }
}
