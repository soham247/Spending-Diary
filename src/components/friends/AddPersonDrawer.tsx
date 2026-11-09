"use client";

import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { AddPersonForm } from "./AddPersonForm";

export function AddPersonDrawer({ groupId }: { groupId?: string }) {
  return (
    <FormDrawer
      title={groupId ? "Add a person" : "Track someone by name"}
      description="Add someone by name, then share their invitation when you are ready."
      trigger={
        <Button variant="outline">
          {groupId ? "Add person" : "Track someone by name"}
        </Button>
      }
    >
      <AddPersonForm groupId={groupId} />
    </FormDrawer>
  );
}
