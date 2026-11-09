"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/common/DatePicker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { expenseListSchema } from "@/lib/validation/expense";

export interface HistoryFilters {
  from: string;
  to: string;
  includeOthers: boolean;
}

export function ExpenseHistoryFilters({
  value,
  onApply,
  onClose,
}: {
  value: HistoryFilters;
  onApply: (value: HistoryFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const mobile = useIsMobile();
  const valid = expenseListSchema.safeParse({
    from: draft.from || undefined,
    to: draft.to || undefined,
  }).success;
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side={mobile ? "bottom" : "right"}
        className="max-h-dvh overflow-y-auto overscroll-contain"
      >
        <SheetHeader>
          <SheetTitle>Filter expenses</SheetTitle>
          <SheetDescription>
            Choose a custom period or include other group expenses
          </SheetDescription>
        </SheetHeader>
        <form
          className="form-drawer-body space-y-6 px-4 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) onApply(draft);
          }}
        >
          <fieldset className="space-y-4">
            <legend className="mb-3 font-medium">Custom dates</legend>
            <p className="text-sm text-muted-foreground">
              Custom dates replace the selected month
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="history-from">From</Label>
                <DatePicker
                  id="history-from"
                  value={draft.from}
                  onChange={(from) => setDraft({ ...draft, from })}
                  aria-invalid={!valid}
                  aria-describedby={!valid ? "history-date-error" : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="history-to">To</Label>
                <DatePicker
                  id="history-to"
                  value={draft.to}
                  onChange={(to) => setDraft({ ...draft, to })}
                  aria-invalid={!valid}
                  aria-describedby={!valid ? "history-date-error" : undefined}
                />
              </div>
            </div>
            {!valid && (
              <p
                id="history-date-error"
                role="alert"
                className="text-sm text-destructive"
              >
                Choose valid dates with the end on or after the start
              </p>
            )}
          </fieldset>
          <Label
            htmlFor="include-others"
            className="flex min-h-11 cursor-pointer items-start gap-3"
          >
            <Checkbox
              id="include-others"
              name="includeOthers"
              aria-describedby="include-others-help"
              checked={draft.includeOthers}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, includeOthers: checked === true })
              }
            />
            <span className="space-y-1">
              <span className="block">
                Include group expenses without my share
              </span>
              <span
                id="include-others-help"
                className="block text-sm font-normal text-muted-foreground"
              >
                These expenses do not increase your spending
              </span>
            </span>
          </Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDraft({ from: "", to: "", includeOthers: false })
              }
            >
              Reset
            </Button>
            <Button className="flex-1" disabled={!valid}>
              Apply filters
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
