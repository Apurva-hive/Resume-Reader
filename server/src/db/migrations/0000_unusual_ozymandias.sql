CREATE TYPE "public"."document_format" AS ENUM('pdf', 'docx', 'txt');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('resume', 'job_description');--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"job_description_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"result" jsonb NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "document_kind" NOT NULL,
	"title" text NOT NULL,
	"filename" text NOT NULL,
	"format" "document_format" NOT NULL,
	"text" text NOT NULL,
	"word_count" integer NOT NULL,
	"page_count" integer,
	"warning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_resume_id_documents_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_job_description_id_documents_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_resume_idx" ON "analyses" USING btree ("resume_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");