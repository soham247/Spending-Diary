"use client";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Money } from "@/components/money/Money";
import { useCreateExpense, useEditExpense } from "@/hooks/use-expenses";
import { expenseDraftSchema, buildExpenseDraft, previewDraft, editDraftInput, type ExpenseDraftInput, type ExpenseDraftOutput } from "@/lib/validation/expense-draft";
import { amountInputValue, todayDate } from "@/lib/validation/personal-expense";
import type { ExpenseDetail } from "@/lib/api/expenses";
import { ApiError } from "@/lib/api/client";

export function SharedExpenseForm({ viewerId, people, groupId = null, expense, reload, initialParticipantIds }: {
  viewerId: string; people: { id: string; name: string }[]; groupId?: string | null; expense?: ExpenseDetail; reload?: () => void; initialParticipantIds?: string[];
}) {
  const router = useRouter();
  const [key] = useState(() => crypto.randomUUID());
  const [conflict, setConflict] = useState(false);
  const create = useCreateExpense(); const edit = useEditExpense();
  const defaults: ExpenseDraftInput = {
    amount: expense ? amountInputValue(expense.amount) : "", description: expense?.description ?? "", date: expense?.date ?? todayDate(), category: expense?.category ?? "Other", notes: expense?.notes ?? "",
    splitType: expense?.splitType ?? "EQUAL", payerId: expense?.participants.find(p => p.paid > 0)?.userId ?? viewerId, multiplePayers: (expense?.participants.filter(p => p.paid > 0).length ?? 0) > 1,
    people: people.map(p => { const existing = expense?.participants.find(part => part.userId === p.id); return { userId: p.id, selected: expense ? existing?.includedInSplit ?? false : initialParticipantIds ? initialParticipantIds.includes(p.id) : true, paid: existing ? amountInputValue(existing.paid) : "0", value: existing ? expense?.splitType === "EXACT" ? amountInputValue(existing.owed) : existing.includedInSplit ? existing.splitInput ?? "1" : "1" : "1" }; }),
  };
  const { register, control, setValue, handleSubmit, formState: { errors, isDirty } } = useForm<ExpenseDraftInput, unknown, ExpenseDraftOutput>({ resolver: zodResolver(expenseDraftSchema), mode: "onBlur", defaultValues: defaults });
  const watched = useWatch({ control }) as ExpenseDraftInput;
  const preview = previewDraft(viewerId, groupId, watched);
  useUnsavedChanges(isDirty && !create.isPending && !edit.isPending);
  async function save(values: ExpenseDraftOutput) {
    try {
      const { input } = buildExpenseDraft(viewerId, groupId, values);
      const result = expense ? await edit.mutateAsync({ id: expense.id, input: editDraftInput(expense,input) }) : await create.mutateAsync({ input, idempotencyKey: key });
      toast.success("Expense saved"); router.push("/expenses/" + result.id);
    } catch (error) { if (error instanceof ApiError && error.status === 409) setConflict(true); else toast.error(error instanceof Error ? error.message : "Couldn't save. Check your connection and try again."); }
  }
  return <form onSubmit={handleSubmit(save)} className="space-y-5 max-w-xl">
    {conflict && <Alert><AlertDescription>This expense changed while you were editing. Load the latest version before saving.</AlertDescription><Button type="button" onClick={reload}>Load latest</Button></Alert>}
    <div className="space-y-2"><Label htmlFor="amount">Amount (INR)</Label><Input id="amount" autoFocus inputMode="decimal" className="h-16 text-4xl tabular-nums" {...register("amount")} /><p role="status" className="text-sm text-destructive">{errors.amount?.message}</p></div>
    <div className="space-y-2"><Label htmlFor="description">What was it for?</Label><Input id="description" {...register("description")} /><p role="status" className="text-sm text-destructive">{errors.description?.message}</p></div>
    <div className="flex flex-wrap gap-3"><div className="space-y-2"><Label htmlFor="date">Date</Label><Input id="date" type="date" {...register("date")} /></div><div className="space-y-2"><Label htmlFor="category">Category</Label><Input id="category" {...register("category")} /></div></div>
    <div className="space-y-2"><Label>Split</Label><Select value={watched.splitType} onValueChange={value => setValue("splitType", expenseDraftSchema.shape.splitType.parse(value))}><SelectTrigger className="h-11" aria-label="Split type"><SelectValue /></SelectTrigger><SelectContent>{(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const).map(value => <SelectItem key={value} value={value}>{value === "EQUAL" ? "Equally" : value === "EXACT" ? "Exact amounts" : value === "PERCENTAGE" ? "Percentages" : "Shares"}</SelectItem>)}</SelectContent></Select></div>
    <div className="flex items-center gap-3"><Checkbox id="multiple" checked={watched.multiplePayers} onCheckedChange={value => setValue("multiplePayers", value === true)} /><Label htmlFor="multiple">Multiple people paid</Label></div>
    {!watched.multiplePayers && <Select value={watched.payerId} onValueChange={value => setValue("payerId", value)}><SelectTrigger className="h-11" aria-label="Paid by"><SelectValue placeholder="Paid by" /></SelectTrigger><SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.id === viewerId ? "You" : p.name}</SelectItem>)}</SelectContent></Select>}
    <p className="text-sm text-muted-foreground">Select who shares the cost. Someone who paid can stay unchecked.</p>
    <div className="divide-y divide-border rounded-xl border border-border bg-card">{people.map((person, index) => <div key={person.id} className="flex flex-wrap items-center gap-3 p-4">
      <Checkbox id={"person-" + person.id} checked={watched.people?.[index]?.selected ?? false} onCheckedChange={value => setValue(("people." + index + ".selected") as `people.${number}.selected`, value === true)} /><Label htmlFor={"person-" + person.id} className="flex-1">{person.id === viewerId ? "You" : person.name}</Label>
      {watched.multiplePayers && <Input className="w-24" aria-label={person.name + " paid"} inputMode="decimal" {...register(`people.${index}.paid`)} />}
      {watched.splitType !== "EQUAL" && watched.people?.[index]?.selected && <Input className="w-24" aria-label={person.name + (watched.splitType === "EXACT" ? " owes" : watched.splitType === "PERCENTAGE" ? " percentage" : " shares")} inputMode="decimal" {...register(`people.${index}.value`)} />}
      {preview.shares.find(row => row.userId === person.id) && <Money amount={preview.shares.find(row => row.userId === person.id)!.owed} />}
    </div>)}</div>
    <div aria-live="polite" className="space-y-1 text-sm text-muted-foreground">{preview.remainders?.paid !== undefined && preview.remainders.paid !== 0 && <p><Money amount={Math.abs(preview.remainders.paid)} /> {preview.remainders.paid > 0 ? "left to assign to payers" : "over the total in payments"}</p>}{preview.remainders?.owed !== null && preview.remainders?.owed !== undefined && preview.remainders.owed !== 0 && <p><Money amount={Math.abs(preview.remainders.owed)} /> {preview.remainders.owed > 0 ? "left to assign in the split" : "over the total in the split"}</p>}<p>{preview.error ?? "All shares assigned exactly."}</p></div>
    <div className="space-y-2"><Label htmlFor="notes">Notes (optional)</Label><Input id="notes" {...register("notes")} /></div>
    <Button size="lg" type="submit" disabled={!!preview.error || create.isPending || edit.isPending || conflict}>{create.isPending || edit.isPending ? "Saving…" : "Save"}</Button>
  </form>;
}
