ALTER TABLE "idempotency_records" DROP CONSTRAINT "ck_idempotency_operation";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "ck_idempotency_operation" CHECK ("idempotency_records"."operation" IN ('expense', 'settlement', 'group', 'placeholder', 'invite'));