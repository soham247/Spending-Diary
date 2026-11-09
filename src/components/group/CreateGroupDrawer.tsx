"use client";

import { FormDrawer } from "@/components/common/FormDrawer";
import { PageHeaderAction } from "@/components/shell/PageHeaderAction";
import { CreateGroupForm } from "./CreateGroupForm";

export function CreateGroupDrawer() {
  return (
    <FormDrawer
      title="Create a group"
      description="Keep a trip, your flat, or everyday costs together."
      trigger={<PageHeaderAction label="Create group" />}
    >
      <CreateGroupForm />
    </FormDrawer>
  );
}
