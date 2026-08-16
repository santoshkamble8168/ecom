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
    zones.find((zone) => zone.isServiceable && zone.pincodePrefixes.includes(prefix)) ??
    zones.find((zone) => zone.isServiceable && zone.pincodePrefixes.includes("*")) ??
    null
  );
}

export function resolveShippingOptions(params: {
  pincode: string;
  methods: Array<ShippingMethod & { zones: ShippingZone[] }>;
  freeShipping: boolean;
}): ResolvedShipping[] {
  if (!/^[1-9]\d{5}$/.test(params.pincode)) {
    throw new ValidationError("Pincode must be a valid 6-digit Indian pincode");
  }

  return params.methods
    .filter((m) => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((method) => {
      const zone = matchZone(params.pincode, method.zones);
      // Standard: nationwide for any valid Indian pincode.
      // Express / others: require a matching zone.
      const nationwide = method.code === "standard";
      const serviceable =
        zone !== null || method.zones.length === 0 || (nationwide && zone === null);
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
