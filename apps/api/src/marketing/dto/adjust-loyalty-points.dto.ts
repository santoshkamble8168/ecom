import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, NotEquals } from "class-validator";

export class AdjustLoyaltyPointsDto {
  @ApiProperty({ example: 100, description: "Positive to credit points, negative to debit" })
  @IsInt()
  @NotEquals(0)
  delta!: number;

  @ApiProperty({ example: "Goodwill credit for delayed shipment" })
  @IsString()
  @Length(1, 500)
  reason!: string;
}
