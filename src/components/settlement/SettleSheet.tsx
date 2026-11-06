"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { SettlePanel } from "./SettlePanel";
export function SettleSheet({ viewerId, other, net, scopeId }: { viewerId: string; other: { id: string; name: string; upiId: string | null }; net: number; scopeId: string }) {
  const [open,setOpen] = useState(false);
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"><p>{net < 0 ? "You owe "+other.name : other.name+" owes you"} <Money amount={Math.abs(net)} tone={net < 0 ? "debit" : "credit"} /></p><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button className="h-11">Settle up</Button></SheetTrigger><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Settle up with {other.name}</SheetTitle><SheetDescription>Record a payment after it happens. UPI opens your own payment app.</SheetDescription></SheetHeader>{open && <div className="pt-6"><SettlePanel viewerId={viewerId} other={other} net={net} scopeId={scopeId} onRecorded={() => setOpen(false)} /></div>}</SheetContent></Sheet></div>;
}
