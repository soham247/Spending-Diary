import { z } from "zod";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const minorAmount = z
  .number()
  .int("Amount must be an integer in minor units (paise)")
  .positive("Amount must be positive");

export const createSettlementSchema = z.object({
  groupId: z.string().optional().nullable(),
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amount: minorAmount,
  currency: z.string().length(3).toUpperCase(),
  method: z.enum(["CASH", "UPI", "OTHER"]),
  date: calendarDate,
  note: z.string().max(2000).optional().nullable(),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
