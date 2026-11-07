"use client";

import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { AddPersonForm } from "./AddPersonForm";

export function AddPersonDrawer({ groupId }: { groupId?: string }) {
  return (
    <FormDrawer
      title="Add a person"
      description="Add someone by name, then share their invitation when you are ready."
      trigger={<Button variant="outline">Add person</Button>}
    >
      <AddPersonForm groupId={groupId} />
    </FormDrawer>
  );
}
