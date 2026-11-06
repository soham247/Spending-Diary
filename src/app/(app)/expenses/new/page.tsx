import { NewExpenseEditor } from "@/components/expense/NewExpenseEditor";
export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ groupId?: string; friendId?: string }> }) {
  const { groupId, friendId } = await searchParams;
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Add expense</h1><NewExpenseEditor groupId={groupId} friendId={friendId} /></div>;
}
