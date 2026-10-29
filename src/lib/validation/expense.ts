import { z } from "zod";

/** ISO 4217 currency code */
const currency = z.string().length(3).toUpperCase();

/** Calendar date string YYYY-MM-DD */
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

/** Money amount in minor units — must be a positive integer */
const minorAmount = z
  .number()
  .int("Amount must be an integer in minor units (paise)")
  .positive("Amount must be positive");

const splitTypeEnum = z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]);

const participantBase = z.object({
  userId: z.string().min(1),
  paid: z.number().int().min(0),
});

const participantEqual = participantBase;

const participantExact = participantBase.extend({
  owed: z.number().int().min(0),
});

const participantPercentage = participantBase.extend({
  percentage: z.number().positive().max(100),
});

const participantShares = participantBase.extend({
  shares: z.number().int().positive(),
});

const participants = z.discriminatedUnion("splitType", [
  z.object({ splitType: z.literal("EQUAL"), participants: z.array(participantEqual).min(1) }),
  z.object({ splitType: z.literal("EXACT"), participants: z.array(participantExact).min(1) }),
  z.object({ splitType: z.literal("PERCENTAGE"), participants: z.array(participantPercentage).min(1) }),
  z.object({ splitType: z.literal("SHARES"), participants: z.array(participantShares).min(1) }),
]);

export const createExpenseSchema = z
  .object({
    groupId: z.string().optional().nullable(),
    description: z.string().min(1).max(255),
    category: z.string().min(1).max(100),
    notes: z.string().max(2000).optional().nullable(),
    amount: minorAmount,
    currency,
    date: calendarDate,
  })
  .and(participants);

export const editExpenseSchema = z
  .object({
    version: z.number().int().positive(),
    description: z.string().min(1).max(255).optional(),
    category: z.string().min(1).max(100).optional(),
    notes: z.string().max(2000).optional().nullable(),
    amount: minorAmount.optional(),
    currency: currency.optional(),
    date: calendarDate.optional(),
  })
  .and(
    z
      .object({ splitType: splitTypeEnum, participants: z.array(participantBase).min(1) })
      .optional(),
  );

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type EditExpenseInput = z.infer<typeof editExpenseSchema>;
