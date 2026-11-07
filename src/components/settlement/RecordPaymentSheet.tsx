"use client";
import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { SettlePanel, type SettlePanelProps } from "./SettlePanel";

export function RecordPaymentSheet(
  props: Omit<SettlePanelProps, "net" | "onRecorded">,
) {
  return (
    <FormDrawer
      title="Record payment"
      description="Record money paid between people. Payments do not count as spending."
      trigger={<Button>Record payment</Button>}
    >
      <SettlePanel {...props} />
    </FormDrawer>
  );
}
