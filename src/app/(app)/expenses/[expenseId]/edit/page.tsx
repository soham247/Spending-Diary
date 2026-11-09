import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  return (
    <PageLayout header={<PageHeader title="Edit expense" />}>
      <ExpenseDrawer expenseId={expenseId} defaultOpen />
    </PageLayout>
  );
}
