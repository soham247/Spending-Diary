import {
  expenseActivitySnapshotSchema,
  activityMetadataSchema,
} from "@/lib/validation/activity";
import { createExpenseSchema } from "@/lib/validation/expense";
import { isIncludedInSplit, resolveShares } from "@/lib/domain/splits";
import { splitWeightLabel } from "@/lib/domain/expense-detail";

export type ExpenseChange =
  | {
      kind: "money";
      label: string;
      before: number;
      after: number;
      currency: string;
    }
  | { kind: "text"; label: string; before: string; after: string };

export function expenseHistoryChanges(
  metadata: unknown,
  names: ReadonlyMap<string, string>,
): ExpenseChange[] {
  const meta = activityMetadataSchema.safeParse(metadata);
  if (!meta.success) return [];
  const before = expenseActivitySnapshotSchema.safeParse(meta.data.before);
  let afterSnapshot: unknown = meta.data.after;
  const input = createExpenseSchema.safeParse(afterSnapshot);
  if (input.success) {
    try {
      const shares = resolveShares(input.data);
      afterSnapshot = {
        ...input.data,
        participants: input.data.participants.map((person) => ({
          ...person,
          owed: shares.get(person.userId),
          splitInput:
            person.includedInSplit === false
              ? "0"
              : "percentage" in person
                ? String(person.percentage)
                : "shares" in person
                  ? String(person.shares)
                  : null,
        })),
      };
    } catch {
      return [];
    }
  }
  const after = expenseActivitySnapshotSchema.safeParse(afterSnapshot);
  if (!before.success || !after.success) return [];
  const old = before.data;
  const next = after.data;
  const changes: ExpenseChange[] = [];
  const currency = next.currency ?? old.currency;
  const comparableCurrency =
    currency &&
    (!old.currency || !next.currency || old.currency === next.currency);
  if (
    old.amount !== undefined &&
    next.amount !== undefined &&
    old.amount !== next.amount &&
    comparableCurrency
  ) {
    changes.push({
      kind: "money",
      label: "Bill total",
      before: old.amount,
      after: next.amount,
      currency,
    });
  }
  const splitLabels = {
    EQUAL: "Equal",
    EXACT: "Custom amounts",
    PERCENTAGE: "Percentage",
    SHARES: "Shares",
  };
  for (const [key, label] of [
    ["description", "Description"],
    ["date", "Date"],
    ["category", "Category"],
    ["notes", "Notes"],
    ["splitType", "Split method"],
  ] as const) {
    const a = old[key];
    const b = next[key];
    if (a !== undefined && b !== undefined && a !== b) {
      changes.push({
        kind: "text",
        label,
        before:
          key === "splitType" && old.splitType
            ? splitLabels[old.splitType]
            : a || "None",
        after:
          key === "splitType" && next.splitType
            ? splitLabels[next.splitType]
            : b || "None",
      });
    }
  }
  if (old.participants && next.participants) {
    const previous = new Map(
      old.participants.map((person) => [person.userId, person]),
    );
    const current = new Map(
      next.participants.map((person) => [person.userId, person]),
    );
    for (const userId of new Set([...previous.keys(), ...current.keys()])) {
      const a = previous.get(userId);
      const b = current.get(userId);
      const name = names.get(userId) ?? "Participant";
      if (!a || !b)
        changes.push({
          kind: "text",
          label: name,
          before: a ? "Included" : "Not included",
          after: b ? "Included" : "Removed",
        });
      if (a && b) {
        const includedBefore =
          a.includedInSplit ??
          (isIncludedInSplit(a.splitInput ?? null) ||
            (old.splitType === "EXACT" && a.owed > 0));
        const includedAfter =
          b.includedInSplit ??
          (isIncludedInSplit(b.splitInput ?? null) ||
            (next.splitType === "EXACT" && b.owed > 0));
        if (includedBefore !== includedAfter)
          changes.push({
            kind: "text",
            label: `${name} — split`,
            before: includedBefore ? "Included" : "Not sharing",
            after: includedAfter ? "Included" : "Not sharing",
          });
        if (old.splitType && next.splitType) {
          const weightBefore = splitWeightLabel(
            old.splitType,
            a.splitInput ?? null,
          );
          const weightAfter = splitWeightLabel(
            next.splitType,
            b.splitInput ?? null,
          );
          if (weightBefore && weightAfter && weightBefore !== weightAfter)
            changes.push({
              kind: "text",
              label: `${name} — allocation`,
              before: weightBefore,
              after: weightAfter,
            });
        }
      }
      if (comparableCurrency) {
        for (const [key, label] of [
          ["paid", "paid"],
          ["owed", "share"],
        ] as const) {
          if ((a?.[key] ?? 0) !== (b?.[key] ?? 0))
            changes.push({
              kind: "money",
              label: `${name} — ${label}`,
              before: a?.[key] ?? 0,
              after: b?.[key] ?? 0,
              currency,
            });
        }
      }
    }
  }
  return changes;
}
