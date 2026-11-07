"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { FormDrawer } from "@/components/common/FormDrawer";
import { NewExpenseEditor } from "./NewExpenseEditor";
import { ExistingExpenseEditor } from "./ExistingExpenseEditor";

export function ExpenseDrawer({
  groupId,
  friendId,
  expenseId,
  trigger,
  defaultOpen = false,
}: {
  groupId?: string;
  friendId?: string;
  expenseId?: string;
  trigger?: ReactElement;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const destination = expenseId
    ? "/expenses/" + expenseId
    : groupId
      ? "/groups/" + groupId
      : friendId
        ? "/friends/" + friendId
        : "/expenses";
  return (
    <FormDrawer
      title={expenseId ? "Edit expense" : "Add expense"}
      description=""
      trigger={trigger}
      defaultOpen={defaultOpen}
      onDismiss={defaultOpen ? () => router.replace(destination) : undefined}
    >
      {expenseId ? (
        <ExistingExpenseEditor id={expenseId} />
      ) : (
        <NewExpenseEditor groupId={groupId} friendId={friendId} />
      )}
    </FormDrawer>
  );
}
