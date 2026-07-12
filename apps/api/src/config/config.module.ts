import { ApiEnv, validateApiEnv } from "@ecom/config";
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

export const APP_ENV = "APP_ENV";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateApiEnv(config as NodeJS.ProcessEnv),
    }),
  ],
  providers: [
    {
      provide: APP_ENV,
      useFactory: (): ApiEnv => validateApiEnv(process.env),
    },
  ],
  exports: [APP_ENV],
})
export class AppConfigModule {}
