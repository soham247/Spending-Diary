import { ExpenseList } from "@/components/expense/ExpenseList";
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ groupId?: string; friendId?: string }> }) { const filters = await searchParams; return <ExpenseList groupId={filters.groupId} friendId={filters.friendId} />; }
