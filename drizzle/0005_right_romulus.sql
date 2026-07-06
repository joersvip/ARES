CREATE TABLE "ocr_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"engine" text NOT NULL,
	"text_content" text NOT NULL,
	"json_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
