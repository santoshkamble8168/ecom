import type { UserSummary } from "./identity";

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
