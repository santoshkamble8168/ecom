import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

import { BANNER_PLACEMENTS } from "../cms.constants";

export class PublicBannersQueryDto {
  @ApiProperty({ enum: BANNER_PLACEMENTS })
  @IsIn(BANNER_PLACEMENTS)
  placement!: (typeof BANNER_PLACEMENTS)[number];
}
