/** Admin dashboard, customers, audit, flags, settings, and reports. */

export type FeatureFlagEnvironment = "all" | "development" | "test" | "production";

export type ReportKind =
  | "sales"
  | "inventory"
  | "taxes"
  | "customer_retention"
  | "product_performance"
  | "category_performance"
  | "search"
  | "coupons"
  | "campaigns";

export type ExportJobStatus = "queued" | "running" | "completed" | "failed";

export interface DashboardKpi {
  key: string;
  label: string;
  value: string;
  /** Short definition so operators know what the number means. */
  definition: string;
  deltaLabel?: string;
  tone?: "neutral" | "warning" | "danger" | "success";
}

export interface DashboardChartPoint {
  date: string;
  value: number;
}

export interface DashboardChart {
  key: string;
  label: string;
  unit?: string;
  points: DashboardChartPoint[];
}

export interface DashboardAlert {
  key: string;
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
  href?: string;
}

export interface DashboardActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  range: { from: string; to: string };
  kpis: DashboardKpi[];
  charts: DashboardChart[];
  alerts: DashboardAlert[];
  activity: DashboardActivityItem[];
}

export interface AdminCustomerListItem {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  status: "active" | "suspended" | "pending_verification";
  orderCount: number;
  lifetimeValue: string;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface AdminCustomerListResult {
  customers: AdminCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerSupportNote {
  id: string;
  body: string;
  authorId: string;
  authorEmail: string | null;
  createdAt: string;
}

export interface CustomerTimelineEvent {
  id: string;
  kind: "order" | "return" | "review" | "note" | "status" | "audit";
  title: string;
  detail?: string;
  createdAt: string;
}

export interface AdminCustomerDetail {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  status: "active" | "suspended" | "pending_verification";
  createdAt: string;
  profile: { preferences: Record<string, unknown> };
  addresses: Array<{
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
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    createdAt: string;
  }>;
  returns: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
  reviews: Array<{
    id: string;
    productId: string;
    rating: number;
    title: string | null;
    status: string;
    createdAt: string;
  }>;
  loyaltyPoints: number;
  notes: CustomerSupportNote[];
  timeline: CustomerTimelineEvent[];
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  correlationId: string | null;
  ipAddress: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuditLogListResult {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FeatureFlagRecord {
  id: string;
  key: string;
  isEnabled: boolean;
  description: string | null;
  environment: FeatureFlagEnvironment;
  rolloutPercent: number;
  updatedAt: string;
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface ReportDefinitionSummary {
  id: string;
  slug: string;
  name: string;
  kind: ReportKind;
  description: string | null;
}

export interface ExportJobSummary {
  id: string;
  reportId: string;
  reportSlug: string;
  status: ExportJobStatus;
  format: string;
  rowCount: number | null;
  filePath: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface SavedViewRecord {
  id: string;
  entity: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
}
