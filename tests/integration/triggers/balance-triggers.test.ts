/**
 * Integration tests for the balance deferred constraint triggers.
 *
 * These tests require a real PostgreSQL database with migrations applied.
 * Run with: npm run test:integration
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { sql as query } from "drizzle-orm";
import type { DbTx, Database } from "@/lib/db/client";

let db: Database;

beforeEach(async () => {
  const mod = await import("@/lib/db/client");
  db = mod.db;
});

// ─── Helpers ────────────────────────────────────────────────────────

type Executor = Database | DbTx;

async function exec(tx: Executor, sql: string, params: unknown[] = []) {
  const pieces = sql.split(/\$(\d+)/);
  return tx.execute(query.join(pieces.map((piece, i) => i % 2 ? query`${params[Number(piece) - 1]}` : query.raw(piece)), query.raw("")));
}

async function insertUser(tx: Executor, overrides: Partial<{ name: string; email: string }> = {}) {
  const userId = createId();
  await exec(
    tx,
    `INSERT INTO users (id, name, email, email_verified, status, default_currency, created_at, updated_at)
     VALUES ($1, $2, $3, true, 'ACTIVE', 'INR', now(), now())`,
    [userId, overrides.name ?? "Test User", overrides.email ?? `${userId}@example.com`],
  );
  return userId;
}

async function insertExpense(tx: Executor, opts: { amount: number; createdById: string }) {
  const expenseId = createId();
  await exec(
    tx,
    `INSERT INTO expenses
       (id, kind, description, category, amount, currency, split_type, date, created_by_id, version, created_at, updated_at)
     VALUES ($1, 'SHARED', 'Test', 'Other', $2, 'INR', 'EQUAL', CURRENT_DATE, $3, 1, now(), now())`,
    [expenseId, opts.amount, opts.createdById],
  );
  return expenseId;
}

async function insertParticipant(
  tx: Executor,
  expenseId: string,
  userId: string,
  paid: number,
  owed: number,
) {
  await exec(
    tx,
    `INSERT INTO expense_participants (expense_id, user_id, paid, owed) VALUES ($1, $2, $3, $4)`,
    [expenseId, userId, paid, owed],
  );
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("balance deferred triggers", () => {
  it("allows a perfectly balanced expense", async () => {
    await db.transaction(async (tx) => {
      const u1 = await insertUser(tx);
      const u2 = await insertUser(tx);
      const expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
      await insertParticipant(tx, expId, u1, 1000, 500);
      await insertParticipant(tx, expId, u2, 0, 500);
    });
  });

  it("rejects an expense committed with no participants", async () => {
    await expect(
      db.transaction(async (tx) => {
        const u1 = await insertUser(tx);
        await insertExpense(tx, { amount: 1000, createdById: u1 });
        // No participants — trigger fires on INSERT to expenses at commit
      }),
    ).rejects.toMatchObject({ cause: { code: "23514", message: expect.stringMatching(/unbalanced/i) } });
  });

  it("rejects unbalanced paid total", async () => {
    await expect(
      db.transaction(async (tx) => {
        const u1 = await insertUser(tx);
        const u2 = await insertUser(tx);
        const expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
        await insertParticipant(tx, expId, u1, 800, 500); // paid sums to 800, not 1000
        await insertParticipant(tx, expId, u2, 0, 500);
      }),
    ).rejects.toMatchObject({ cause: { code: "23514", message: expect.stringMatching(/unbalanced/i) } });
  });

  it("rejects unbalanced owed total", async () => {
    await expect(
      db.transaction(async (tx) => {
        const u1 = await insertUser(tx);
        const u2 = await insertUser(tx);
        const expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
        await insertParticipant(tx, expId, u1, 1000, 600);
        await insertParticipant(tx, expId, u2, 0, 300); // owed sums to 900, not 1000
      }),
    ).rejects.toMatchObject({ cause: { code: "23514", message: expect.stringMatching(/unbalanced/i) } });
  });

  it("rejects participant delete that unbalances expense", async () => {
    let expId: string;
    let u2: string;
    await db.transaction(async (tx) => {
      const u1 = await insertUser(tx);
      u2 = await insertUser(tx);
      expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
      await insertParticipant(tx, expId!, u1, 1000, 500);
      await insertParticipant(tx, expId!, u2, 0, 500);
    });

    await expect(
      db.transaction(async (tx) => {
        await exec(tx, `DELETE FROM expense_participants WHERE expense_id = $1 AND user_id = $2`, [expId!, u2!]);
      }),
    ).rejects.toMatchObject({ cause: { code: "23514", message: expect.stringMatching(/unbalanced/i) } });
  });

  it("rejects amount change that breaks balance", async () => {
    let expId: string;
    await db.transaction(async (tx) => {
      const u1 = await insertUser(tx);
      const u2 = await insertUser(tx);
      expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
      await insertParticipant(tx, expId, u1, 1000, 500);
      await insertParticipant(tx, expId, u2, 0, 500);
    });

    await expect(
      db.transaction(async (tx) => {
        await exec(tx, `UPDATE expenses SET amount = 2000 WHERE id = $1`, [expId!]);
      }),
    ).rejects.toMatchObject({ cause: { code: "23514", message: expect.stringMatching(/unbalanced/i) } });
  });

  it("rejects restore of a soft-deleted expense with tampered participants", async () => {
    let expId: string;
    let u2: string;
    // Create balanced + soft-delete + tamper in one transaction
    await db.transaction(async (tx) => {
      const u1 = await insertUser(tx);
      u2 = await insertUser(tx);
      expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
      await insertParticipant(tx, expId, u1, 1000, 500);
      await insertParticipant(tx, expId, u2, 0, 500);
      // Soft-delete to bypass the expense trigger for subsequent participant changes
      await exec(tx, `UPDATE expenses SET deleted_at = now() WHERE id = $1`, [expId]);
      // Remove a participant while expense is deleted
      await exec(tx, `DELETE FROM expense_participants WHERE expense_id = $1 AND user_id = $2`, [expId, u2]);
    });

    // Restore — trigger fires and catches the imbalance
    await expect(
      db.transaction(async (tx) => {
        await exec(tx, `UPDATE expenses SET deleted_at = NULL WHERE id = $1`, [expId!]);
      }),
    ).rejects.toMatchObject({ cause: { code: "23514", message: expect.stringMatching(/unbalanced/i) } });
  });

  it("allows restore of a fully balanced expense", async () => {
    let expId: string;
    await db.transaction(async (tx) => {
      const u1 = await insertUser(tx);
      const u2 = await insertUser(tx);
      expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
      await insertParticipant(tx, expId, u1, 1000, 500);
      await insertParticipant(tx, expId, u2, 0, 500);
    });
    await exec(db, `UPDATE expenses SET deleted_at = now() WHERE id = $1`, [expId!]);
    await db.transaction(async (tx) => {
      await exec(tx, `UPDATE expenses SET deleted_at = NULL WHERE id = $1`, [expId!]);
    });
  });

  it("allows intermediate imbalance within a single transaction", async () => {
    await db.transaction(async (tx) => {
      const u1 = await insertUser(tx);
      const u2 = await insertUser(tx);
      const expId = await insertExpense(tx, { amount: 1000, createdById: u1 });
      // Only one participant inserted — temporarily unbalanced but deferred
      await insertParticipant(tx, expId, u1, 1000, 500);
      // Second participant added before commit
      await insertParticipant(tx, expId, u2, 0, 500);
    });
  });
});
