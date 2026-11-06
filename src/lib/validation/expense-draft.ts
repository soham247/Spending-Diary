import { z } from "zod";
import { personalExpenseFormSchema } from "./personal-expense";
import { createExpenseSchema, type CreateExpenseInput } from "./expense";
import { resolveShares, splitRemainders } from "@/lib/domain/splits";
import { toMinor } from "@/lib/money/to-minor";
export const expenseDraftSchema = personalExpenseFormSchema.extend({
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]),
  payerId: z.string().min(1),
  multiplePayers: z.boolean(),
  people: z.array(z.object({ userId: z.string(), selected: z.boolean(), paid: z.string(), value: z.string() })).min(1),
});
export type ExpenseDraftInput = z.input<typeof expenseDraftSchema>;
export type ExpenseDraftOutput = z.output<typeof expenseDraftSchema>;
export function buildExpenseDraft(viewerId: string, groupId: string | null, values: ExpenseDraftOutput) {
  const base = { ...values, groupId, currency: "INR" };
  const participants = values.people.map(p => {
    const paid = values.multiplePayers ? toMinor(p.paid || "0") : p.userId === values.payerId ? values.amount : 0;
    const weight = /^\d+(\.\d{1,4})?$/.test(p.value) ? Number(p.value) : NaN;
    return { userId: p.userId, paid, includedInSplit: p.selected, ...(values.splitType === "EXACT" ? { owed: p.selected ? toMinor(p.value || "0") : 0 } : values.splitType === "PERCENTAGE" ? { percentage: p.selected ? weight : 0 } : values.splitType === "SHARES" ? { shares: p.selected ? weight : 0 } : {}) };
  }).filter(p => p.includedInSplit || p.paid > 0);
  if (!groupId && !participants.some(p => p.userId === viewerId)) throw new Error("You must pay or share the cost in a direct expense");
  const input = createExpenseSchema.parse({ ...base, participants });
  return { input, shares: [...resolveShares(input)].map(([userId, owed]) => ({ userId, owed })) };
}
export function previewDraft(viewerId: string, groupId: string | null, raw: ExpenseDraftInput) {
  let remainders: { paid: number; owed: number | null } | null = null;
  try {
    const total = toMinor(raw.amount);
    const people = raw.people.filter(p => p.selected);
    remainders = splitRemainders(total,raw.people.map(p => raw.multiplePayers ? toMinor(p.paid || "0") : p.userId === raw.payerId ? total : 0),raw.splitType === "EXACT" ? people.map(p => toMinor(p.value || "0")) : undefined);
  } catch {}
  try { return { ...buildExpenseDraft(viewerId, groupId, expenseDraftSchema.parse(raw)), error: null, remainders }; }
  catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Complete the expense" : error instanceof Error ? error.message : "Complete the expense";
    return { input: null, shares: [], error: message, remainders };
  }
}

export type { CreateExpenseInput };
export function editDraftInput(expense: import("@/lib/api/expenses").ExpenseDetail, input: CreateExpenseInput) {
  const shares = resolveShares(input);
  const unchanged = expense.amount === input.amount && expense.currency === input.currency && expense.splitType === input.splitType && expense.participants.length === input.participants.length && input.participants.every(person => {
    const old = expense.participants.find(p => p.userId === person.userId);
    const weight = "percentage" in person ? String(person.percentage) : "shares" in person ? String(person.shares) : null;
    return !!old && old.paid === person.paid && old.owed === shares.get(person.userId) && old.includedInSplit === (person.includedInSplit !== false) && (weight === null || Number(weight) === Number(old.splitInput));
  });
  return unchanged ? { version: expense.version,description: input.description,category: input.category,date: input.date,notes: input.notes } : { ...input,version: expense.version };
}
