import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function syncSchema() {
  console.log("🔄 Syncing database schema...\n");

  const migrations = [
    // ─── Videos table columns ───
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "category" text`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "status" "video_status" DEFAULT 'draft' NOT NULL`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "rejection_reason" text`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "tags" jsonb`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "ai_summary" text`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "transcript" text`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "nsfw_score" real`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_nsfw" boolean DEFAULT false`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "chapters" jsonb`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "subtitles_vtt" text`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "keywords" jsonb`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "language" text`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "language_name" text`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "quality_score" integer`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_short" boolean DEFAULT false`,
    `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "allow_download" boolean DEFAULT true`,

    // ─── Users table columns ───
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'user' NOT NULL`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_banned" boolean DEFAULT false NOT NULL`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ban_reason" text`,

    // ─── Comments ML columns ───
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "sentiment" "sentiment"`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "sentiment_score" real`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "is_toxic" boolean DEFAULT false`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "toxicity_score" real`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "is_spam" boolean DEFAULT false`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "spam_score" real`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "emotion" text`,
    `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "emotion_confidence" real`,

    // ─── Unique indexes ───
    `CREATE UNIQUE INDEX IF NOT EXISTS "video_likes_user_video_idx" ON "video_likes" ("user_id", "video_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_subscriber_channel_idx" ON "subscriptions" ("subscriber_id", "channel_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "watch_history_user_video_idx" ON "watch_history" ("user_id", "video_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "playlist_videos_playlist_video_idx" ON "playlist_videos" ("playlist_id", "video_id")`,
  ];

  // Create enums if they don't exist
  const enumStatements = [
    `DO $$ BEGIN CREATE TYPE "sentiment" AS ENUM('positive', 'negative', 'neutral'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "user_role" AS ENUM('user', 'admin', 'moderator'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "video_status" AS ENUM('draft', 'pending', 'published', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "notification_type" AS ENUM('new_video', 'comment', 'reply', 'like', 'subscription', 'report_resolved', 'community_post'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "community_post_type" AS ENUM('text', 'image', 'poll'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "report_status" AS ENUM('pending', 'reviewed', 'resolved', 'dismissed'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "report_target" AS ENUM('video', 'comment', 'user'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  ];

  // Create tables if they don't exist
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" "notification_type" NOT NULL,
      "title" text NOT NULL,
      "message" text NOT NULL,
      "link" text,
      "is_read" boolean DEFAULT false NOT NULL,
      "from_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "video_id" uuid REFERENCES "videos"("id") ON DELETE CASCADE,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "playlists" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "visibility" "video_visibility" DEFAULT 'private' NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "playlist_videos" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "playlist_id" uuid NOT NULL REFERENCES "playlists"("id") ON DELETE CASCADE,
      "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
      "position" integer DEFAULT 0 NOT NULL,
      "added_at" timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "reports" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "reporter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "target_type" "report_target" NOT NULL,
      "target_id" uuid NOT NULL,
      "reason" text NOT NULL,
      "description" text,
      "status" "report_status" DEFAULT 'pending' NOT NULL,
      "resolved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "resolved_at" timestamp,
      "resolved_note" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "watch_history" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
      "watched_at" timestamp DEFAULT now() NOT NULL,
      "watch_duration" integer DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS "community_posts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" "community_post_type" NOT NULL DEFAULT 'text',
      "content" text NOT NULL,
      "image_url" text,
      "like_count" integer NOT NULL DEFAULT 0,
      "comment_count" integer NOT NULL DEFAULT 0,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "poll_options" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
      "text" text NOT NULL,
      "vote_count" integer NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS "poll_votes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "option_id" uuid NOT NULL REFERENCES "poll_options"("id") ON DELETE CASCADE,
      "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "community_post_likes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`,
  ];

  const communityIndexes = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "poll_votes_user_post_idx" ON "poll_votes" ("user_id", "post_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "community_post_likes_user_post_idx" ON "community_post_likes" ("user_id", "post_id")`,
  ];

  // 1. Create enums
  console.log("📋 Creating enums (if missing)...");
  for (const stmt of enumStatements) {
    try {
      await sql(stmt);
      console.log("  ✅ Enum OK");
    } catch (e: unknown) {
      console.log(`  ⚠️  Enum: ${((e as Error).message)?.slice(0, 80)}`);
    }
  }

  // 2. Create tables
  console.log("\n📦 Creating tables (if missing)...");
  for (const stmt of tableStatements) {
    try {
      await sql(stmt);
      const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1];
      console.log(`  ✅ Table "${tableName}" OK`);
    } catch (e: unknown) {
      const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1];
      console.log(`  ⚠️  Table "${tableName}": ${((e as Error).message)?.slice(0, 80)}`);
    }
  }

  // 3. Add columns
  console.log("\n🔧 Adding columns (if missing)...");
  for (const stmt of migrations) {
    try {
      await sql(stmt);
      const col = stmt.match(/ADD COLUMN IF NOT EXISTS "(\w+)"/)?.[1] ||
                  stmt.match(/INDEX.*"(\w+_idx)"/)?.[1];
      console.log(`  ✅ ${col || "index"} OK`);
    } catch (e: unknown) {
      const col = stmt.match(/ADD COLUMN IF NOT EXISTS "(\w+)"/)?.[1] ||
                  stmt.match(/INDEX.*"(\w+_idx)"/)?.[1];
      console.log(`  ⚠️  ${col}: ${((e as Error).message)?.slice(0, 80)}`);
    }
  }

  // 4. Community indexes
  console.log("\n🔑 Creating community indexes...");
  for (const stmt of communityIndexes) {
    try {
      await sql(stmt);
      console.log("  ✅ Index OK");
    } catch (e: unknown) {
      console.log(`  ⚠️  Index: ${((e as Error).message)?.slice(0, 80)}`);
    }
  }

  // 5. Add community_post to notification_type enum if missing
  try {
    await sql(`ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'community_post'`);
    console.log("\n✅ notification_type enum updated");
  } catch (e: unknown) {
    console.log(`\n⚠️  notification_type: ${((e as Error).message)?.slice(0, 80)}`);
  }

  console.log("\n✅ Schema sync complete! Try loading a video now.");
}

syncSchema().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
