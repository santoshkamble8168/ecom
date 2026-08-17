import { Module } from "@nestjs/common";

import { AuditLogsController } from "./audit-logs.controller";
import { AuditLogsService } from "./audit-logs.service";
import { FeatureFlagsController } from "./feature-flags.controller";
import { FeatureFlagsService } from "./feature-flags.service";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  controllers: [AuditLogsController, FeatureFlagsController, SettingsController],
  providers: [AuditLogsService, FeatureFlagsService, SettingsService],
  exports: [FeatureFlagsService, SettingsService],
})
export class PlatformModule {}
