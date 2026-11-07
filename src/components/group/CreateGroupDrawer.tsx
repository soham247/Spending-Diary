"use client";

import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { CreateGroupForm } from "./CreateGroupForm";

export function CreateGroupDrawer() {
  return (
    <FormDrawer
      title="Create a group"
      description="Keep a trip, your flat, or everyday costs together."
      trigger={<Button>Create group</Button>}
    >
      <CreateGroupForm />
    </FormDrawer>
  );
}
