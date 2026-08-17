import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { UpdateFeatureFlagDto } from "./dto/update-feature-flag.dto";
import { FeatureFlagsService } from "./feature-flags.service";

@ApiTags("admin-feature-flags")
@Controller("admin/feature-flags")
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @Permissions(PERMISSIONS.FEATURE_FLAG_READ)
  list() {
    return this.featureFlagsService.list();
  }

  @Patch(":key")
  @Permissions(PERMISSIONS.FEATURE_FLAG_WRITE)
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("key") key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    return this.featureFlagsService.update(actor.id, key, dto);
  }
}
