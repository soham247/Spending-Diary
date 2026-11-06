CREATE TABLE "invite_claim_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_claim_reports_invite_id_unique" UNIQUE("invite_id")
);
--> statement-breakpoint
ALTER TABLE "idempotency_records" DROP CONSTRAINT "ck_idempotency_operation";--> statement-breakpoint
ALTER TABLE "invite_claim_reports" ADD CONSTRAINT "invite_claim_reports_invite_id_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."invites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_claim_reports" ADD CONSTRAINT "invite_claim_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "ck_idempotency_operation" CHECK ("idempotency_records"."operation" IN ('expense', 'settlement', 'group', 'placeholder', 'invite', 'invite-report'));