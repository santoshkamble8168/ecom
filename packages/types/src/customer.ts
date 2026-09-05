import type { Permission, UserSummary } from "./identity";

/** Customer profile and address types shared across API, storefront, and admin. */

export interface CustomerPreferences {
  newsletter?: boolean;
  smsAlerts?: boolean;
  sizePreference?: string;
}

export interface CustomerProfile {
  preferences: CustomerPreferences;
}

export interface CustomerAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends UserSummary {
  profile: CustomerProfile;
  /** Permission keys from the user's roles. Empty for shoppers without admin roles. */
  permissions: Permission[];
}

export interface AdminUserSummary extends UserSummary {
  createdAt: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  permissionKeys: string[];
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status:
    | "pending_payment"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "return_requested"
    | "returned"
    | "exchange_requested"
    | "exchanged"
    | "cancelled"
    | "failed";
  total: string;
  currency: string;
  paymentMethod: "razorpay" | "cod";
  paymentStatus: string | null;
  itemCount: number;
  confirmedAt: string | null;
  createdAt: string;
}
