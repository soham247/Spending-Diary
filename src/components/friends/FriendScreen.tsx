"use client";
import Link from "next/link";
import { NicknameForm } from "./NicknameForm";
import { toast } from "sonner";
import { useFriend, useUpdateFriend } from "@/hooks/use-friends";
import { useProfile } from "@/hooks/use-profile";
import { useDeleteSettlement, useRestoreSettlement } from "@/hooks/use-settlements";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { RecordPaymentSheet } from "@/components/settlement/RecordPaymentSheet";
import { SettleSheet } from "@/components/settlement/SettleSheet";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
export function FriendScreen({ id }: { id: string }) {
  const friend = useFriend(id); const profile = useProfile(); const update = useUpdateFriend();
  const remove = useDeleteSettlement(); const restore = useRestoreSettlement();
  if (friend.isPending || profile.isPending) return <LoadingState />;
  if (friend.isError || profile.isError) return <ErrorState retry={() => { void friend.refetch(); void profile.refetch(); }} />;
  const row = friend.data;
  async function block() { try { await update.mutateAsync({ id, input: { blocked: !row.blocked } }); toast.success("Friend updated"); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't update friend"); } }
  async function deletePayment(paymentId: string) {
    try { await remove.mutateAsync(paymentId); toast("Payment deleted", { duration: 6000, action: { label: "Undo", onClick: () => { void restore.mutateAsync(paymentId).then(() => toast.success("Payment restored")).catch(() => toast.error("Couldn't restore payment")); } } }); } catch { toast.error("Couldn't delete payment"); }
  }
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{row.name}</h1>{!row.blocked && <Button asChild size="lg"><Link href={"/expenses/new?friendId=" + row.id}>Add expense</Link></Button>}</div>
    <RecordPaymentSheet viewerId={profile.data.id} other={row} />
    {row.status === "INVITED" && <InvitePanel input={{ type: "DIRECT", placeholderId: id }} />}
    {row.balances.every(balance => balance.net === 0) ? <EmptyState>You are settled up with {row.name}.</EmptyState> : row.balances.filter(b => b.net !== 0).map(b => <div key={b.scopeId + b.currency} className="space-y-2"><p className="text-sm text-muted-foreground">{b.scopeId === "direct" ? "Direct expenses" : "Group balance"}</p><SettleSheet viewerId={profile.data.id} other={row} net={b.net} scopeId={b.scopeId} /></div>)}
    <section className="space-y-3"><h2 className="text-lg font-semibold">Shared expenses</h2><div className="divide-y divide-border rounded-xl border border-border bg-card">{row.expenses.map(expense => <Link className="flex justify-between gap-3 p-4" key={expense.id} href={"/expenses/" + expense.id}>{expense.description}<Money amount={expense.amount} currency={expense.currency} /></Link>)}</div></section>
    <Link href={"/expenses?friendId=" + id} className="inline-block underline underline-offset-4">View all shared expenses</Link>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Payments</h2>{row.settlements.map(payment => <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4" key={payment.id}><p>{payment.fromUserId === profile.data.id ? "You paid " + row.name : row.name + " paid you"} - {payment.date} <Money amount={payment.amount} currency={payment.currency} />{payment.note && <span className="block whitespace-pre-wrap break-words text-sm text-muted-foreground">{payment.note}</span>}</p>{payment.canEdit && <Button variant="outline" className="h-11" disabled={remove.isPending} onClick={() => void deletePayment(payment.id)}>Delete payment</Button>}</div>)}</section>
    <Link href={"/settlements?friendId=" + id} className="inline-block underline underline-offset-4">View all payments</Link>
    <NicknameForm key={row.name} id={id} name={row.name} />
    <Button variant="outline" className="h-11" disabled={update.isPending} onClick={() => void block()}>{row.blocked ? "Unblock friend" : "Block friend"}</Button>
  </div>;
}
