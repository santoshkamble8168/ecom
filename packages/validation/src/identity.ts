import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  preferences: z
    .object({
      newsletter: z.boolean().optional(),
      smsAlerts: z.boolean().optional(),
      sizePreference: z.string().max(20).optional(),
    })
    .optional(),
});

export const createAddressSchema = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(10).max(15).regex(/^\d+$/, "Phone must be digits only"),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(4).max(10).regex(/^\d+$/, "Postal code must be digits only"),
  country: z.string().length(2).default("IN"),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export const googleAuthSchema = z.object({
  idToken: z.string().min(10),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});

export const assignUserRolesSchema = z.object({
  roleNames: z.array(z.string().min(1)).min(1),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type AssignUserRolesInput = z.infer<typeof assignUserRolesSchema>;
