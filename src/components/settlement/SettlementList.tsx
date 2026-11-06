"use client";
import { useProfile } from "@/hooks/use-profile";
import { RecordPaymentSheet } from "./RecordPaymentSheet";
import { useState } from "react";
import { toast } from "sonner";
import { useSettlements,useDeleteSettlement,useRestoreSettlement } from "@/hooks/use-settlements";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
export function SettlementList({ groupId,friendId }: { groupId?: string; friendId?: string }) {
  const profile = useProfile();
  const [deleted,setDeleted]=useState(false);
  const query=useSettlements({ groupId,friendId,deleted: deleted ? "true" : "false" });
  const remove=useDeleteSettlement();const restore=useRestoreSettlement();
  async function undo(id: string) { try { await restore.mutateAsync(id);toast.success("Payment restored"); } catch(e) { toast.error(e instanceof Error ? e.message : "Couldn't restore payment"); } }
  async function deleteRow(id: string) { try { await remove.mutateAsync(id);toast("Payment deleted",{ duration: 6000,action: { label: "Undo",onClick: ()=>void undo(id) } }); } catch { toast.error("Couldn't delete payment"); } }
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">{deleted ? "Deleted payments" : "Payments"}</h1>{profile.data && <RecordPaymentSheet viewerId={profile.data.id} scopeId={groupId} other={friendId ? { id: friendId, name: "Friend", upiId: null } : undefined} />}<Button className="h-11" variant="outline" onClick={()=>setDeleted(value=>!value)}>{deleted ? "Show payments" : "Deleted payments"}</Button>
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState retry={()=>void query.refetch()} /> : query.data.pages[0]?.items.length===0 ? <EmptyState>{deleted ? "No deleted payments." : "Recorded payments will show up here."}</EmptyState> : <div className="divide-y divide-border rounded-xl border border-border bg-card">{query.data.pages.flatMap(page=>page.items).map(payment=><div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="break-words">{payment.fromName} paid {payment.toName}</p><p className="text-sm text-muted-foreground">{payment.date}, {payment.method}</p>{payment.note && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{payment.note}</p>}</div><Money amount={payment.amount} currency={payment.currency} />{payment.canEdit&&<Button className="h-11" variant="outline" disabled={remove.isPending||restore.isPending} onClick={()=>void(deleted ? undo(payment.id) : deleteRow(payment.id))}>{deleted ? "Restore" : "Delete payment"}</Button>}</div>)}</div>}
    {query.hasNextPage&&<Button className="h-11" variant="outline" disabled={query.isFetchingNextPage} onClick={()=>void query.fetchNextPage()}>Load more</Button>}
  </div>;
}
