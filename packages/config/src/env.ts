import { z } from "zod";

/**
 * Canonical environment schema for the `api` service. Every backend
 * config value is validated at boot so misconfiguration fails fast
 * instead of surfacing as a runtime error deep in a request.
 */
export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("api/v1"),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string().default("30d"),

  // Refresh-token cookie for browser apps. Use `none` only when the API is on a
  // different site from storefront/admin (requires HTTPS).
  AUTH_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  MEILISEARCH_HOST: z.string().url().default("http://localhost:7700"),
  MEILISEARCH_API_KEY: z.string().optional(),

  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().default("ecom-assets"),
  MINIO_USE_SSL: z.enum(["true", "false"]).default("false"),
  MEDIA_MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  MEDIA_MAX_VIDEO_BYTES: z.coerce.number().int().positive().default(100 * 1024 * 1024),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  STOREFRONT_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_URL: z.string().url().default("http://localhost:3001"),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Sprint 12 — admin dashboard, exports, audit, feature flags
  REPORT_RETENTION_DAYS: z.coerce.number().int().positive().default(14),
  DASHBOARD_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  FEATURE_FLAG_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),

  // Sprint 13 — notifications
  SMTP_FROM: z.string().default("ECOM <noreply@ecom.local>"),
  SMS_PROVIDER: z.enum(["mock", "disabled"]).default("mock"),
  NOTIFICATION_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(5),
  NOTIFICATION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  NOTIFICATION_BACKOFF_MS: z.coerce.number().int().positive().default(2000),
  NOTIFICATION_DLQ_RETENTION_DAYS: z.coerce.number().int().positive().default(14),
  UNSUBSCRIBE_URL: z.string().url().default("http://localhost:3000/account"),
  NOTIFICATION_OPS_EMAIL: z.string().email().default("ops@ecom.local"),

  // Sprint 14 — analytics
  ANALYTICS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  ANALYTICS_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1),
  ANALYTICS_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  ANALYTICS_DEBUG: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // Sprint 16 — recommendations / personalization / semantic readiness
  RECOMMENDATION_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  PERSONALIZATION_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  SEMANTIC_SEARCH_PROVIDER: z.enum(["none"]).default("none"),

  CMS_PREVIEW_TOKEN: z.string().optional(),
  SWAGGER_ENABLED: z.enum(["true", "false"]).optional(),

  // Payments — mock is local development only. Production must be test or live.
  RAZORPAY_MODE: z.enum(["mock", "test", "live"]).default("mock"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
}).superRefine((env, ctx) => {
  const liveMode = env.RAZORPAY_MODE === "test" || env.RAZORPAY_MODE === "live";
  const production = env.NODE_ENV === "production";
  if (production && !liveMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["RAZORPAY_MODE"],
      message: "Production requires RAZORPAY_MODE=test or live",
    });
  }
  if (production || liveMode) {
    for (const key of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"] as const) {
      const value = env[key]?.trim() ?? "";
      if (value.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Required in production and whenever RAZORPAY_MODE is test or live",
        });
      }
    }
  }
  if (production && (env.CMS_PREVIEW_TOKEN?.trim().length ?? 0) < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CMS_PREVIEW_TOKEN"],
      message: "A high-entropy CMS preview token is required in production",
    });
  }
  if (production) {
    for (const key of ["MINIO_ACCESS_KEY", "MINIO_SECRET_KEY"] as const) {
      if ((env[key]?.trim().length ?? 0) < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Object storage credentials are required in production",
        });
      }
    }
  }
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = apiEnvSchema.safeParse(source);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
}
