import type { ExpenseDetail } from "@/lib/api/expenses";

export function expenseDetailSummary(expense: ExpenseDetail, viewerId: string) {
  const viewer = expense.participants.find(
    (person) => person.userId === viewerId,
  );
  const split = expense.participants.filter((person) => person.includedInSplit);
  const labels = {
    EQUAL: `Split equally between ${split.length} ${split.length === 1 ? "person" : "people"}`,
    EXACT: "Split by custom amounts",
    PERCENTAGE: "Split by percentage",
    SHARES: "Split by shares",
  };
  return {
    viewer,
    payers: expense.participants.filter((person) => person.paid > 0),
    split,
    splitLabel: labels[expense.splitType],
  };
}

export function splitWeightLabel(
  type: ExpenseDetail["splitType"],
  input: string | null,
) {
  if (!input || (type !== "PERCENTAGE" && type !== "SHARES")) return null;
  const weight = input.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return type === "PERCENTAGE"
    ? `${weight}%`
    : `${weight} ${weight === "1" ? "share" : "shares"}`;
}
