import "server-only";
import {
  and,
  desc,
  eq,
  exists,
  isNull,
  isNotNull,
  lt,
  or,
  gte,
  lte,
  gt,
  sum,
  getTableColumns,
} from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  expenses,
  expenseParticipants,
  groupMembers,
  groups,
  users,
  contacts,
} from "@/lib/db/schema";
import { ValidationError } from "@/lib/utils/errors";
import { isIncludedInSplit } from "@/lib/domain/splits";
import {
  expenseListSchema,
  type ExpenseListInput,
} from "@/lib/validation/expense";
import { toSafeNumber } from "@/lib/utils/to-safe-number";
import { nextMonthStart } from "@/lib/utils/expense-month";

export async function listExpenses(
  viewerId: string,
  raw: ExpenseListInput = {},
) {
  const input = expenseListSchema.parse(raw);
  const filter = and(
    visible(viewerId),
    input.groupId ? eq(expenses.groupId, input.groupId) : undefined,
    input.friendId
      ? and(
          exists(
            db
              .select({ id: expenseParticipants.userId })
              .from(expenseParticipants)
              .where(
                and(
                  eq(expenseParticipants.expenseId, expenses.id),
                  eq(expenseParticipants.userId, input.friendId),
                ),
              ),
          ),
          exists(
            db
              .select({ id: expenseParticipants.userId })
              .from(expenseParticipants)
              .where(
                and(
                  eq(expenseParticipants.expenseId, expenses.id),
                  eq(expenseParticipants.userId, viewerId),
                ),
              ),
          ),
        )
      : undefined,
    input.deleted === "true"
      ? isNotNull(expenses.deletedAt)
      : isNull(expenses.deletedAt),
    input.kind ? eq(expenses.kind, input.kind) : undefined,
  );
  const scopeFilter = and(
    filter,
    input.scope === "mine"
      ? exists(
          db
            .select({ id: expenseParticipants.userId })
            .from(expenseParticipants)
            .where(
              and(
                eq(expenseParticipants.expenseId, expenses.id),
                eq(expenseParticipants.userId, viewerId),
                gt(expenseParticipants.owed, 0),
              ),
            ),
        )
      : undefined,
  );
  const dates = input.history
    ? await db
        .selectDistinct({ date: expenses.date })
        .from(expenses)
        .where(scopeFilter)
        .orderBy(desc(expenses.date))
    : [];
  const availableMonths = [
    ...new Set(dates.map((row) => row.date.slice(0, 7))),
  ];
  const selectedMonth =
    input.from || input.to || input.month === "all"
      ? null
      : input.month && input.month !== "latest"
        ? input.month
        : (availableMonths[0] ?? null);
  const rangeFilter = and(
    scopeFilter,
    input.from ? gte(expenses.date, input.from) : undefined,
    input.to ? lte(expenses.date, input.to) : undefined,
    input.history && selectedMonth
      ? gte(expenses.date, selectedMonth + "-01")
      : undefined,
    input.history && selectedMonth
      ? lt(expenses.date, nextMonthStart(selectedMonth))
      : undefined,
  );
  const dailyTotals = input.history
    ? await db
        .select({
          date: expenses.date,
          currency: expenses.currency,
          amount: sum(expenseParticipants.owed),
        })
        .from(expenses)
        .leftJoin(
          expenseParticipants,
          and(
            eq(expenseParticipants.expenseId, expenses.id),
            eq(expenseParticipants.userId, viewerId),
          ),
        )
        .where(and(rangeFilter, isNull(expenses.deletedAt)))
        .groupBy(expenses.date, expenses.currency)
        .orderBy(desc(expenses.date), expenses.currency)
    : [];
  const monthly = new Map<string, Map<string, bigint>>();
  for (const row of dailyTotals) {
    const month = row.date.slice(0, 7);
    const totals = monthly.get(month) ?? new Map<string, bigint>();
    totals.set(
      row.currency,
      (totals.get(row.currency) ?? BigInt(0)) + BigInt(row.amount ?? "0"),
    );
    monthly.set(month, totals);
  }
  const history = input.history
    ? {
        availableMonths,
        selectedMonth,
        monthlySpending: [...monthly].map(([month, totals]) => ({
          month,
          totals: [...totals].map(([currency, amount]) => ({
            currency,
            amount: toSafeNumber(amount),
          })),
        })),
      }
    : {};
  const totals =
    input.scope === "mine"
      ? await db
          .select({
            currency: expenses.currency,
            amount: sum(expenseParticipants.owed),
          })
          .from(expenses)
          .innerJoin(
            expenseParticipants,
            and(
              eq(expenseParticipants.expenseId, expenses.id),
              eq(expenseParticipants.userId, viewerId),
            ),
          )
          .where(and(rangeFilter, isNull(expenses.deletedAt)))
          .groupBy(expenses.currency)
          .orderBy(expenses.currency)
      : undefined;
  const spendingTotals = totals?.map((row) => ({
    currency: row.currency,
    amount: toSafeNumber(BigInt(row.amount ?? "0")),
  }));
  const [anchor] = input.cursor
    ? await db
        .select()
        .from(expenses)
        .where(and(rangeFilter, eq(expenses.id, input.cursor)))
    : [];
  if (input.cursor && !anchor)
    return { items: [], nextCursor: null, spendingTotals, ...history };
  const rows = await db
    .select({
      ...getTableColumns(expenses),
      yourShare: expenseParticipants.owed,
    })
    .from(expenses)
    .leftJoin(
      expenseParticipants,
      and(
        eq(expenseParticipants.expenseId, expenses.id),
        eq(expenseParticipants.userId, viewerId),
      ),
    )
    .where(
      and(
        rangeFilter,
        anchor
          ? or(
              lt(expenses.date, anchor.date),
              and(eq(expenses.date, anchor.date), lt(expenses.id, anchor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(expenses.date), desc(expenses.id))
    .limit(31);
  return {
    items: rows.slice(0, 30),
    nextCursor: rows.length > 30 ? rows[29]!.id : null,
    spendingTotals,
    ...history,
  };
}

function visible(viewerId: string) {
  return or(
    exists(
      db
        .select({ id: expenseParticipants.userId })
        .from(expenseParticipants)
        .where(
          and(
            eq(expenseParticipants.expenseId, expenses.id),
            eq(expenseParticipants.userId, viewerId),
          ),
        ),
    ),
    exists(
      db
        .select({ id: groupMembers.userId })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, expenses.groupId),
            eq(groupMembers.userId, viewerId),
            eq(groupMembers.status, "ACTIVE"),
          ),
        ),
    ),
  );
}
export async function getExpenseById(viewerId: string, expenseId: string) {
  const [row] = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.id, expenseId),
        isNull(expenses.deletedAt),
        visible(viewerId),
      ),
    );
  if (!row) return null;
  const participantRows = await db
    .select({
      userId: expenseParticipants.userId,
      paid: expenseParticipants.paid,
      owed: expenseParticipants.owed,
      splitInput: expenseParticipants.splitInput,
      name: users.name,
      nickname: contacts.nickname,
    })
    .from(expenseParticipants)
    .innerJoin(users, eq(users.id, expenseParticipants.userId))
    .leftJoin(
      contacts,
      and(
        eq(contacts.userId, expenseParticipants.userId),
        eq(contacts.ownerId, viewerId),
      ),
    )
    .where(eq(expenseParticipants.expenseId, expenseId));
  const participants = participantRows.map(({ nickname, ...person }) => ({
    ...person,
    name: nickname || person.name,
    includedInSplit:
      row.splitType === "EXACT"
        ? isIncludedInSplit(person.splitInput) || person.owed > 0
        : isIncludedInSplit(person.splitInput),
  }));
  const [membership] = row.groupId
    ? await db
        .select({ role: groupMembers.role, archivedAt: groups.archivedAt })
        .from(groupMembers)
        .innerJoin(groups, eq(groups.id, groupMembers.groupId))
        .where(
          and(
            eq(groupMembers.groupId, row.groupId),
            eq(groupMembers.userId, viewerId),
            eq(groupMembers.status, "ACTIVE"),
          ),
        )
    : [];
  const canEdit =
    (participants.some((p) => p.userId === viewerId) ||
      membership?.role === "ADMIN") &&
    (!row.groupId || (!!membership && !membership.archivedAt));
  return { ...row, participants, canEdit };
}
export async function getGroupExpenses(
  viewerId: string,
  groupId: string,
  limit = 30,
  cursor?: string,
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new ValidationError("Invalid page size");
  const [anchor] = cursor
    ? await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.id, cursor),
            eq(expenses.groupId, groupId),
            isNull(expenses.deletedAt),
            visible(viewerId),
          ),
        )
    : [];
  if (cursor && !anchor) return { items: [], nextCursor: null };
  const rows = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.groupId, groupId),
        isNull(expenses.deletedAt),
        visible(viewerId),
        anchor
          ? or(
              lt(expenses.date, anchor.date),
              and(eq(expenses.date, anchor.date), lt(expenses.id, anchor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(expenses.date), desc(expenses.id))
    .limit(limit + 1);
  return {
    items: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1]!.id : null,
  };
}
