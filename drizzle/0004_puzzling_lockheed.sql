CREATE TABLE "face_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_name" text NOT NULL,
	"image_url" text NOT NULL,
	"embedding" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
