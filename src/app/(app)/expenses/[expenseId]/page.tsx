import { ExpenseDetail } from "@/components/expense/ExpenseDetail";
import { safeRedirect } from "@/lib/utils/url";
export default async function ExpensePage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  const { returnTo } = await searchParams;
  return (
    <ExpenseDetail
      id={expenseId}
      returnTo={safeRedirect(returnTo, "/expenses")}
    />
  );
}
