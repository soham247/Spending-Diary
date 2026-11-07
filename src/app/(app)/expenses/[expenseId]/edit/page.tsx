import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  return <ExpenseDrawer expenseId={expenseId} defaultOpen />;
}
