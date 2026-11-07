"use client";
import {
  useDrawerFormState,
  useFormDrawer,
} from "@/components/common/FormDrawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AmountInput } from "@/components/money/AmountInput";
import { useCreateExpense, useEditExpense } from "@/hooks/use-expenses";
import { expenseCategories } from "@/lib/validation/expense";
import { ApiError } from "@/lib/api/client";
import type { ExpenseDetail } from "@/lib/api/expenses";
import {
  personalExpenseFormSchema,
  personalExpenseInput,
  amountInputValue,
  todayDate,
  type PersonalExpenseFormInput,
  type PersonalExpenseFormOutput,
} from "@/lib/validation/personal-expense";

export function PersonalExpenseForm({
  viewerId,
  expense,
  reload,
}: {
  viewerId: string;
  expense?: ExpenseDetail;
  reload?: () => void;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [conflict, setConflict] = useState(false);
  const create = useCreateExpense();
  const edit = useEditExpense();
  const router = useRouter();
  const drawer = useFormDrawer();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PersonalExpenseFormInput, unknown, PersonalExpenseFormOutput>({
    resolver: zodResolver(personalExpenseFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      amount: expense ? amountInputValue(expense.amount) : "",
      description: expense?.description ?? "",
      category: expense?.category ?? "Other",
      date: expense?.date ?? todayDate(),
      notes: expense?.notes ?? "",
    },
  });
  useDrawerFormState(isDirty, create.isPending || edit.isPending);
  async function save(values: PersonalExpenseFormOutput) {
    try {
      const input = personalExpenseInput(viewerId, values);
      const result = expense
        ? await edit.mutateAsync({
            id: expense.id,
            input: { ...input, version: expense.version },
          })
        : await create.mutateAsync({ input, idempotencyKey });
      toast.success("Expense saved");
      const navigate = () => router.push("/expenses/" + result.id);
      if (drawer) drawer.complete(navigate);
      else navigate();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      else toast.error("Couldn't save. Check your connection and try again.");
    }
  }
  const pending = create.isPending || edit.isPending;
  return (
    <form onSubmit={handleSubmit(save)} className="space-y-5">
      {conflict && (
        <Alert>
          <AlertTitle>This expense changed while you were editing.</AlertTitle>
          <AlertDescription>
            Load the latest version before saving. Your current draft stays
            visible until then.
          </AlertDescription>
          <Button type="button" variant="outline" onClick={reload}>
            Load latest
          </Button>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (INR)</Label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <AmountInput
              id="amount"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              invalid={!!errors.amount}
            />
          )}
        />
        <p role="status" className="text-sm text-destructive">
          {errors.amount?.message}
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
      <Accordion type="single" collapsible>
        <AccordionItem value="details">
          <AccordionTrigger>Date, category and notes</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                list="categories"
                {...register("category")}
              />
              <datalist id="categories">
                {expenseCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <p role="status" className="text-sm text-destructive">
                {errors.category?.message}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
              <p role="status" className="text-sm text-destructive">
                {errors.date?.message}
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
      <p className="text-muted-foreground">Just for you</p>
      <div className="form-drawer-actions flex gap-3 border-t border-border">
        <Button className="flex-1" type="submit" disabled={pending || conflict}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
