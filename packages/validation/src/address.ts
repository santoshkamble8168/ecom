/** Indian address helpers shared by API validation and storefront checkout. */

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

/** First-2-digit pincode prefix → city/state for autofill. */
const PINCODE_PREFIX_LOOKUP: Record<string, { city: string; state: IndianState }> = {
  "11": { city: "New Delhi", state: "Delhi" },
  "12": { city: "Gurugram", state: "Haryana" },
  "13": { city: "Faridabad", state: "Haryana" },
  "14": { city: "Chandigarh", state: "Chandigarh" },
  "16": { city: "Shimla", state: "Himachal Pradesh" },
  "18": { city: "Jammu", state: "Jammu and Kashmir" },
  "20": { city: "Meerut", state: "Uttar Pradesh" },
  "22": { city: "Lucknow", state: "Uttar Pradesh" },
  "24": { city: "Agra", state: "Uttar Pradesh" },
  "30": { city: "Jaipur", state: "Rajasthan" },
  "32": { city: "Udaipur", state: "Rajasthan" },
  "36": { city: "Ahmedabad", state: "Gujarat" },
  "38": { city: "Vadodara", state: "Gujarat" },
  "40": { city: "Mumbai", state: "Maharashtra" },
  "41": { city: "Pune", state: "Maharashtra" },
  "44": { city: "Nagpur", state: "Maharashtra" },
  "50": { city: "Hyderabad", state: "Telangana" },
  "52": { city: "Vijayawada", state: "Andhra Pradesh" },
  "56": { city: "Bengaluru", state: "Karnataka" },
  "57": { city: "Mysuru", state: "Karnataka" },
  "60": { city: "Chennai", state: "Tamil Nadu" },
  "64": { city: "Coimbatore", state: "Tamil Nadu" },
  "67": { city: "Kochi", state: "Kerala" },
  "70": { city: "Kolkata", state: "West Bengal" },
  "75": { city: "Bhubaneswar", state: "Odisha" },
  "78": { city: "Guwahati", state: "Assam" },
  "80": { city: "Patna", state: "Bihar" },
  "83": { city: "Ranchi", state: "Jharkhand" },
  "46": { city: "Bhopal", state: "Madhya Pradesh" },
  "45": { city: "Indore", state: "Madhya Pradesh" },
};

/** Exact pincode overrides for common demo/test codes. */
const EXACT_PINCODE_LOOKUP: Record<string, { city: string; state: IndianState }> = {
  "110001": { city: "New Delhi", state: "Delhi" },
  "110016": { city: "New Delhi", state: "Delhi" },
  "122001": { city: "Gurugram", state: "Haryana" },
  "400001": { city: "Mumbai", state: "Maharashtra" },
  "400050": { city: "Mumbai", state: "Maharashtra" },
  "411001": { city: "Pune", state: "Maharashtra" },
  "560001": { city: "Bengaluru", state: "Karnataka" },
  "560034": { city: "Bengaluru", state: "Karnataka" },
  "600001": { city: "Chennai", state: "Tamil Nadu" },
  "500001": { city: "Hyderabad", state: "Telangana" },
  "700001": { city: "Kolkata", state: "West Bengal" },
  "302001": { city: "Jaipur", state: "Rajasthan" },
  "380001": { city: "Ahmedabad", state: "Gujarat" },
};

export interface PincodeLookupResult {
  pincode: string;
  valid: boolean;
  city: string | null;
  state: IndianState | null;
  serviceable: boolean;
  message: string;
}

export interface AddressValidationIssue {
  field: string;
  message: string;
}

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const INDIAN_PINCODE = /^[1-9]\d{5}$/;

export function isValidIndianPhone(phone: string): boolean {
  return INDIAN_MOBILE.test(phone.trim());
}

export function isValidIndianPincode(pincode: string): boolean {
  return INDIAN_PINCODE.test(pincode.trim());
}

export function isValidIndianState(state: string): boolean {
  const normalized = state.trim().toLowerCase();
  return INDIAN_STATES.some((s) => s.toLowerCase() === normalized);
}

export function normalizeIndianState(state: string): IndianState | null {
  const normalized = state.trim().toLowerCase();
  return INDIAN_STATES.find((s) => s.toLowerCase() === normalized) ?? null;
}

export function lookupPincode(pincode: string): PincodeLookupResult {
  const code = pincode.trim();
  if (!isValidIndianPincode(code)) {
    return {
      pincode: code,
      valid: false,
      city: null,
      state: null,
      serviceable: false,
      message: "Enter a valid 6-digit Indian pincode",
    };
  }

  const exact = EXACT_PINCODE_LOOKUP[code];
  const byPrefix = PINCODE_PREFIX_LOOKUP[code.slice(0, 2)];
  const match = exact ?? byPrefix;

  if (!match) {
    return {
      pincode: code,
      valid: true,
      city: null,
      state: null,
      serviceable: true,
      message: "Pincode accepted — please enter city and state",
    };
  }

  return {
    pincode: code,
    valid: true,
    city: match.city,
    state: match.state,
    serviceable: true,
    message: `Delivering to ${match.city}, ${match.state}`,
  };
}

export function validateCheckoutAddress(input: {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): AddressValidationIssue[] {
  const issues: AddressValidationIssue[] = [];
  const fullName = input.fullName?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const line1 = input.line1?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const state = input.state?.trim() ?? "";
  const postalCode = input.postalCode?.trim() ?? "";

  if (fullName.length < 2) issues.push({ field: "fullName", message: "Enter your full name" });
  if (!isValidIndianPhone(phone)) {
    issues.push({ field: "phone", message: "Enter a valid 10-digit mobile number" });
  }
  if (line1.length < 5) {
    issues.push({ field: "line1", message: "Enter a complete address (min 5 characters)" });
  }
  if (!isValidIndianPincode(postalCode)) {
    issues.push({ field: "postalCode", message: "Enter a valid 6-digit pincode" });
  }
  if (city.length < 2) issues.push({ field: "city", message: "Enter city" });
  if (!isValidIndianState(state)) {
    issues.push({ field: "state", message: "Select a valid Indian state / UT" });
  }

  const lookup = lookupPincode(postalCode);
  if (lookup.valid && lookup.state && isValidIndianState(state)) {
    const normalized = normalizeIndianState(state);
    if (normalized && lookup.state !== normalized) {
      // Soft mismatch — allow but warn via city suggestion only; don't hard-fail
      // if user corrected city. Hard-fail only when state is completely invalid (above).
    }
  }

  return issues;
}
