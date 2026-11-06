"use client";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { useCreateSettlement } from "@/hooks/use-settlements";
import type { PaymentContext } from "@/lib/api/settlements";
import { paymentFormDraft, upiLink, type PaymentFormValues } from "@/lib/validation/settlement-draft";
import { amountInputValue, todayDate } from "@/lib/validation/personal-expense";
import { Money } from "@/components/money/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import type { SettlePanelProps } from "./SettlePanel";

export function PaymentForm({ viewerId, other, net, scopeId, scopes, onRecorded }: SettlePanelProps & { scopes: PaymentContext }) {
  const id = useId();
  const [selectedScope, setSelectedScope] = useState(scopeId ?? "direct");
  const [personId, setPersonId] = useState(other?.id ?? "");
  const [values, setValues] = useState<PaymentFormValues>(() => ({ amount: net === undefined ? "" : amountInputValue(Math.abs(net)), viewerPays: net === undefined || net < 0, date: todayDate(), note: "", method: "CASH" }));
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [confirmation, setConfirmation] = useState<"record" | "upi" | null>(null);
  const [awaitingUpi, setAwaitingUpi] = useState(false);
  const [returned, setReturned] = useState(false);
  const create = useCreateSettlement();
  const choices = scopes.filter(scope => (!scopeId || scope.id === scopeId) && (!other || scope.people.some(person => person.id === other.id)));
  const scope = choices.find(row => row.id === selectedScope);
  const person = scope?.people.find(row => row.id === personId);
  let draft: ReturnType<typeof paymentFormDraft> | null = null;
  let error: string | null = null;
  try { draft = paymentFormDraft(viewerId, scope, person, values); }
  catch (cause) { error = cause instanceof Error && !cause.message.startsWith("[") ? cause.message : "Check the amount, date and note (up to 2,000 characters)."; }
  useEffect(() => {
    const listener = () => { if (document.visibilityState === "visible" && awaitingUpi) setReturned(true); };
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, [awaitingUpi]);
  function change(patch: Partial<PaymentFormValues>) { setValues(current => ({ ...current, ...patch })); setKey(crypto.randomUUID()); setConfirmation(null); }
  async function record(method = values.method) {
    if (!draft) return;
    try {
      await create.mutateAsync({ input: { ...draft.input, method }, idempotencyKey: key });
      setAwaitingUpi(false); setReturned(false); setKey(crypto.randomUUID()); toast.success("Payment recorded"); onRecorded?.();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Couldn't record payment"); }
  }
  function launchUpi() {
    if (!draft || !person?.upiId || !values.viewerPays || scope?.currency !== "INR") return;
    setAwaitingUpi(true); setReturned(false);
    window.location.assign(upiLink(person.upiId, person.name, draft.input.amount));
  }
  function submit(action: "record" | "upi") {
    if (!draft) return;
    if (draft.preview.needsConfirmation) setConfirmation(action);
    else if (action === "upi") launchUpi();
    else void record();
  }
  if (!choices.some(choice => choice.people.length > 0)) return <EmptyState>No eligible payment counterparties in this scope.</EmptyState>;
  return <div className="space-y-4">
    <fieldset className="space-y-4" disabled={create.isPending || awaitingUpi}>
      {!scopeId && <div className="space-y-2"><Label htmlFor={id + "scope"}>Payment scope</Label><Select value={selectedScope} onValueChange={value => { setSelectedScope(value); if (!other) setPersonId(""); change({}); }} disabled={create.isPending || awaitingUpi}><SelectTrigger id={id + "scope"}><SelectValue placeholder="Choose Direct or a group" /></SelectTrigger><SelectContent>{choices.map(row => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}</SelectContent></Select></div>}
      {scopeId && <p className="text-sm text-muted-foreground">Payment scope: {scope?.name}</p>}
      {!other && <div className="space-y-2"><Label htmlFor={id + "person"}>Other person</Label><Select value={personId} onValueChange={value => { setPersonId(value); change({}); }} disabled={create.isPending || awaitingUpi}><SelectTrigger id={id + "person"}><SelectValue placeholder="Choose a person" /></SelectTrigger><SelectContent>{scope?.people.map(row => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}</SelectContent></Select></div>}
      <div className="space-y-2"><Label htmlFor={id + "direction"}>Payer → receiver</Label><Select value={values.viewerPays ? "pay" : "receive"} onValueChange={value => change({ viewerPays: value === "pay" })} disabled={create.isPending || awaitingUpi}><SelectTrigger id={id + "direction"}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pay">You → {person?.name ?? "other person"}</SelectItem><SelectItem value="receive">{person?.name ?? "Other person"} → you</SelectItem></SelectContent></Select></div>
      {person && <p>{person.net === 0 ? "You are settled up in this scope." : <>{person.net < 0 ? "You owe " + person.name : person.name + " owes you"} <Money amount={Math.abs(person.net)} currency={scope?.currency} tone={person.net < 0 ? "debit" : "credit"} /></>}</p>}
      <div className="space-y-2"><Label htmlFor={id + "amount"}>Payment amount ({scope?.currency ?? "INR"})</Label><Input id={id + "amount"} inputMode="decimal" value={values.amount} onChange={event => change({ amount: event.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor={id + "date"}>Payment date</Label><Input id={id + "date"} type="date" value={values.date} onChange={event => change({ date: event.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor={id + "method"}>Payment method</Label><Select value={values.method} onValueChange={(value: PaymentFormValues["method"]) => change({ method: value })} disabled={create.isPending || awaitingUpi}><SelectTrigger id={id + "method"}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={id + "note"}>Note (optional)</Label><Textarea id={id + "note"} maxLength={2000} value={values.note} onChange={event => change({ note: event.target.value })} /></div>
    </fieldset>
    <p role="status" className="text-sm text-muted-foreground">{error ?? (person?.restricted ? "Only repayment of the existing debt is allowed." : "Payments do not count as spending.")}</p>
    {values.viewerPays && person && !person.upiId && <p className="text-sm text-muted-foreground">{person.name} has not added a UPI ID yet.</p>}
    {awaitingUpi ? <div className="flex flex-wrap gap-3"><p className="w-full">{returned ? "Did your payment go through?" : "After paying, confirm whether the payment went through."}</p><Button className="h-11" disabled={create.isPending} onClick={() => void record("UPI")}>Yes, record it</Button><Button className="h-11" variant="outline" disabled={create.isPending} onClick={() => { setAwaitingUpi(false); setReturned(false); }}>No</Button></div> : <div className="flex flex-wrap gap-3">{values.viewerPays && person?.upiId && scope?.currency === "INR" && <Button className="h-11" disabled={!!error || create.isPending} onClick={() => submit("upi")}>Pay with UPI</Button>}<Button className="h-11" variant="outline" disabled={!!error || create.isPending} onClick={() => submit("record")}>{create.isPending ? "Recording…" : values.method === "CASH" && net !== undefined && values.viewerPays ? "Record a cash payment" : "Record payment"}</Button></div>}
    <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm payment</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-2"><p>This payment changes your balance with {person?.name} in {scope?.name}.</p>{draft && <p>{draft.preview.after === 0 ? "You will be settled up." : <>{draft.preview.after < 0 ? "You will owe " + person?.name : person?.name + " will owe you"} <Money amount={Math.abs(draft.preview.after)} currency={scope?.currency} />.</>}</p>}</div></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { const action = confirmation; setConfirmation(null); if (action === "upi") launchUpi(); else void record(); }}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
