"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useActivity } from "@/hooks/use-activity";
import { expenseHistoryChanges } from "@/lib/domain/expense-history";
import { activityVerbs } from "@/lib/validation/activity";
import { Money } from "@/components/money/Money";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ErrorState } from "@/components/common/ErrorState";

export function ExpenseHistory({
  expenseId,
  names,
}: {
  expenseId: string;
  names: ReadonlyMap<string, string>;
}) {
  const feed = useActivity({ expenseId });
  const [showOlder, setShowOlder] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  if (feed.isPending)
    return (
      <div
        role="status"
        aria-label="Loading expense history"
        className="space-y-3"
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  if (!feed.data)
    return (
      <ErrorState
        message="Couldn't load expense history. Try again."
        retry={() => void feed.refetch()}
      />
    );
  const events = feed.data.pages.flatMap((page) => page.items);
  if (!events.length)
    return (
      <p className="text-sm text-muted-foreground">
        No activity available for this expense.
      </p>
    );
  return (
    <div className="space-y-3">
      <Accordion
        type="multiple"
        value={expandedEvents}
        onValueChange={setExpandedEvents}
        className="border-t border-border"
      >
        {(showOlder ? events : events.slice(0, 3)).map((event) => {
          const changes =
            event.type === "EXPENSE_UPDATED"
              ? expenseHistoryChanges(event.metadata, names)
              : [];
          const summary = (
            <span className="min-w-0 space-y-1 break-words">
              <span className="block font-medium">
                {event.actorName} {activityVerbs[event.type] ?? "updated"} this
                expense
              </span>
              <time
                dateTime={event.createdAt}
                className="block text-xs font-normal text-muted-foreground"
              >
                {format(parseISO(event.createdAt), "d MMM yyyy, h:mm a")}
              </time>
              {changes.length > 0 && !expandedEvents.includes(event.id) && (
                <span className="block text-sm font-normal text-muted-foreground">
                  {changes[0].label}:{" "}
                  {changes[0].kind === "money" ? (
                    <>
                      <Money
                        amount={changes[0].before}
                        currency={changes[0].currency}
                      />{" "}
                      →{" "}
                      <Money
                        amount={changes[0].after}
                        currency={changes[0].currency}
                      />
                    </>
                  ) : (
                    `${changes[0].before} → ${changes[0].after}`
                  )}
                </span>
              )}
            </span>
          );
          return (
            <AccordionItem value={event.id} key={event.id}>
              {changes.length ? (
                <>
                  <AccordionTrigger className="gap-3 py-4">
                    {summary}
                    <span className="sr-only">Show changes</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <dl className="space-y-4 pb-2">
                      {changes.map((change, index) => (
                        <div key={index} className="space-y-1">
                          <dt className="text-muted-foreground">
                            {change.label}
                          </dt>
                          <dd className="whitespace-pre-wrap break-words">
                            {change.kind === "money" ? (
                              <>
                                <Money
                                  amount={change.before}
                                  currency={change.currency}
                                />{" "}
                                →{" "}
                                <Money
                                  amount={change.after}
                                  currency={change.currency}
                                />
                              </>
                            ) : (
                              <>
                                {change.before} → {change.after}
                              </>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </AccordionContent>
                </>
              ) : (
                <div className="py-4">{summary}</div>
              )}
            </AccordionItem>
          );
        })}
      </Accordion>
      {!showOlder && (events.length > 3 || feed.hasNextPage) && (
        <Button variant="outline" onClick={() => setShowOlder(true)}>
          Show older activity
        </Button>
      )}
      {showOlder && feed.hasNextPage && (
        <div className="space-y-3">
          {feed.isFetchNextPageError && (
            <p role="alert" className="text-sm text-destructive">
              {"Couldn't load older activity. Try again."}
            </p>
          )}
          <Button
            variant="outline"
            disabled={feed.isFetchingNextPage}
            onClick={() => void feed.fetchNextPage()}
          >
            {feed.isFetchingNextPage
              ? "Loading…"
              : feed.isFetchNextPageError
                ? "Retry older activity"
                : "Load older activity"}
          </Button>
        </div>
      )}
    </div>
  );
}
