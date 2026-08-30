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
  // Sprint 10 — Inventory & Pricing
  INVENTORY_READ: "inventory:read",
  INVENTORY_WRITE: "inventory:write",
  PRICING_READ: "pricing:read",
  PRICING_WRITE: "pricing:write",
  PROMOTION_READ: "promotion:read",
  PROMOTION_WRITE: "promotion:write",
  // Sprint 12 — Admin operations
  DASHBOARD_READ: "dashboard:read",
  CUSTOMER_READ: "customer:read",
  CUSTOMER_WRITE: "customer:write",
  AUDIT_READ: "audit:read",
  AUDIT_EXPORT: "audit:export",
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",
  FEATURE_FLAG_READ: "feature_flag:read",
  FEATURE_FLAG_WRITE: "feature_flag:write",
  REPORT_READ: "report:read",
  REPORT_EXPORT: "report:export",
  // Sprint 13 — Notifications
  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_WRITE: "notification:write",
  // Sprint 14 — Analytics
  ANALYTICS_READ: "analytics:read",
  // Sprint 16 — Recommendations
  RECOMMENDATION_READ: "recommendation:read",
  RECOMMENDATION_WRITE: "recommendation:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
