import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  bigserial,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const tz = { withTimezone: true } as const;

const id = () => text("id").primaryKey().$defaultFn(() => createId());
const money = (name: string) => integer(name);
const balanceMoney = (name: string) => bigint(name, { mode: "bigint" });
const createdAt = () =>
  timestamp("created_at", tz).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", tz)
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

// ─── Enums ─────────────────────────────────────────────────────────

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "INVITED",
  "DELETED",
]);
export const friendshipStatusEnum = pgEnum("friendship_status", [
  "ACCEPTED",
  "BLOCKED",
]);
export const groupTypeEnum = pgEnum("group_type", [
  "TRIP",
  "HOME",
  "COUPLE",
  "OTHER",
]);
export const memberRoleEnum = pgEnum("member_role", ["ADMIN", "MEMBER"]);
export const memberStatusEnum = pgEnum("member_status", [
  "ACTIVE",
  "LEFT",
  "REMOVED",
]);
export const inviteTypeEnum = pgEnum("invite_type", [
  "DIRECT",
  "GROUP_LINK",
  "PERSONAL",
]);
export const expenseKindEnum = pgEnum("expense_kind", [
  "SHARED",
  "PERSONAL",
]);
export const splitTypeEnum = pgEnum("split_type", [
  "EQUAL",
  "EXACT",
  "PERCENTAGE",
  "SHARES",
]);
export const settlementMethodEnum = pgEnum("settlement_method", [
  "CASH",
  "UPI",
  "OTHER",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "EXPENSE_CREATED",
  "EXPENSE_UPDATED",
  "EXPENSE_DELETED",
  "EXPENSE_RESTORED",
  "SETTLEMENT_CREATED",
  "SETTLEMENT_DELETED",
  "MEMBER_JOINED",
  "MEMBER_LEFT",
  "MEMBER_REMOVED",
  "GROUP_CREATED",
  "GROUP_UPDATED",
  "INVITE_CLAIMED",
]);

// ─── Auth tables (managed by Better Auth, extended with app fields) ─

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // App fields
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  phone: text("phone"),
  upiId: text("upi_id"),
  defaultCurrency: char("default_currency", { length: 3 })
    .notNull()
    .default("INR"),
  notificationPrefs: jsonb("notification_prefs"),
  mergedIntoId: text("merged_into_id").references(
    (): AnyPgColumn => users.id,
  ),
  deletedAt: timestamp("deleted_at", tz),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", tz).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [index("idx_sessions_user").on(t.userId)]);

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", tz),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", tz),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [index("idx_accounts_user").on(t.userId)]);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", tz).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [index("idx_verifications_identifier").on(t.identifier)]);

// ─── Rate limiting ──────────────────────────────────────────────────

export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
  window: integer("window"),
  namespace: text("namespace"),
});

export const emailRateLimits = pgTable("email_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowEndsAt: timestamp("window_ends_at", tz).notNull(),
});

export const idempotencyRecords = pgTable("idempotency_records", {
  viewerId: text("viewer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  operation: text("operation").notNull(),
  key: text("key").notNull(),
  requestHash: text("request_hash").notNull(),
  resourceId: text("resource_id").notNull(),
  createdAt: createdAt(),
}, t => [
  primaryKey({ columns: [t.viewerId, t.operation, t.key] }),
  check("ck_idempotency_operation", sql`${t.operation} IN ('expense', 'settlement')`),
  check("ck_idempotency_key", sql`char_length(${t.key}) BETWEEN 1 AND 200`),
]);

// ─── Core tables ────────────────────────────────────────────────────

export const friendships = pgTable(
  "friendships",
  {
    userLowId: text("user_low_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userHighId: text("user_high_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: friendshipStatusEnum("status").notNull().default("ACCEPTED"),
    blockedById: text("blocked_by_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userLowId, t.userHighId] }),
    check("ck_friendship_pair_order", sql`${t.userLowId} < ${t.userHighId}`),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    nickname: text("nickname").notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.userId] })],
);

export const groups = pgTable("groups", {
  id: id(),
  name: text("name").notNull(),
  type: groupTypeEnum("type").notNull().default("OTHER"),
  currency: char("currency", { length: 3 }).notNull().default("INR"),
  simplifyDebts: boolean("simplify_debts").notNull().default(true),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  archivedAt: timestamp("archived_at", tz),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: memberRoleEnum("role").notNull().default("MEMBER"),
    status: memberStatusEnum("status").notNull().default("ACTIVE"),
    joinedAt: timestamp("joined_at", tz).notNull().defaultNow(),
    leftAt: timestamp("left_at", tz),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index("idx_group_members_user_status").on(t.userId, t.status),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: id(),
    tokenHash: text("token_hash").notNull(),
    type: inviteTypeEnum("type").notNull(),
    groupId: text("group_id").references(() => groups.id, {
      onDelete: "restrict",
    }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    inviteeUserId: text("invitee_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    expiresAt: timestamp("expires_at", tz),
    revokedAt: timestamp("revoked_at", tz),
    claimedById: text("claimed_by_id").references(() => users.id),
    claimedAt: timestamp("claimed_at", tz),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("idx_invites_token_hash").on(t.tokenHash)],
);

// ─── Money tables ───────────────────────────────────────────────────

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    groupId: text("group_id").references(() => groups.id, {
      onDelete: "restrict",
    }),
    kind: expenseKindEnum("kind").notNull().default("SHARED"),
    description: text("description").notNull(),
    category: text("category").notNull(),
    notes: text("notes"),
    amount: money("amount").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    splitType: splitTypeEnum("split_type").notNull().default("EQUAL"),
    date: date("date", { mode: "string" }).notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    version: integer("version").notNull().default(1),
    idempotencyKey: text("idempotency_key"),
    deletedAt: timestamp("deleted_at", tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("ck_expense_amount_positive", sql`${t.amount} > 0`),
    uniqueIndex("idx_expense_idempotency")
      .on(t.createdById, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    index("idx_expenses_group_date")
      .on(t.groupId, t.date, t.id)
      .where(sql`${t.deletedAt} IS NULL`),
    index("idx_expenses_group_deleted")
      .on(t.groupId)
      .where(sql`${t.deletedAt} IS NOT NULL`),
  ],
);

export const expenseParticipants = pgTable(
  "expense_participants",
  {
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    paid: money("paid").notNull(),
    owed: money("owed").notNull(),
    splitInput: numeric("split_input", { precision: 12, scale: 4 }),
  },
  (t) => [
    primaryKey({ columns: [t.expenseId, t.userId] }),
    check("ck_participant_paid_gte_zero", sql`${t.paid} >= 0`),
    check("ck_participant_owed_gte_zero", sql`${t.owed} >= 0`),
    index("idx_participants_user_expense").on(t.userId, t.expenseId),
  ],
);

export const settlements = pgTable(
  "settlements",
  {
    id: id(),
    groupId: text("group_id").references(() => groups.id, {
      onDelete: "restrict",
    }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: money("amount").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    method: settlementMethodEnum("method").notNull().default("CASH"),
    externalRef: text("external_ref"),
    note: text("note"),
    date: date("date", { mode: "string" }).notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key"),
    deletedAt: timestamp("deleted_at", tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("ck_settlement_amount_positive", sql`${t.amount} > 0`),
    check(
      "ck_settlement_different_users",
      sql`${t.fromUserId} <> ${t.toUserId}`,
    ),
    index("idx_settlements_from_user").on(t.fromUserId),
    index("idx_settlements_to_user").on(t.toUserId),
  ],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    scopeId: text("scope_id").notNull(),
    debtorId: text("debtor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    creditorId: text("creditor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: money("amount").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    expenseId: text("expense_id").references(() => expenses.id, {
      onDelete: "restrict",
    }),
    settlementId: text("settlement_id").references(() => settlements.id, {
      onDelete: "restrict",
    }),
    createdAt: createdAt(),
    voidedAt: timestamp("voided_at", tz),
  },
  (t) => [
    check(
      "ck_ledger_different_users",
      sql`${t.debtorId} <> ${t.creditorId}`,
    ),
    check("ck_ledger_amount_positive", sql`${t.amount} > 0`),
    check(
      "ck_ledger_exactly_one_source",
      sql`num_nonnulls(${t.expenseId}, ${t.settlementId}) = 1`,
    ),
    index("idx_ledger_scope_pair")
      .on(t.scopeId, t.debtorId, t.creditorId)
      .where(sql`${t.voidedAt} IS NULL`),
    index("idx_ledger_expense").on(t.expenseId),
    index("idx_ledger_settlement").on(t.settlementId),
  ],
);

export const balances = pgTable(
  "balances",
  {
    scopeId: text("scope_id").notNull(),
    userLowId: text("user_low_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userHighId: text("user_high_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    currency: char("currency", { length: 3 }).notNull().default("INR"),
    amount: balanceMoney("amount").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({
      columns: [t.scopeId, t.userLowId, t.userHighId, t.currency],
    }),
    check(
      "ck_balance_pair_order",
      sql`${t.userLowId} < ${t.userHighId}`,
    ),
    index("idx_balances_high_user").on(t.userHighId),
  ],
);

// ─── Activity ───────────────────────────────────────────────────────

export const activities = pgTable(
  "activities",
  {
    id: id(),
    groupId: text("group_id").references(() => groups.id, {
      onDelete: "restrict",
    }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: activityTypeEnum("type").notNull(),
    expenseId: text("expense_id").references(() => expenses.id, {
      onDelete: "restrict",
    }),
    settlementId: text("settlement_id").references(() => settlements.id, {
      onDelete: "restrict",
    }),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_activities_group_created").on(t.groupId, t.createdAt),
  ],
);

export const activityRecipients = pgTable(
  "activity_recipients",
  {
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    readAt: timestamp("read_at", tz),
  },
  (t) => [
    primaryKey({ columns: [t.activityId, t.userId] }),
    index("idx_activity_recipients_user").on(t.userId, t.activityId),
  ],
);

// ─── Push ───────────────────────────────────────────────────────────

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  lastUsedAt: timestamp("last_used_at", tz),
});

// ─── Relations ──────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  groupMemberships: many(groupMembers),
  expenseParticipations: many(expenseParticipants),
  createdExpenses: many(expenses, { relationName: "expenseCreator" }),
  sentSettlements: many(settlements, { relationName: "settlementSender" }),
  receivedSettlements: many(settlements, {
    relationName: "settlementReceiver",
  }),
  activityRecipients: many(activityRecipients),
  pushSubscriptions: many(pushSubscriptions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [groups.createdById],
    references: [users.id],
  }),
  members: many(groupMembers),
  expenses: many(expenses),
  settlements: many(settlements),
  activities: many(activities),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id],
  }),
  createdBy: one(users, {
    fields: [expenses.createdById],
    references: [users.id],
    relationName: "expenseCreator",
  }),
  participants: many(expenseParticipants),
  ledgerEntries: many(ledgerEntries),
}));

export const expenseParticipantsRelations = relations(
  expenseParticipants,
  ({ one }) => ({
    expense: one(expenses, {
      fields: [expenseParticipants.expenseId],
      references: [expenses.id],
    }),
    user: one(users, {
      fields: [expenseParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const settlementsRelations = relations(
  settlements,
  ({ one, many }) => ({
    group: one(groups, {
      fields: [settlements.groupId],
      references: [groups.id],
    }),
    fromUser: one(users, {
      fields: [settlements.fromUserId],
      references: [users.id],
      relationName: "settlementSender",
    }),
    toUser: one(users, {
      fields: [settlements.toUserId],
      references: [users.id],
      relationName: "settlementReceiver",
    }),
    createdBy: one(users, {
      fields: [settlements.createdById],
      references: [users.id],
    }),
    ledgerEntries: many(ledgerEntries),
  }),
);

export const ledgerEntriesRelations = relations(
  ledgerEntries,
  ({ one }) => ({
    debtor: one(users, {
      fields: [ledgerEntries.debtorId],
      references: [users.id],
      relationName: "ledgerDebtor",
    }),
    creditor: one(users, {
      fields: [ledgerEntries.creditorId],
      references: [users.id],
      relationName: "ledgerCreditor",
    }),
    expense: one(expenses, {
      fields: [ledgerEntries.expenseId],
      references: [expenses.id],
    }),
    settlement: one(settlements, {
      fields: [ledgerEntries.settlementId],
      references: [settlements.id],
    }),
  }),
);

export const activitiesRelations = relations(
  activities,
  ({ one, many }) => ({
    group: one(groups, {
      fields: [activities.groupId],
      references: [groups.id],
    }),
    actor: one(users, {
      fields: [activities.actorId],
      references: [users.id],
    }),
    expense: one(expenses, {
      fields: [activities.expenseId],
      references: [expenses.id],
    }),
    settlement: one(settlements, {
      fields: [activities.settlementId],
      references: [settlements.id],
    }),
    recipients: many(activityRecipients),
  }),
);

export const activityRecipientsRelations = relations(
  activityRecipients,
  ({ one }) => ({
    activity: one(activities, {
      fields: [activityRecipients.activityId],
      references: [activities.id],
    }),
    user: one(users, {
      fields: [activityRecipients.userId],
      references: [users.id],
    }),
  }),
);
