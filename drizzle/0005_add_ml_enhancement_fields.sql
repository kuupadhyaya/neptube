-- Add new ML fields to videos and comments tables

-- Videos: keywords, language, quality score
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "keywords" jsonb;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "language" text;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "language_name" text;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "quality_score" integer;

-- Comments: spam detection, emotion detection
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "is_spam" boolean DEFAULT false;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "spam_score" real;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "emotion" text;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "emotion_confidence" real;
