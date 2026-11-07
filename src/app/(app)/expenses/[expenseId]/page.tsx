import { ExpenseDetail } from "@/components/expense/ExpenseDetail";
export default async function ExpensePage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  return <ExpenseDetail id={expenseId} />;
}
