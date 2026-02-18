// Script to update the videoURL for a specific video in the database
import { eq } from "drizzle-orm";
import { db } from "../src/db/index";
import { videos } from "../src/db/schema";

// Replace with your actual video ID and URL
const videoId = "5e311ce4-4d02-405d-bb9b-eb986c9bef28";
const videoURL = "https://ssyc7j0002.ufs.sh/f/Y6atl3B6bEtSInreh1vknG1XJPvBxUcTRjyCwlQNgm0MfdHD";

async function main() {
  await db.update(videos)
    .set({
      videoURL,
    })
    .where(eq(videos.id, videoId));
  console.log("Video updated!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
