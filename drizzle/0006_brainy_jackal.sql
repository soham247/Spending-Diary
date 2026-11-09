CREATE TABLE "friend_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_low_id" text NOT NULL,
	"user_high_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"source" text NOT NULL,
	"invite_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "ck_friend_request_pair" CHECK ("friend_requests"."user_low_id" < "friend_requests"."user_high_id"),
	CONSTRAINT "ck_friend_request_requester" CHECK ("friend_requests"."requester_id" IN ("friend_requests"."user_low_id", "friend_requests"."user_high_id")),
	CONSTRAINT "ck_friend_request_status" CHECK ("friend_requests"."status" IN ('PENDING', 'ACCEPTED', 'DECLINED')),
	CONSTRAINT "ck_friend_request_source" CHECK ("friend_requests"."source" IN ('EMAIL', 'CONTEXT', 'LINK')),
	CONSTRAINT "ck_friend_request_invite" CHECK (("friend_requests"."source" = 'LINK') = ("friend_requests"."invite_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "idempotency_records" DROP CONSTRAINT "ck_idempotency_operation";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discoverable_by_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_user_low_id_users_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_user_high_id_users_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_invite_id_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."invites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_friend_request_pending" ON "friend_requests" USING btree ("user_low_id","user_high_id") WHERE "friend_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "idx_friend_requests_low" ON "friend_requests" USING btree ("user_low_id","status");--> statement-breakpoint
CREATE INDEX "idx_friend_requests_high" ON "friend_requests" USING btree ("user_high_id","status");--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "ck_idempotency_operation" CHECK ("idempotency_records"."operation" IN ('expense', 'settlement', 'group', 'placeholder', 'invite', 'invite-report', 'friend-request'));