import { z } from "zod";

import {
  formSkuSchema,
  moneyStringSchema,
  optionalDatetimeLocalSchema,
  optionalTextSchema,
  positiveIntStringSchema,
  requiredTextSchema,
} from "./form-helpers";

const warehouseAddressFields = {
  name: requiredTextSchema(120),
  line1: requiredTextSchema(200),
  line2: optionalTextSchema(200),
  city: requiredTextSchema(100),
  state: requiredTextSchema(100),
  postalCode: requiredTextSchema(20),
  country: z.string().trim().length(2, "Country must be a 2-letter code"),
  isDefault: z.boolean(),
};

export const createWarehouseFormSchema = z.object({
  code: requiredTextSchema(20),
  ...warehouseAddressFields,
});

export const updateWarehouseFormSchema = z.object({
  ...warehouseAddressFields,
  isActive: z.boolean(),
});

export const createSupplierFormSchema = z.object({
  name: requiredTextSchema(150),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email",
    }),
  phone: optionalTextSchema(30),
});

export const stockAdjustmentFormSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  variantSku: formSkuSchema,
  delta: z
    .string()
    .trim()
    .refine((value) => /^-?\d+$/.test(value) && Number(value) !== 0, {
      message: "Enter a non-zero whole number",
    }),
  note: optionalTextSchema(300),
});

export const stockTransferFormSchema = z
  .object({
    fromWarehouseId: z.string().min(1, "Source warehouse is required"),
    toWarehouseId: z.string().min(1, "Destination warehouse is required"),
    variantSku: formSkuSchema,
    quantity: positiveIntStringSchema,
    note: optionalTextSchema(300),
  })
  .refine((values) => values.fromWarehouseId !== values.toWarehouseId, {
    message: "Source and destination warehouses must be different",
    path: ["toWarehouseId"],
  });

export const purchaseOrderItemFormSchema = z.object({
  variantSku: formSkuSchema,
  quantityOrdered: positiveIntStringSchema,
  unitCost: moneyStringSchema,
});

export const createPurchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  expectedAt: optionalDatetimeLocalSchema,
  note: optionalTextSchema(300),
  items: z.array(purchaseOrderItemFormSchema).min(1, "Add at least one line item"),
});

export type CreateWarehouseFormValues = z.infer<typeof createWarehouseFormSchema>;
export type UpdateWarehouseFormValues = z.infer<typeof updateWarehouseFormSchema>;
export type CreateSupplierFormValues = z.infer<typeof createSupplierFormSchema>;
export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentFormSchema>;
export type StockTransferFormValues = z.infer<typeof stockTransferFormSchema>;
export type CreatePurchaseOrderFormValues = z.infer<typeof createPurchaseOrderFormSchema>;
