import { createSettlementSchema } from "./settlement";
import { toMinor } from "@/lib/money/to-minor";
import { amountInputValue, todayDate } from "./personal-expense";
import { paymentPreview } from "@/lib/domain/payment-preview";
import type { PaymentPerson, PaymentScope } from "@/lib/db/queries/payment-context";
export interface PaymentFormValues { amount: string; viewerPays: boolean; date: string; note: string; method: "CASH" | "UPI" | "OTHER" }
export function paymentFormDraft(viewerId: string, scope: PaymentScope | undefined, person: PaymentPerson | undefined, values: PaymentFormValues) {
  if (!scope || !person) throw new Error("Choose a person and payment scope");
  const input = createSettlementSchema.parse({ fromUserId: values.viewerPays ? viewerId : person.id, toUserId: values.viewerPays ? person.id : viewerId, groupId: scope.id === "direct" ? null : scope.id, amount: toMinor(values.amount), currency: scope.currency, method: values.method, date: values.date, note: values.note.trim() || null });
  const preview = paymentPreview(person.net, input.amount, values.viewerPays);
  if (person.restricted && !preview.repaysDebt) throw new Error("This person can only repay or receive their existing debt, without overpaying.");
  return { input, preview };
}
export function settlementDraft(viewerId: string, otherId: string, net: number, amount: string, scopeId: string, method: "UPI" | "CASH") {
  return createSettlementSchema.parse({ fromUserId: net < 0 ? viewerId : otherId, toUserId: net < 0 ? otherId : viewerId, groupId: scopeId === "direct" ? null : scopeId, amount: toMinor(amount), currency: "INR", method, date: todayDate() });
}
export function upiLink(upiId: string, name: string, amount: number) {
  return "upi://pay?" + new URLSearchParams({ pa: upiId, pn: name, am: amountInputValue(amount), cu: "INR", tn: "Spending Diary settlement" });
}
