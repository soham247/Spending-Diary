"use client";
import {
  useDrawerFormState,
  useFormDrawer,
} from "@/components/common/FormDrawer";
import { BackButton } from "@/components/common/BackButton";
import { ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { expenseCategories } from "@/lib/validation/expense";
import { useRef, useState } from "react";
import {
  ExpensePeoplePicker,
  type ExpenseComposer,
} from "./ExpensePeoplePicker";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Money } from "@/components/money/Money";
import { useCreateExpense, useEditExpense } from "@/hooks/use-expenses";
import {
  expenseDraftSchema,
  changeExpensePeople,
  buildExpenseDraft,
  previewDraft,
  editDraftInput,
  type ExpenseDraftInput,
  type ExpenseDraftOutput,
} from "@/lib/validation/expense-draft";
import { amountInputValue, todayDate } from "@/lib/validation/personal-expense";
import type { ExpenseDetail } from "@/lib/api/expenses";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";

export function SharedExpenseForm({
  viewerId,
  people: initialPeople,
  groupId: initialGroupId = null,
  expense,
  reload,
  initialParticipantIds,
  composer,
}: {
  viewerId: string;
  people: { id: string; name: string }[];
  groupId?: string | null;
  expense?: ExpenseDetail;
  reload?: () => void;
  initialParticipantIds?: string[];
  composer?: ExpenseComposer;
}) {
  const router = useRouter();
  const drawer = useFormDrawer();
  const [view, setView] = useState<"expense" | "payer" | "split" | "people">(
    "expense",
  );
  const [people, setPeople] = useState(initialPeople);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [groupName, setGroupName] = useState(composer?.groupName);
  const peopleButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  function openView(next: "payer" | "split" | "people") {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setView(next);
    if (next !== "people")
      requestAnimationFrame(() => editorHeading.current?.focus());
  }
  function backToExpense() {
    setView("expense");
    requestAnimationFrame(() =>
      (returnFocus.current ?? peopleButton.current)?.focus(),
    );
  }
  const [key] = useState(() => crypto.randomUUID());
  const [conflict, setConflict] = useState(false);
  const create = useCreateExpense();
  const edit = useEditExpense();
  const defaults: ExpenseDraftInput = {
    amount: expense ? amountInputValue(expense.amount) : "",
    description: expense?.description ?? "",
    date: expense?.date ?? todayDate(),
    category: expense?.category ?? "Other",
    notes: expense?.notes ?? "",
    splitType: expense?.splitType ?? "EQUAL",
    payerId: expense?.participants.find((p) => p.paid > 0)?.userId ?? viewerId,
    multiplePayers:
      (expense?.participants.filter((p) => p.paid > 0).length ?? 0) > 1,
    people: people.map((p) => {
      const existing = expense?.participants.find(
        (part) => part.userId === p.id,
      );
      return {
        userId: p.id,
        selected: expense
          ? (existing?.includedInSplit ?? false)
          : initialParticipantIds
            ? initialParticipantIds.includes(p.id)
            : true,
        paid: existing ? amountInputValue(existing.paid) : "0",
        value: existing
          ? expense?.splitType === "EXACT"
            ? amountInputValue(existing.owed)
            : existing.includedInSplit
              ? (existing.splitInput ?? "1")
              : "1"
          : "1",
      };
    }),
  };
  const {
    register,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields, isSubmitted },
  } = useForm<ExpenseDraftInput, unknown, ExpenseDraftOutput>({
    resolver: zodResolver(expenseDraftSchema),
    mode: "onTouched",
    defaultValues: defaults,
  });
  const watched = useWatch({ control }) as ExpenseDraftInput;
  const preview = previewDraft(viewerId, groupId, watched);
  const pending = create.isPending || edit.isPending;
  const showAmountError =
    !!errors.amount && (!!dirtyFields.amount || isSubmitted);
  const selectedPeople = people.filter(
    (person, index) => watched.people[index]?.selected,
  );
  const personal =
    !groupId &&
    selectedPeople.length === 1 &&
    selectedPeople[0].id === viewerId &&
    !watched.multiplePayers &&
    watched.payerId === viewerId;
  useDrawerFormState(isDirty || groupId !== initialGroupId, pending);
  const yourShare = preview.shares.find((row) => row.userId === viewerId);
  const viewerEdges = preview.edges.filter(
    (edge) => edge.debtorId === viewerId || edge.creditorId === viewerId,
  );
  const selectedCount = watched.people.filter(
    (person) => person.selected,
  ).length;
  const payerName =
    watched.payerId === viewerId
      ? "You"
      : (people.find((person) => person.id === watched.payerId)?.name ??
        "Choose payer");
  const splitLabel = {
    EQUAL: "Equally",
    EXACT: "Exact amounts",
    PERCENTAGE: "Percentages",
    SHARES: "Shares",
  }[watched.splitType];
  async function save(values: ExpenseDraftOutput) {
    try {
      const { input } = buildExpenseDraft(viewerId, groupId, values);
      const result = expense
        ? await edit.mutateAsync({
            id: expense.id,
            input: editDraftInput(expense, input),
          })
        : await create.mutateAsync({ input, idempotencyKey: key });
      toast.success("Expense saved");
      const navigate = () => router.push("/expenses/" + result.id);
      if (drawer) drawer.complete(navigate);
      else navigate();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      else
        toast.error(
          error instanceof Error
            ? error.message
            : "Couldn't save. Check your connection and try again.",
        );
    }
  }
  return (
    <form
      onSubmit={(event) => {
        if (view !== "expense") {
          event.preventDefault();
          backToExpense();
        } else void handleSubmit(save)(event);
      }}
      className="space-y-5"
    >
      {conflict && (
        <Alert>
          <AlertDescription>
            This expense changed while you were editing. Load the latest version
            before saving.
          </AlertDescription>
          <Button type="button" onClick={reload}>
            Load latest
          </Button>
        </Alert>
      )}
      <fieldset disabled={pending || conflict} className="min-w-0 space-y-5">
        <div hidden={view !== "expense"} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              className="h-16 text-4xl tabular-nums md:text-4xl"
              {...register("amount")}
              aria-invalid={showAmountError}
              aria-describedby="amount-error"
              placeholder="0.00"
            />
            <p
              id="amount-error"
              role="status"
              className="text-sm text-destructive"
            >
              {showAmountError ? errors.amount?.message : null}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">What was it for?</Label>
            <Input
              id="description"
              {...register("description")}
              aria-invalid={!!errors.description}
            />
            <p role="status" className="text-sm text-destructive">
              {errors.description?.message}
            </p>
          </div>
          {composer && (
            <div className="space-y-2">
              <p className="text-sm font-medium">With</p>
              <div className="flex flex-wrap items-center gap-2">
                {groupId ? (
                  <span className="min-w-0 break-words rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                    {groupName}
                  </span>
                ) : (
                  selectedPeople.map((person) => (
                    <Button
                      key={person.id}
                      type="button"
                      variant="secondary"
                      className="h-auto min-h-11 max-w-full whitespace-normal break-words"
                      aria-label={
                        person.id === viewerId
                          ? "Change people"
                          : "Remove " + person.name
                      }
                      onClick={() => {
                        if (
                          person.id === viewerId ||
                          watched.splitType !== "EQUAL" ||
                          watched.multiplePayers ||
                          watched.payerId !== viewerId
                        ) {
                          openView("people");
                          return;
                        }
                        const index = people.findIndex(
                          (item) => item.id === person.id,
                        );
                        setValue(`people.${index}.selected`, false, {
                          shouldDirty: true,
                        });
                      }}
                    >
                      {person.id === viewerId ? (
                        "You"
                      ) : (
                        <>
                          {person.name}
                          <span aria-hidden="true"> ×</span>
                        </>
                      )}
                    </Button>
                  ))
                )}
                <Button
                  ref={peopleButton}
                  type="button"
                  variant="outline"
                  aria-label="Change people or group"
                  onClick={() => openView("people")}
                >
                  {groupId ? "Change group" : "Add people or group"}
                </Button>
              </div>
              {personal && (
                <p className="text-sm text-muted-foreground">Just for you</p>
              )}
            </div>
          )}
          <Card
            hidden={!!composer && personal}
            className="gap-0 divide-y divide-border py-0"
          >
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-between whitespace-normal px-4 py-3 text-left"
              aria-label="Paid by"
              onClick={() => openView("payer")}
            >
              <span>Paid by</span>
              <span className="ml-auto min-w-0 flex-1 break-words text-right text-muted-foreground">
                {watched.multiplePayers ? "Multiple people" : payerName}
              </span>
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-between whitespace-normal px-4 py-3 text-left"
              aria-label="Split"
              onClick={() => openView("split")}
            >
              <span>Split</span>
              <span className="ml-auto text-muted-foreground">
                {splitLabel}, {selectedCount}{" "}
                {selectedCount === 1 ? "person" : "people"}
              </span>
              <ChevronRight aria-hidden="true" />
            </Button>
          </Card>
          <Accordion type="single" collapsible>
            <AccordionItem value="details">
              <AccordionTrigger>
                {watched.date === todayDate() ? "Today" : watched.date},{" "}
                {watched.category || "Other"} — Details
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" {...register("date")} />
                  <p role="status" className="text-sm text-destructive">
                    {errors.date?.message}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    list="shared-categories"
                    {...register("category")}
                  />
                  <datalist id="shared-categories">
                    {expenseCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <p role="status" className="text-sm text-destructive">
                    {errors.category?.message}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea id="notes" {...register("notes")} />
                  <p role="status" className="text-sm text-destructive">
                    {errors.notes?.message}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        {view !== "expense" && view !== "people" && (
          <div className="flex items-center gap-3">
            <BackButton label="Back to expense" onClick={backToExpense} />
            <h2
              ref={editorHeading}
              tabIndex={-1}
              className="text-lg font-semibold"
            >
              {view === "payer" ? "Who paid?" : "Split the cost"}
            </h2>
          </div>
        )}
        <div hidden={view !== "payer"} className="space-y-4">
          <div className="flex min-h-11 items-center gap-3">
            <Checkbox
              id="multiple"
              checked={watched.multiplePayers}
              onCheckedChange={(value) =>
                setValue("multiplePayers", value === true, {
                  shouldDirty: true,
                })
              }
            />
            <Label htmlFor="multiple" className="min-h-11 flex-1 py-3">
              Multiple people paid
            </Label>
          </div>
          {!watched.multiplePayers ? (
            <Card className="gap-0 divide-y divide-border py-0">
              {people.map((person) => (
                <Button
                  key={person.id}
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-11 w-full justify-between whitespace-normal px-4 py-3 text-left"
                  aria-pressed={watched.payerId === person.id}
                  onClick={() => {
                    setValue("payerId", person.id, { shouldDirty: true });
                    backToExpense();
                  }}
                >
                  {person.id === viewerId ? "You" : person.name}
                  {watched.payerId === person.id && (
                    <span className="text-muted-foreground">Selected</span>
                  )}
                </Button>
              ))}
            </Card>
          ) : (
            <Card className="gap-0 divide-y divide-border py-0">
              {people.map((person, index) => (
                <div key={person.id} className="flex items-center gap-3 p-4">
                  <Label
                    htmlFor={"paid-" + person.id}
                    className="min-w-0 flex-1 break-words"
                  >
                    {person.id === viewerId ? "You" : person.name}
                  </Label>
                  <Input
                    id={"paid-" + person.id}
                    className="w-28"
                    aria-label={person.name + " paid"}
                    inputMode="decimal"
                    {...register(`people.${index}.paid`)}
                  />
                </div>
              ))}
            </Card>
          )}
        </div>
        <div hidden={view !== "split"} className="space-y-4">
          <Select
            value={watched.splitType}
            onValueChange={(value) =>
              setValue(
                "splitType",
                expenseDraftSchema.shape.splitType.parse(value),
                { shouldDirty: true },
              )
            }
          >
            <SelectTrigger className="w-full" aria-label="Split type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const).map(
                (value) => (
                  <SelectItem key={value} value={value}>
                    {
                      {
                        EQUAL: "Equally",
                        EXACT: "Exact amounts",
                        PERCENTAGE: "Percentages",
                        SHARES: "Shares",
                      }[value]
                    }
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Select who shares the cost. Someone who paid can stay unchecked.
          </p>
          <Card className="gap-0 divide-y divide-border py-0">
            {people.map((person, index) => {
              const share = preview.shares.find(
                (row) => row.userId === person.id,
              );
              return (
                <div
                  key={person.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-2"
                >
                  <Checkbox
                    id={"person-" + person.id}
                    checked={watched.people?.[index]?.selected ?? false}
                    onCheckedChange={(value) =>
                      setValue(`people.${index}.selected`, value === true, {
                        shouldDirty: true,
                      })
                    }
                  />
                  <Label
                    htmlFor={"person-" + person.id}
                    className="min-h-11 min-w-0 flex-1 break-words py-3"
                  >
                    {person.id === viewerId ? "You" : person.name}
                  </Label>
                  {watched.splitType !== "EQUAL" &&
                    watched.people?.[index]?.selected && (
                      <Input
                        className="w-24"
                        aria-label={
                          person.name +
                          (watched.splitType === "EXACT"
                            ? " owes"
                            : watched.splitType === "PERCENTAGE"
                              ? " percentage"
                              : " shares")
                        }
                        inputMode="decimal"
                        {...register(`people.${index}.value`)}
                      />
                    )}
                  {share && <Money amount={share.owed} />}
                </div>
              );
            })}
          </Card>
        </div>
        {view === "people" && composer && (
          <ExpensePeoplePicker
            composer={composer}
            selection={{
              groupId,
              groupName,
              people,
              selectedIds: selectedPeople.map((person) => person.id),
            }}
            resetWarning={
              watched.splitType !== "EQUAL" ||
              watched.multiplePayers ||
              watched.payerId !== viewerId
            }
            onCancel={backToExpense}
            onApply={(selection) => {
              const next = changeExpensePeople(
                getValues(),
                viewerId,
                selection.people.map((person) => person.id),
                selection.selectedIds,
              );
              setPeople(selection.people);
              setGroupId(selection.groupId);
              setGroupName(selection.groupName);
              setValue("people", next.people, { shouldDirty: true });
              setValue("splitType", next.splitType, { shouldDirty: true });
              setValue("payerId", next.payerId, { shouldDirty: true });
              setValue("multiplePayers", false, { shouldDirty: true });
              backToExpense();
            }}
          />
        )}
      </fieldset>
      <div
        hidden={view === "people"}
        className="form-drawer-actions space-y-3 border-t border-border"
      >
        <div
          aria-live="polite"
          className="space-y-1 text-sm text-muted-foreground"
        >
          {preview.remainders?.paid !== undefined &&
            preview.remainders.paid !== 0 && (
              <p>
                <Money amount={Math.abs(preview.remainders.paid)} />{" "}
                {preview.remainders.paid > 0
                  ? "left to assign to payers"
                  : "over the total in payments"}
              </p>
            )}
          {preview.remainders?.owed !== null &&
            preview.remainders?.owed !== undefined &&
            preview.remainders.owed !== 0 && (
              <p>
                <Money amount={Math.abs(preview.remainders.owed)} />{" "}
                {preview.remainders.owed > 0
                  ? "left to assign in the split"
                  : "over the total in the split"}
              </p>
            )}
          {preview.error && (watched.amount || isSubmitted) && (
            <p>{preview.error}</p>
          )}
          {!watched.amount && !isSubmitted && (
            <p>Enter an amount and description to save.</p>
          )}
          {!preview.error && !personal && (
            <p>
              {splitLabel} among {selectedCount}{" "}
              {selectedCount === 1 ? "person" : "people"}.
            </p>
          )}
          {yourShare && (
            <p>
              Your share: <Money amount={yourShare.owed} />
            </p>
          )}
          {viewerEdges.slice(0, 2).map((edge) => (
            <p key={edge.debtorId + ":" + edge.creditorId}>
              {edge.debtorId === viewerId ? (
                <>
                  You owe{" "}
                  {
                    people.find((person) => person.id === edge.creditorId)?.name
                  }{" "}
                </>
              ) : (
                <>
                  {people.find((person) => person.id === edge.debtorId)?.name}{" "}
                  owes you{" "}
                </>
              )}
              <Money amount={edge.amount} />
            </p>
          ))}
          {viewerEdges.length > 2 && (
            <p>
              {viewerEdges.length - 2} more balances. Open Split to see
              everyone’s share.
            </p>
          )}
        </div>
        {view === "expense" ? (
          <Button
            className="w-full"
            type="submit"
            disabled={!!preview.error || pending || conflict}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        ) : (
          <Button
            className="w-full"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              backToExpense();
            }}
          >
            Done
          </Button>
        )}
      </div>
    </form>
  );
}
