import { z } from "zod";
import { calendarDate, currencySchema, entityId, minorAmount, nonnegativeAmount } from "./money";

const participantBase = z.object({ userId: entityId, paid: nonnegativeAmount });
const splitType = z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]);
const split = z.discriminatedUnion("splitType", [
  z.object({ splitType: z.literal("EQUAL"), participants: z.array(participantBase).min(1).max(100) }),
  z.object({ splitType: z.literal("EXACT"), participants: z.array(participantBase.extend({ owed: nonnegativeAmount })).min(1).max(100) }),
  z.object({ splitType: z.literal("PERCENTAGE"), participants: z.array(participantBase.extend({ percentage: z.number().positive().max(100) })).min(1).max(100) }),
  z.object({ splitType: z.literal("SHARES"), participants: z.array(participantBase.extend({ shares: z.number().int().positive().max(1000000) })).min(1).max(100) }),
]);
const fields = {
  groupId: entityId.nullable().optional(),
  description: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(100),
  notes: z.string().max(2000).nullable().optional(),
  amount: minorAmount,
  currency: currencySchema,
  date: calendarDate,
};

export const createExpenseSchema = z.object(fields).and(split).superRefine((input, ctx) => {
  if (new Set(input.participants.map(p => p.userId)).size !== input.participants.length) {
    ctx.addIssue({ code: "custom", path: ["participants"], message: "Participants must be unique" });
  }
  if (input.participants.reduce((sum, p) => sum + p.paid, 0) !== input.amount) {
    ctx.addIssue({ code: "custom", path: ["participants"], message: "Payments must equal the amount", params: { domain: true } });
  }
  if (input.splitType === "EXACT" && input.participants.reduce((sum, p) => sum + p.owed, 0) !== input.amount) {
    ctx.addIssue({ code: "custom", path: ["participants"], message: "Owed shares must equal the amount", params: { domain: true } });
  }
});

export const editExpenseSchema = z.object({
  version: z.number().int().positive(),
  description: fields.description.optional(),
  category: fields.category.optional(),
  notes: fields.notes,
  amount: minorAmount.optional(),
  currency: currencySchema.optional(),
  date: calendarDate.optional(),
  splitType: splitType.optional(),
  participants: z.array(participantBase.extend({
    owed: nonnegativeAmount.optional(),
    percentage: z.number().positive().max(100).optional(),
    shares: z.number().int().positive().max(1000000).optional(),
  })).min(1).max(100).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type EditExpenseInput = z.infer<typeof editExpenseSchema>;
