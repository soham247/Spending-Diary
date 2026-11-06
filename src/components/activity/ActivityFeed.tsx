"use client";
import { Fragment } from "react";
import { ArrowRightLeft, ReceiptText } from "lucide-react";
import { InviteClaimNotice } from "@/components/invite/InviteClaimNotice";
import { useRouter } from "next/navigation";
import { useActivity, useReadActivity } from "@/hooks/use-activity";
import { activityMetadataSchema, activityVerbs } from "@/lib/validation/activity";
import { Money } from "@/components/money/Money";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
export function ActivityFeed({ groupId, expenseId }: { groupId?: string; expenseId?: string }) {
  const feed = useActivity({ groupId, expenseId }); const read = useReadActivity(); const router = useRouter();
  if (feed.isPending) return <LoadingState />;
  if (feed.isError) return <ErrorState retry={() => void feed.refetch()} />;
  if (feed.data.pages[0]?.items.length === 0) return <EmptyState>Expenses and payments involving you will show up here.</EmptyState>;
  return <div className="space-y-4"><div className="divide-y divide-border rounded-xl border border-border bg-card">{feed.data.pages.flatMap(p => p.items).map(event => {
    const parsed = activityMetadataSchema.safeParse(event.metadata); const meta = parsed.success ? parsed.data : null;
    return <Fragment key={event.id}><button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted focus-visible:outline-ring" onClick={() => { read.mutate(event.id); if (event.expenseId) router.push("/expenses/" + event.expenseId); else if (event.settlementId) router.push("/settlements" + (event.groupId ? "?groupId=" + event.groupId : "")); else if (event.groupId) router.push("/groups/" + event.groupId); }}>
      {event.settlementId ? <ArrowRightLeft aria-label="Payment" className="size-5 shrink-0 text-muted-foreground" /> : <ReceiptText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />}
      {!event.readAt && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-foreground" />}<span className="min-w-0"><span className="block">{event.settlementId && event.fromName && event.toName ? <>{event.type === "SETTLEMENT_DELETED" ? "Payment deleted: " : meta?.description === "Payment restored" ? "Payment restored: " : ""}{event.fromName} paid {event.toName}</> : <>{event.actorName} {activityVerbs[event.type] ?? "updated"} {meta?.description ?? "an item"}</>}{meta?.amount !== undefined && <> — <Money amount={meta.amount} currency={meta.currency} /></>}</span>{event.paymentNote && <span className="block whitespace-pre-wrap break-words text-sm text-muted-foreground">{event.paymentNote}</span>}<time dateTime={event.createdAt} className="text-sm text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</time></span>
    </button>{event.canReportClaim && <InviteClaimNotice metadata={event.metadata} />}</Fragment>;
  })}</div>{feed.hasNextPage && <Button variant="outline" className="h-11" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>Load more</Button>}</div>;
}
