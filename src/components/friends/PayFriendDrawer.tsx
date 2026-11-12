"use client";

import { FormDrawer } from "@/components/common/FormDrawer";
import { FriendPaymentPanel } from "./FriendPaymentPanel";
import { Button } from "@/components/ui/button";

export function PayFriendDrawer() {
  return (
    <FormDrawer
      title="Pay a friend"
      description="Record money sent between you and a friend"
      trigger={
        <Button variant="outline" className="min-h-11">
          Pay a friend
        </Button>
      }
    >
      <FriendPaymentPanel />
    </FormDrawer>
  );
}
