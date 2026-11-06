import { ExistingExpenseEditor } from "@/components/expense/ExistingExpenseEditor";
export default async function EditExpensePage({ params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params;
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Edit expense</h1><ExistingExpenseEditor id={expenseId} /></div>;
}
