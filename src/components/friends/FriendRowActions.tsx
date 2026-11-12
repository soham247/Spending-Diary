"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { FriendList } from "@/lib/api/friends";
import { useUpdateFriend } from "@/hooks/use-friends";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDrawer } from "@/components/common/FormDrawer";
import { FriendPaymentPanel } from "./FriendPaymentPanel";
import { NicknameForm } from "./NicknameForm";

export function FriendRowActions({ friend }: { friend: FriendList[number] }) {
  const [action, setAction] = useState<"pay" | "nickname" | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const update = useUpdateFriend();
  async function toggleBlock() {
    try {
      await update.mutateAsync({
        id: friend.id,
        input: { blocked: !friend.blocked },
      });
      toast.success(friend.blocked ? "Friend unblocked" : "Friend blocked", {
        action: {
          label: "Undo",
          onClick: () => {
            void update
              .mutateAsync({
                id: friend.id,
                input: { blocked: friend.blocked },
              })
              .catch(() =>
                toast.error("Couldn't undo. Try again from friend actions."),
              );
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update friend",
      );
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon"
            className="mr-2 size-11 shrink-0"
            aria-label={"Actions for " + friend.name}
            disabled={update.isPending}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (action) event.preventDefault();
          }}
        >
          <DropdownMenuItem onSelect={() => setAction("pay")}>
            Pay {friend.name}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction("nickname")}>
            Edit nickname
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void toggleBlock()}>
            {friend.blocked ? "Unblock friend" : "Block friend"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {action && (
        <FormDrawer
          defaultOpen
          title={action === "pay" ? "Pay " + friend.name : "Edit nickname"}
          description={
            action === "pay"
              ? "Record a payment after it happens. UPI opens your own payment app."
              : "Choose a name that only you see."
          }
          onClosed={() => {
            setAction(null);
            trigger.current?.focus();
          }}
        >
          {action === "pay" ? (
            <FriendPaymentPanel other={friend} />
          ) : (
            <NicknameForm id={friend.id} name={friend.name} />
          )}
        </FormDrawer>
      )}
    </>
  );
}
