import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class AttachCampaignProductsDto {
  @ApiProperty({ type: [String], example: ["CCN-BLK-M", "CCN-BLK-L"] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  variantSkus!: string[];
}
