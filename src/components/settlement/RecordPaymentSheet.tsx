"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SettlePanel, type SettlePanelProps } from "./SettlePanel";

export function RecordPaymentSheet(props: Omit<SettlePanelProps, "net" | "onRecorded">) {
  const [open, setOpen] = useState(false);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button className="h-11">Record payment</Button></SheetTrigger>
    <SheetContent className="overflow-y-auto">
      <SheetHeader><SheetTitle>Record payment</SheetTitle><SheetDescription>Record money paid between people. Payments do not count as spending.</SheetDescription></SheetHeader>
      {open && <div className="pt-6"><SettlePanel {...props} onRecorded={() => setOpen(false)} /></div>}
    </SheetContent>
  </Sheet>;
}
