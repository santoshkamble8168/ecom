import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { INDIAN_STATES } from "@ecom/validation";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

/** Treat blank strings as omitted so @IsOptional works for optional form fields. */
function emptyToUndefined({ value }: { value: unknown }) {
  if (value === "" || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }
  return value;
}

export class CreateAddressDto {
  @ApiPropertyOptional({ example: "Home" })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Length(1, 50)
  label?: string;

  @ApiProperty({ example: "Jane Doe" })
  @Transform(emptyToUndefined)
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @ApiProperty({ example: "9876543210" })
  @Transform(emptyToUndefined)
  @IsString()
  @Length(10, 10)
  @Matches(/^[6-9]\d{9}$/, {
    message: "phone must be a valid 10-digit Indian mobile number",
  })
  phone!: string;

  @ApiProperty({ example: "42 MG Road" })
  @Transform(emptyToUndefined)
  @IsString()
  @Length(5, 200)
  line1!: string;

  @ApiPropertyOptional({ example: "Apt 4B" })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Length(1, 200)
  line2?: string;

  @ApiProperty({ example: "Bengaluru" })
  @Transform(emptyToUndefined)
  @IsString()
  @Length(2, 100)
  city!: string;

  @ApiProperty({ example: "Karnataka", enum: INDIAN_STATES })
  @Transform(emptyToUndefined)
  @IsString()
  @IsIn([...INDIAN_STATES], { message: "state must be a valid Indian state or UT" })
  state!: string;

  @ApiProperty({ example: "560001" })
  @Transform(emptyToUndefined)
  @IsString()
  @Length(6, 6)
  @Matches(/^[1-9]\d{5}$/, {
    message: "postalCode must be a valid 6-digit Indian pincode",
  })
  postalCode!: string;

  @ApiPropertyOptional({ example: "IN", default: "IN" })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
