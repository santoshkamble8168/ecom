import type { ShippingMethod, ShippingZone } from "@prisma/client";
import { ValidationError } from "@ecom/shared";

export interface ResolvedShipping {
  code: string;
  label: string;
  fee: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  serviceable: boolean;
}

export function matchZone(pincode: string, zones: ShippingZone[]): ShippingZone | null {
  const prefix = pincode.slice(0, 2);
  return (
    zones.find((zone) => zone.isServiceable && zone.pincodePrefixes.includes(prefix)) ?? null
  );
}

export function resolveShippingOptions(params: {
  pincode: string;
  methods: Array<ShippingMethod & { zones: ShippingZone[] }>;
  freeShipping: boolean;
}): ResolvedShipping[] {
  if (!/^\d{6}$/.test(params.pincode)) {
    throw new ValidationError("Pincode must be 6 digits");
  }

  return params.methods
    .filter((m) => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((method) => {
      const zone = matchZone(params.pincode, method.zones);
      const serviceable = zone !== null || method.zones.length === 0;
      const baseFee = zone?.feeOverride != null ? Number(zone.feeOverride) : Number(method.baseFee);
      const fee = params.freeShipping ? 0 : baseFee;

      return {
        code: method.code,
        label: method.label,
        fee,
        estimatedDaysMin: method.estimatedDaysMin,
        estimatedDaysMax: method.estimatedDaysMax,
        serviceable,
      };
    })
    .filter((option) => option.serviceable);
}

export function selectShippingOption(
  options: ResolvedShipping[],
  code: string,
): ResolvedShipping {
  const selected = options.find((o) => o.code === code);
  if (!selected) {
    throw new ValidationError("Selected shipping method is not available for this pincode");
  }
  if (!selected.serviceable) {
    throw new ValidationError("Delivery is not serviceable for this pincode");
  }
  return selected;
}
