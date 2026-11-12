"use client";
import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import type { ReactElement } from "react";
import { SettlePanel, type SettlePanelProps } from "./SettlePanel";

export function RecordPaymentSheet({
  trigger,
  ...props
}: Omit<SettlePanelProps, "net" | "onRecorded"> & { trigger?: ReactElement }) {
  return (
    <FormDrawer
      title="Record payment"
      description="Record money paid between people. Payments do not count as spending."
      trigger={trigger ?? <Button>Record payment</Button>}
    >
      <SettlePanel {...props} />
    </FormDrawer>
  );
}
