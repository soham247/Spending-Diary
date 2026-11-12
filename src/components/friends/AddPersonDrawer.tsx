"use client";

import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { AddPersonForm } from "./AddPersonForm";
import type { ReactElement } from "react";

export function AddPersonDrawer({
  groupId,
  trigger,
}: {
  groupId?: string;
  trigger?: ReactElement;
}) {
  return (
    <FormDrawer
      title={groupId ? "Add a person" : "Track someone by name"}
      description="Add someone by name, then share their invitation when you are ready."
      trigger={
        trigger ?? (
          <Button variant="outline" className="min-h-11">
            {groupId ? "Add person" : "Track someone by name"}
          </Button>
        )
      }
    >
      <AddPersonForm groupId={groupId} />
    </FormDrawer>
  );
}
