import { z } from "zod";
import {
  calendarDate,
  currencySchema,
  entityId,
  minorAmount,
  nonnegativeAmount,
} from "./money";

export const expenseCategories = [
  "Food",
  "Groceries",
  "Transport",
  "Rent",
  "Utilities",
  "Shopping",
  "Entertainment",
  "Travel",
  "Health",
  "Other",
] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];

const participantBase = z.object({
  userId: entityId,
  paid: nonnegativeAmount,
  includedInSplit: z.boolean().optional(),
});
const splitType = z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]);
const split = z.discriminatedUnion("splitType", [
  z.object({
    splitType: z.literal("EQUAL"),
    participants: z.array(participantBase).min(1).max(100),
  }),
  z.object({
    splitType: z.literal("EXACT"),
    participants: z
      .array(participantBase.extend({ owed: nonnegativeAmount }))
      .min(1)
      .max(100),
  }),
  z.object({
    splitType: z.literal("PERCENTAGE"),
    participants: z
      .array(
        participantBase.extend({
          percentage: z.number().nonnegative().max(100),
        }),
      )
      .min(1)
      .max(100),
  }),
  z.object({
    splitType: z.literal("SHARES"),
    participants: z
      .array(
        participantBase.extend({
          shares: z.number().int().nonnegative().max(1000000),
        }),
      )
      .min(1)
      .max(100),
  }),
]);
const fields = {
  groupId: entityId.nullable().optional(),
  description: z.string().trim().min(1).max(255),
  category: z.enum(expenseCategories),
  notes: z.string().max(2000).nullable().optional(),
  amount: minorAmount,
  currency: currencySchema,
  date: calendarDate,
};

export const createExpenseSchema = z
  .object(fields)
  .and(split)
  .superRefine((input, ctx) => {
    if (!input.participants.some((p) => p.includedInSplit !== false))
      ctx.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Choose at least one person to share the cost",
      });
    input.participants.forEach((p, index) => {
      const weight =
        "percentage" in p && typeof p.percentage === "number"
          ? p.percentage
          : "shares" in p && typeof p.shares === "number"
            ? p.shares
            : null;
      const owed = "owed" in p ? p.owed : 0;
      if (
        p.includedInSplit === false &&
        (owed !== 0 || (weight !== null && weight !== 0))
      )
        ctx.addIssue({
          code: "custom",
          path: ["participants", index],
          message:
            "People outside the split must have zero owed and zero split weight",
        });
      if (p.includedInSplit !== false && weight !== null && weight <= 0)
        ctx.addIssue({
          code: "custom",
          path: ["participants", index],
          message: "Split weights must be positive",
        });
    });
    if (
      new Set(input.participants.map((p) => p.userId)).size !==
      input.participants.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Participants must be unique",
      });
    }
    if (
      input.participants.reduce((sum, p) => sum + p.paid, 0) !== input.amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Payments must equal the amount",
        params: { domain: true },
      });
    }
    if (
      input.splitType === "EXACT" &&
      input.participants.reduce((sum, p) => sum + p.owed, 0) !== input.amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["participants"],
        message: "Owed shares must equal the amount",
        params: { domain: true },
      });
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
  participants: z
    .array(
      participantBase.extend({
        owed: nonnegativeAmount.optional(),
        percentage: z.number().nonnegative().max(100).optional(),
        shares: z.number().int().nonnegative().max(1000000).optional(),
      }),
    )
    .min(1)
    .max(100)
    .optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type EditExpenseInput = z.infer<typeof editExpenseSchema>;

export const expenseListSchema = z
  .object({
    cursor: entityId.optional(),
    groupId: entityId.optional(),
    friendId: entityId.optional(),
    kind: z.enum(["PERSONAL", "SHARED"]).optional(),
    deleted: z.enum(["true", "false"]).default("false"),
    scope: z.enum(["all", "mine"]).optional(),
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .refine((input) => !input.from || !input.to || input.from <= input.to, {
    path: ["to"],
    message: "End date must be on or after start date",
  });
export type ExpenseListInput = z.input<typeof expenseListSchema>;
