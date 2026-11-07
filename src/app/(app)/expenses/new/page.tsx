import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; friendId?: string }>;
}) {
  const { groupId, friendId } = await searchParams;
  return <ExpenseDrawer groupId={groupId} friendId={friendId} defaultOpen />;
}
