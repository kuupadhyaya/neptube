/**
 * Apply ML enhancement fields migration
 * Run: bun run scripts/apply-ml-enhancements-migration.ts
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const migration = fs.readFileSync(
    path.join(__dirname, "../drizzle/0005_add_ml_enhancement_fields.sql"),
    "utf-8"
  );

  // Execute each statement separately
  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log("Applying ML enhancement fields migration...");
  for (const stmt of statements) {
    console.log(`  Running: ${stmt.slice(0, 60)}...`);
    await sql(stmt);
  }
  console.log("Migration applied successfully!");
}

main().catch(console.error);
