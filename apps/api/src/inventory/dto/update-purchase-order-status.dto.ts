import type { PurchaseOrderStatus } from "@ecom/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

const PURCHASE_ORDER_STATUSES = ["draft", "ordered", "partially_received", "received", "cancelled"] as const;

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({ enum: PURCHASE_ORDER_STATUSES })
  @IsIn(PURCHASE_ORDER_STATUSES)
  status!: PurchaseOrderStatus;
}
