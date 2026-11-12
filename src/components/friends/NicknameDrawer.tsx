"use client";

import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { NicknameForm } from "./NicknameForm";

export function NicknameDrawer({ id, name }: { id: string; name: string }) {
  return (
    <FormDrawer
      title="Edit nickname"
      description="Choose a name that only you see."
      trigger={
        <Button variant="ghost" className="min-h-11">
          Edit nickname
        </Button>
      }
    >
      <NicknameForm id={id} name={name} />
    </FormDrawer>
  );
}
