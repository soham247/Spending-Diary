import { z } from "zod";
import { calendarDate, currencySchema, entityId, minorAmount } from "./money";

export const createSettlementSchema = z.object({
  groupId: entityId.nullable().optional(),
  fromUserId: entityId,
  toUserId: entityId,
  amount: minorAmount,
  currency: currencySchema,
  method: z.enum(["CASH", "UPI", "OTHER"]),
  date: calendarDate,
  note: z.string().max(2000).nullable().optional(),
}).refine(input => input.fromUserId !== input.toUserId, { path: ["toUserId"], message: "Payer and receiver must be different" });

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export const settlementListSchema = z.object({
  cursor: entityId.optional(),groupId: entityId.optional(),friendId: entityId.optional(),
  deleted: z.enum(["true","false"]).default("false"),
});
export type SettlementListInput = z.input<typeof settlementListSchema>;
