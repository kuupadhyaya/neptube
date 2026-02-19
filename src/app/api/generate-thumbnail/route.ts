import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

/** Build progressively simpler prompts so retries have a better chance.
 *  Avoids words like "thumbnail", "video", "youtube" which Pollinations
 *  frequently rejects with 530 errors. */
function buildPrompts(title: string): string[] {
  // Strip non-alphanumeric chars and take first few words from the title
  const keywords = title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");
  return [
    // Attempt 1 – descriptive, based on the title
    `professional digital artwork ${keywords} vibrant cinematic lighting`,
    // Attempt 2 – shorter
    `colorful illustration ${keywords}`,
    // Attempt 3 – generic eye-catching image
    `beautiful cinematic landscape colorful`,
    // Attempt 4 – single safe word
    `landscape`,
  ];
}

/** Fetch an image from Pollinations with a timeout + single retry per prompt. */
async function fetchFromPollinations(prompt: string): Promise<Blob | null> {
  const encoded = encodeURIComponent(prompt);
  // Avoid query params (seed, width, height, nologo) – they often cause 530 errors
  const url = `https://image.pollinations.ai/prompt/${encoded}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    // Sanity-check: a valid image should be > 1 KB
    return blob.size > 1024 ? blob : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to generate thumbnails" },
        { status: 401 },
      );
    }

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required to generate a thumbnail" },
        { status: 400 },
      );
    }

    const prompts = buildPrompts(title);

    let imageBlob: Blob | null = null;

    for (const prompt of prompts) {
      console.log("Trying Pollinations prompt:", prompt);
      imageBlob = await fetchFromPollinations(prompt);
      if (imageBlob) break;
      console.log("Prompt failed, trying next fallback…");
    }

    if (!imageBlob) {
      throw new Error(
        "All Pollinations attempts failed – the service may be temporarily unavailable",
      );
    }

    // Pollinations returns JPEG images
    const ext = imageBlob.type?.includes("png") ? "png" : "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    const fileName = `thumbnail-${Date.now()}.${ext}`;
    const file = new File([imageBlob], fileName, { type: mimeType });

    console.log("Uploading thumbnail to UploadThing...");

    // Upload to UploadThing
    const uploadResponse = await utapi.uploadFiles([file]);

    if (!uploadResponse[0]?.data?.ufsUrl) {
      throw new Error("Failed to upload thumbnail to storage");
    }

    const thumbnailUrl = uploadResponse[0].data.ufsUrl;
    console.log("Thumbnail uploaded successfully:", thumbnailUrl);

    return NextResponse.json({
      thumbnailUrl,
      success: true,
    });
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnail. Please try again." },
      { status: 500 },
    );
  }
}
