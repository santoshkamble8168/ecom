import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AppLogger } from "./logger/logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = await app.resolve(AppLogger);
  logger.setContext("Bootstrap");
  app.useLogger(logger);

  app.use(
    helmet({
      // Allow storefront (different origin) to read API responses in the browser.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // Development: reflect any Origin so localhost/127.0.0.1 never fail CORS.
  // Production: allow only configured storefront/admin URLs.
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";
  const configuredOrigins = [
    process.env.STOREFRONT_URL,
    process.env.ADMIN_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ].filter((value): value is string => Boolean(value));

  app.enableCors({
    origin: isDev
      ? true
      : (origin, callback) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          const normalized = origin.replace(/\/$/, "");
          const allowed = configuredOrigins.some((o) => o.replace(/\/$/, "") === normalized);
          callback(null, allowed ? normalized : false);
        },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["X-Request-Id"],
  });

  const apiPrefix = process.env.API_PREFIX ?? "api/v1";
  app.setGlobalPrefix(apiPrefix, { exclude: ["health", "health/live", "health/ready"] });

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Ecom API")
    .setDescription("Production commerce platform API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger docs at http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
