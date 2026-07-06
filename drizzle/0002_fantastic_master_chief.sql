CREATE TABLE "chain_of_custody" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"action" text NOT NULL,
	"performed_by" uuid,
	"notes" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "hash" text;--> statement-breakpoint
ALTER TABLE "case_evidence" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "chain_of_custody" ADD CONSTRAINT "chain_of_custody_evidence_id_case_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."case_evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_of_custody" ADD CONSTRAINT "chain_of_custody_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;