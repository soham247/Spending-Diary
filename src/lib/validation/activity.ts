import { z } from "zod";
import {
  calendarDate,
  currencySchema,
  minorAmount,
  nonnegativeAmount,
} from "./money";

export const expenseActivitySnapshotSchema = z.object({
  amount: minorAmount.optional(),
  currency: currencySchema.optional(),
  description: z.string().optional(),
  date: calendarDate.optional(),
  category: z.string().optional(),
  notes: z.string().nullable().optional(),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]).optional(),
  participants: z
    .array(
      z.object({
        userId: z.string(),
        paid: nonnegativeAmount,
        owed: nonnegativeAmount,
        splitInput: z.string().nullable().optional(),
        includedInSplit: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const activityMetadataSchema = z.object({
  description: z.string(),
  amount: z.number().int().optional(),
  currency: z.string().optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});
export const activityListSchema = z.object({
  cursor: z.string().min(1).max(128).optional(),
  groupId: z.string().min(1).max(128).optional(),
  expenseId: z.string().min(1).max(128).optional(),
});
export const activityVerbs: Record<string, string> = {
  EXPENSE_CREATED: "added",
  EXPENSE_UPDATED: "updated",
  EXPENSE_DELETED: "deleted",
  EXPENSE_RESTORED: "restored",
  SETTLEMENT_CREATED: "recorded",
  SETTLEMENT_DELETED: "deleted",
  MEMBER_JOINED: "joined",
  MEMBER_LEFT: "left",
  MEMBER_REMOVED: "removed",
  GROUP_CREATED: "created",
  GROUP_UPDATED: "updated",
  INVITE_CLAIMED: "claimed",
};
export const claimActivityDetailsSchema = z.object({
  before: z.object({ inviteId: z.string() }),
  after: z.object({ name: z.string() }),
});
