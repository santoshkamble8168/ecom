/** Identity and access primitives shared across API, storefront, and admin. */
export type UserStatus = "active" | "suspended" | "pending_verification";

export interface UserSummary {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  status: UserStatus;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type OtpChannel = "email" | "sms";

export interface OtpRequestPayload {
  channel: OtpChannel;
  destination: string;
}

export interface OtpVerifyPayload {
  channel: OtpChannel;
  destination: string;
  code: string;
}

export const PERMISSIONS = {
  CATALOG_READ: "catalog:read",
  CATALOG_WRITE: "catalog:write",
  ORDER_READ: "order:read",
  ORDER_WRITE: "order:write",
  ADMIN_ACCESS: "admin:access",
  USER_READ: "user:read",
  USER_WRITE: "user:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
