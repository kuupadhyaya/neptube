import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Count negative/toxic comments
  const countResult = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
      COUNT(*) FILTER (WHERE is_toxic = true) as toxic_count,
      COUNT(*) FILTER (WHERE is_spam = true) as spam_count,
      COUNT(*) FILTER (WHERE is_hidden = false AND (sentiment = 'negative' OR is_toxic = true OR is_spam = true)) as to_hide
    FROM comments
  `;
  console.log("Comment stats:", countResult[0]);

  // Hide all negative, toxic, or spam comments
  const result = await sql`
    UPDATE comments 
    SET is_hidden = true 
    WHERE is_hidden = false 
      AND (sentiment = 'negative' OR is_toxic = true OR is_spam = true)
    RETURNING id, content, sentiment, is_toxic, is_spam
  `;

  console.log(`\nHid ${result.length} comments:`);
  for (const r of result) {
    console.log(`  - [${r.sentiment}${r.is_toxic ? '/toxic' : ''}${r.is_spam ? '/spam' : ''}] "${(r.content as string).slice(0, 60)}"`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
