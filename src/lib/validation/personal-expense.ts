import { z } from "zod";
import { toMinor } from "@/lib/money/to-minor";
import { createExpenseSchema, expenseCategories } from "./expense";
import { calendarDate } from "./money";

export const personalExpenseFormSchema = z.object({
  amount: z.string().transform((value, ctx) => {
    try { return toMinor(value); } catch (error) { ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Enter an amount" }); return z.NEVER; }
  }).pipe(z.number().int().positive("Enter an amount greater than zero").max(2147483647)),
  description: z.string().trim().min(1, "Describe the expense").max(255),
  category: z.enum(expenseCategories),
  date: calendarDate,
  notes: z.string().max(2000),
});
export type PersonalExpenseFormInput = z.input<typeof personalExpenseFormSchema>;
export type PersonalExpenseFormOutput = z.output<typeof personalExpenseFormSchema>;
export function personalExpenseInput(viewerId: string, values: PersonalExpenseFormOutput) {
  return createExpenseSchema.parse({ ...values, currency: "INR", groupId: null, splitType: "EQUAL", participants: [{ userId: viewerId, paid: values.amount }] });
}
export function amountInputValue(minor: number) {
  return String(Math.trunc(minor / 100)) + "." + String(minor % 100).padStart(2, "0");
}
export function todayDate() {
  const now = new Date();
  return String(now.getFullYear()) + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}
