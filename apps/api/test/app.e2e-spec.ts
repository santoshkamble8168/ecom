import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "../src/common/interceptors/response.interceptor";

/**
 * Boots the real Nest application (real Postgres + Redis, no mocks) to
 * verify health, dependency wiring, response envelopes, and OpenAPI
 * generation end-to-end. Requires `DATABASE_URL` and `REDIS_HOST` to point
 * at reachable services (see docker-compose or the CI service containers).
 */
async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api/v1", { exclude: ["health", "health/live", "health/ready"] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.init();
  return app;
}

describe("API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns ok without hitting any dependency", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: "ok" }),
      }),
    );
  });

  it("GET /health/ready confirms both the database and redis connections are live", async () => {
    const response = await request(app.getHttpServer()).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: { status: "ok", checks: { database: "ok", redis: "ok" } },
      }),
    );
  });

  it("wraps successful responses in the standard success envelope", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/otp/request")
      .send({ channel: "email", destination: "e2e-test@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: { expiresInSeconds: 600 },
        requestId: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
  });

  it("wraps validation failures in the standard error envelope", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/otp/request")
      .send({ channel: "carrier-pigeon", destination: "x" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "VALIDATION_FAILED" }),
        requestId: expect.any(String),
      }),
    );
  });

  it("generates a valid OpenAPI document covering the health and auth endpoints", () => {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Ecom API")
      .setDescription("Production commerce platform API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document.info.title).toBe("Ecom API");
    expect(document.paths).toHaveProperty("/health");
    expect(document.paths).toHaveProperty("/api/v1/auth/otp/request");
    expect(document.paths).toHaveProperty("/api/v1/auth/otp/verify");
    expect(document.paths).toHaveProperty("/api/v1/auth/refresh");
  });
});

describe("API (e2e) - rate limiting", () => {
  // Runs against its own app instance so the in-memory throttler storage
  // isn't polluted by requests made in the suite above.
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("throttles repeated OTP requests from the same client beyond the configured limit", async () => {
    const destination = "throttle-test@example.com";

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/otp/request")
        .send({ channel: "email", destination });
      expect(response.status).toBe(200);
    }

    const sixthResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/otp/request")
      .send({ channel: "email", destination });

    expect(sixthResponse.status).toBe(429);
    expect(sixthResponse.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "RATE_LIMITED" }),
      }),
    );
  });
});
