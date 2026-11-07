import { z } from "zod";
import { currencySchema, entityId } from "./money";
export const createGroupSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["TRIP", "HOME", "COUPLE", "OTHER"]).default("OTHER"),
  currency: currencySchema.default("INR"),
  simplifyDebts: z.boolean().default(true),
});
export const updateGroupSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["TRIP", "HOME", "COUPLE", "OTHER"]).optional(),
  simplifyDebts: z.boolean().optional(),
  archived: z.boolean().optional(),
});
export const memberActionSchema = z.strictObject({
  action: z.enum(["LEAVE", "REMOVE", "PROMOTE", "REJOIN"]),
  userId: entityId.optional(),
  confirmOutstandingBalance: z.boolean().default(false),
});
export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type MemberActionInput = z.input<typeof memberActionSchema>;
