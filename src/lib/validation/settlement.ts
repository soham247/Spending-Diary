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
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
