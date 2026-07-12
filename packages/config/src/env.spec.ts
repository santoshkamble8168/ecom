import { validateApiEnv } from "./env";

const VALID_ENV: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgresql://ecom:ecom@localhost:5432/ecom?schema=public",
  JWT_ACCESS_SECRET: "access-secret-min-16-chars",
  JWT_REFRESH_SECRET: "refresh-secret-min-16-chars",
};

describe("validateApiEnv", () => {
  it("applies defaults for optional values when only required fields are provided", () => {
    const env = validateApiEnv(VALID_ENV);

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(4000);
    expect(env.API_PREFIX).toBe("api/v1");
    expect(env.REDIS_HOST).toBe("localhost");
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("coerces numeric string values", () => {
    const env = validateApiEnv({ ...VALID_ENV, PORT: "5000", REDIS_PORT: "6380" });

    expect(env.PORT).toBe(5000);
    expect(env.REDIS_PORT).toBe(6380);
  });

  it("throws a descriptive error when required fields are missing", () => {
    expect(() => validateApiEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateApiEnv({})).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => validateApiEnv({})).toThrow(/JWT_REFRESH_SECRET/);
  });

  it("rejects JWT secrets shorter than 16 characters", () => {
    expect(() =>
      validateApiEnv({ ...VALID_ENV, JWT_ACCESS_SECRET: "too-short" }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects an invalid NODE_ENV value", () => {
    expect(() => validateApiEnv({ ...VALID_ENV, NODE_ENV: "staging" })).toThrow();
  });

  it("rejects a malformed DATABASE_URL", () => {
    expect(() => validateApiEnv({ ...VALID_ENV, DATABASE_URL: "not-a-url" })).toThrow(
      /DATABASE_URL/,
    );
  });
});
