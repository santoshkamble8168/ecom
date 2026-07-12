import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  // eslint-disable-next-line no-console
  console.log("Worker started, listening for queued jobs.");
}

bootstrap();
