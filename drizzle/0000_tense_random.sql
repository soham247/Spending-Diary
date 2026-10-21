CREATE TYPE "public"."activity_type" AS ENUM('EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED', 'EXPENSE_RESTORED', 'SETTLEMENT_CREATED', 'SETTLEMENT_DELETED', 'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'GROUP_CREATED', 'GROUP_UPDATED', 'INVITE_CLAIMED');--> statement-breakpoint
CREATE TYPE "public"."expense_kind" AS ENUM('SHARED', 'PERSONAL');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('ACCEPTED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."group_type" AS ENUM('TRIP', 'HOME', 'COUPLE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."invite_type" AS ENUM('DIRECT', 'GROUP_LINK', 'PERSONAL');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('ACTIVE', 'LEFT', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."settlement_method" AS ENUM('CASH', 'UPI', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."split_type" AS ENUM('EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INVITED', 'DELETED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text,
	"actor_id" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"expense_id" text,
	"settlement_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_recipients" (
	"activity_id" text NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "activity_recipients_activity_id_user_id_pk" PRIMARY KEY("activity_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "balances" (
	"scope_id" text NOT NULL,
	"user_low_id" text NOT NULL,
	"user_high_id" text NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"amount" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balances_scope_id_user_low_id_user_high_id_currency_pk" PRIMARY KEY("scope_id","user_low_id","user_high_id","currency"),
	CONSTRAINT "ck_balance_pair_order" CHECK ("balances"."user_low_id" < "balances"."user_high_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"owner_id" text NOT NULL,
	"user_id" text NOT NULL,
	"nickname" text NOT NULL,
	CONSTRAINT "contacts_owner_id_user_id_pk" PRIMARY KEY("owner_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "email_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_participants" (
	"expense_id" text NOT NULL,
	"user_id" text NOT NULL,
	"paid" integer NOT NULL,
	"owed" integer NOT NULL,
	"split_input" numeric(12, 4),
	CONSTRAINT "expense_participants_expense_id_user_id_pk" PRIMARY KEY("expense_id","user_id"),
	CONSTRAINT "ck_participant_paid_gte_zero" CHECK ("expense_participants"."paid" >= 0),
	CONSTRAINT "ck_participant_owed_gte_zero" CHECK ("expense_participants"."owed" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text,
	"kind" "expense_kind" DEFAULT 'SHARED' NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"notes" text,
	"amount" integer NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"split_type" "split_type" DEFAULT 'EQUAL' NOT NULL,
	"date" date NOT NULL,
	"created_by_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_expense_amount_positive" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_low_id" text NOT NULL,
	"user_high_id" text NOT NULL,
	"status" "friendship_status" DEFAULT 'ACCEPTED' NOT NULL,
	"blocked_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_low_id_user_high_id_pk" PRIMARY KEY("user_low_id","user_high_id"),
	CONSTRAINT "ck_friendship_pair_order" CHECK ("friendships"."user_low_id" < "friendships"."user_high_id")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'MEMBER' NOT NULL,
	"status" "member_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "group_type" DEFAULT 'OTHER' NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"simplify_debts" boolean DEFAULT true NOT NULL,
	"created_by_id" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"type" "invite_type" NOT NULL,
	"group_id" text,
	"inviter_id" text NOT NULL,
	"invitee_user_id" text,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"claimed_by_id" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"debtor_id" text NOT NULL,
	"creditor_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"expense_id" text,
	"settlement_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	CONSTRAINT "ck_ledger_different_users" CHECK ("ledger_entries"."debtor_id" <> "ledger_entries"."creditor_id"),
	CONSTRAINT "ck_ledger_amount_positive" CHECK ("ledger_entries"."amount" > 0),
	CONSTRAINT "ck_ledger_exactly_one_source" CHECK (num_nonnulls("ledger_entries"."expense_id", "ledger_entries"."settlement_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"count" integer,
	"last_request" bigint,
	"window" integer,
	"namespace" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"method" "settlement_method" DEFAULT 'CASH' NOT NULL,
	"external_ref" text,
	"note" text,
	"date" date NOT NULL,
	"created_by_id" text NOT NULL,
	"idempotency_key" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_settlement_amount_positive" CHECK ("settlements"."amount" > 0),
	CONSTRAINT "ck_settlement_different_users" CHECK ("settlements"."from_user_id" <> "settlements"."to_user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"phone" text,
	"upi_id" text,
	"default_currency" char(3) DEFAULT 'INR' NOT NULL,
	"notification_prefs" jsonb,
	"merged_into_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_recipients" ADD CONSTRAINT "activity_recipients_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_recipients" ADD CONSTRAINT "activity_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_low_id_users_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_high_id_users_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_low_id_users_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_high_id_users_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_blocked_by_id_users_id_fk" FOREIGN KEY ("blocked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_claimed_by_id_users_id_fk" FOREIGN KEY ("claimed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_debtor_id_users_id_fk" FOREIGN KEY ("debtor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_creditor_id_users_id_fk" FOREIGN KEY ("creditor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_merged_into_id_users_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_group_created" ON "activities" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_recipients_user" ON "activity_recipients" USING btree ("user_id","activity_id");--> statement-breakpoint
CREATE INDEX "idx_balances_high_user" ON "balances" USING btree ("user_high_id");--> statement-breakpoint
CREATE INDEX "idx_participants_user_expense" ON "expense_participants" USING btree ("user_id","expense_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_expense_idempotency" ON "expenses" USING btree ("created_by_id","idempotency_key") WHERE "expenses"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_expenses_group_date" ON "expenses" USING btree ("group_id","date","id") WHERE "expenses"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_expenses_group_deleted" ON "expenses" USING btree ("group_id") WHERE "expenses"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_group_members_user_status" ON "group_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invites_token_hash" ON "invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_ledger_scope_pair" ON "ledger_entries" USING btree ("scope_id","debtor_id","creditor_id") WHERE "ledger_entries"."voided_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_ledger_expense" ON "ledger_entries" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_settlement" ON "ledger_entries" USING btree ("settlement_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_from_user" ON "settlements" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "idx_settlements_to_user" ON "settlements" USING btree ("to_user_id");