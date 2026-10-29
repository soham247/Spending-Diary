CREATE TABLE "idempotency_records" (
	"viewer_id" text NOT NULL,
	"operation" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_records_viewer_id_operation_key_pk" PRIMARY KEY("viewer_id","operation","key"),
	CONSTRAINT "ck_idempotency_operation" CHECK ("idempotency_records"."operation" IN ('expense', 'settlement')),
	CONSTRAINT "ck_idempotency_key" CHECK (char_length("idempotency_records"."key") BETWEEN 1 AND 200)
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ALTER COLUMN "key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_limits" ALTER COLUMN "count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_limits" ALTER COLUMN "last_request" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_verifications_identifier" ON "verifications" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_key_unique" UNIQUE("key");