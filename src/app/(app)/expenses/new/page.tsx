import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; friendId?: string }>;
}) {
  const { groupId, friendId } = await searchParams;
  return (
    <PageLayout header={<PageHeader title="Add expense" />}>
      <ExpenseDrawer groupId={groupId} friendId={friendId} defaultOpen />
    </PageLayout>
  );
}
