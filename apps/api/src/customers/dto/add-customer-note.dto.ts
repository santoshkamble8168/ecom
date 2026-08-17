import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class AddCustomerNoteDto {
  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  body!: string;
}
