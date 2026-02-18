/**
 * NepTube ML/AI Utilities
 *
 * Uses free APIs:
 * - Pollinations.ai for text generation (auto-tagging, summaries, sentiment, toxicity)
 * - Hugging Face Inference API for embeddings (semantic search, recommendations)
 * - Replicate for NSFW detection (already configured)
 */

// ─── Text Generation via Pollinations ────────────────────────────────────────

interface PollinationsTextOptions {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
}

async function pollinationsText(opts: PollinationsTextOptions): Promise<string> {
  const messages = [
    ...(opts.systemPrompt
      ? [{ role: "system" as const, content: opts.systemPrompt }]
      : []),
    { role: "user" as const, content: opts.prompt },
  ];

  const response = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: "openai",
      jsonMode: opts.jsonMode ?? false,
      seed: 42,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pollinations API error: ${response.status}`);
  }

  return response.text();
}

// ─── Auto-Tagging ────────────────────────────────────────────────────────────

export async function generateTags(
  title: string,
  description?: string | null,
  category?: string | null
): Promise<string[]> {
  const prompt = `Generate 5-8 relevant tags for a video.
Title: "${title}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: "${category}"` : ""}

Return ONLY a JSON array of lowercase tag strings. Example: ["gaming","tutorial","minecraft"]`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You are a video tagging assistant. Return only valid JSON arrays of strings, no other text.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const tags = JSON.parse(cleaned);
    if (Array.isArray(tags)) {
      return tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase().trim())
        .slice(0, 8);
    }
    return [];
  } catch (err) {
    console.error("Tag generation failed:", err);
    return [];
  }
}

// ─── Video Summary ───────────────────────────────────────────────────────────

export async function generateSummary(
  title: string,
  description?: string | null,
  transcript?: string | null
): Promise<string> {
  const context = transcript
    ? `Transcript (first 2000 chars): "${transcript.slice(0, 2000)}"`
    : description
      ? `Description: "${description}"`
      : "";

  const prompt = `Write a concise 2-3 sentence summary for this video.
Title: "${title}"
${context}

Return ONLY the summary text, no quotes or labels.`;

  try {
    const summary = await pollinationsText({
      prompt,
      systemPrompt:
        "You are a video summarization assistant. Write concise, informative summaries.",
    });
    return summary.trim().slice(0, 500);
  } catch (err) {
    console.error("Summary generation failed:", err);
    return "";
  }
}

// ─── Comment Sentiment Analysis ──────────────────────────────────────────────

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number; // 0 to 1
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const prompt = `Analyze the sentiment of this comment. Return JSON with "sentiment" (positive/negative/neutral) and "score" (0.0 to 1.0 confidence).

Comment: "${text.slice(0, 500)}"

Return ONLY valid JSON like: {"sentiment":"positive","score":0.85}`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You analyze sentiment. Return only valid JSON. No extra text.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    const sentiment = ["positive", "negative", "neutral"].includes(
      result.sentiment
    )
      ? (result.sentiment as "positive" | "negative" | "neutral")
      : "neutral";
    const score =
      typeof result.score === "number"
        ? Math.max(0, Math.min(1, result.score))
        : 0.5;

    return { sentiment, score };
  } catch (err) {
    console.error("Sentiment analysis failed:", err);
    return { sentiment: "neutral", score: 0.5 };
  }
}

// ─── Toxicity Detection ─────────────────────────────────────────────────────

export interface ToxicityResult {
  isToxic: boolean;
  score: number; // 0 to 1
}

export async function analyzeToxicity(text: string): Promise<ToxicityResult> {
  const prompt = `Is this comment toxic, hateful, threatening, or spam? Return JSON with "isToxic" (boolean) and "score" (0.0 to 1.0 toxicity level).

Comment: "${text.slice(0, 500)}"

Return ONLY valid JSON like: {"isToxic":false,"score":0.1}`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You are a content moderation assistant. Evaluate toxicity. Return only valid JSON.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    const isToxic = typeof result.isToxic === "boolean" ? result.isToxic : false;
    const score =
      typeof result.score === "number"
        ? Math.max(0, Math.min(1, result.score))
        : 0;

    return { isToxic, score };
  } catch (err) {
    console.error("Toxicity analysis failed:", err);
    return { isToxic: false, score: 0 };
  }
}

// ─── Video Transcription (via Replicate Whisper) ─────────────────────────────

export async function transcribeVideo(videoUrl: string): Promise<string> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    console.warn("REPLICATE_API_TOKEN not set, skipping transcription");
    return "";
  }

  try {
    // Start the transcription prediction
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "cdd97b257f93cb89dede1c7584df59efd8f303ab98c0c795db5f0a0f7b119485",
        input: {
          audio: videoUrl,
          model: "large-v3",
          language: "en",
          translate: false,
          transcription: "plain text",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();

    // Poll for completion (max 5 minutes)
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
        }
      );

      const status = await statusResponse.json();

      if (status.status === "succeeded") {
        return typeof status.output === "string"
          ? status.output
          : status.output?.transcription || status.output?.text || "";
      }

      if (status.status === "failed") {
        throw new Error(`Transcription failed: ${status.error}`);
      }
    }

    console.warn("Transcription timed out");
    return "";
  } catch (err) {
    console.error("Transcription failed:", err);
    return "";
  }
}

// ─── Video Transcription with Timestamps (via Replicate Whisper) ─────────────

export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

/**
 * Transcribe a video and return timestamped segments for WebVTT subtitle generation.
 */
export async function transcribeVideoWithTimestamps(
  videoUrl: string
): Promise<TranscriptSegment[]> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    console.warn("REPLICATE_API_TOKEN not set, skipping transcription");
    return [];
  }

  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "cdd97b257f93cb89dede1c7584df59efd8f303ab98c0c795db5f0a0f7b119485",
        input: {
          audio: videoUrl,
          model: "large-v3",
          language: "en",
          translate: false,
          transcription: "srt", // Request SRT format for timestamps
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();

    // Poll for completion (max 5 minutes)
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
        }
      );

      const status = await statusResponse.json();

      if (status.status === "succeeded") {
        const output = status.output;

        // Handle segments array from Whisper
        if (output?.segments && Array.isArray(output.segments)) {
          return output.segments.map(
            (seg: { start: number; end: number; text: string }) => ({
              start: seg.start,
              end: seg.end,
              text: seg.text.trim(),
            })
          );
        }

        // Handle SRT string output - parse it into segments
        const srtText =
          typeof output === "string"
            ? output
            : output?.transcription || output?.text || "";

        if (srtText) {
          return parseSrtToSegments(srtText);
        }

        return [];
      }

      if (status.status === "failed") {
        throw new Error(`Transcription failed: ${status.error}`);
      }
    }

    console.warn("Transcription with timestamps timed out");
    return [];
  } catch (err) {
    console.error("Timestamped transcription failed:", err);
    return [];
  }
}

/**
 * Parse SRT formatted text into TranscriptSegments
 */
function parseSrtToSegments(srt: string): TranscriptSegment[] {
  const blocks = srt
    .trim()
    .split(/\n\n+/)
    .filter(Boolean);
  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    // SRT block: index, timestamp line, text lines
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
    const start = parseSrtTime(startStr);
    const end = parseSrtTime(endStr);
    // Text is everything after the timestamp line
    const textIdx = lines.indexOf(timeLine);
    const text = lines
      .slice(textIdx + 1)
      .join(" ")
      .trim();

    if (!isNaN(start) && !isNaN(end) && text) {
      segments.push({ start, end, text });
    }
  }

  return segments;
}

function parseSrtTime(time: string): number {
  // Format: HH:MM:SS,mmm or HH:MM:SS.mmm
  const parts = time.replace(",", ".").split(":");
  if (parts.length !== 3) return NaN;
  const [h, m, s] = parts.map(Number);
  return h * 3600 + m * 60 + s;
}

/**
 * Convert TranscriptSegments to WebVTT subtitle format
 */
export function generateWebVTT(segments: TranscriptSegment[]): string {
  let vtt = "WEBVTT\n\n";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    vtt += `${i + 1}\n`;
    vtt += `${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}\n`;
    vtt += `${seg.text}\n\n`;
  }

  return vtt;
}

function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${Math.floor(s).toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

// ─── Comment Summarization ──────────────────────────────────────────────────

export async function summarizeComments(
  comments: Array<{ content: string; userName: string }>
): Promise<string> {
  if (comments.length === 0) return "No comments to summarize.";

  const commentList = comments
    .slice(0, 50) // Limit to 50 most recent comments
    .map((c, i) => `${i + 1}. ${c.userName}: "${c.content}"`)
    .join("\n");

  const prompt = `Summarize the general sentiment and key themes from these video comments. 
Highlight common opinions, questions, and notable feedback. Keep it under 150 words.

Comments:
${commentList}

Return ONLY the summary text.`;

  try {
    const summary = await pollinationsText({
      prompt,
      systemPrompt:
        "You summarize video comment sections. Be concise and insightful. Identify themes and sentiment.",
    });
    return summary.trim().slice(0, 600);
  } catch (err) {
    console.error("Comment summarization failed:", err);
    return "Unable to generate comment summary.";
  }
}

// ─── NSFW Detection (via Replicate) ──────────────────────────────────────────

export interface NsfwResult {
  isNsfw: boolean;
  score: number;
}

export async function detectNsfw(imageUrl: string): Promise<NsfwResult> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    console.warn("REPLICATE_API_TOKEN not set, skipping NSFW detection");
    return { isNsfw: false, score: 0 };
  }

  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "7da8d0359e9e11c3e8b3d81702c8c4a8f93900c9db44b688e3e1e6d4f48bced3",
        input: { image: imageUrl },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();

    // Poll for completion
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
        }
      );

      const status = await statusResponse.json();

      if (status.status === "succeeded") {
        const output = status.output;
        // Parse NSFW classification output
        const nsfwScore =
          typeof output === "number"
            ? output
            : output?.nsfw_score ??
              output?.unsafe ??
              (output?.label === "nsfw" ? 0.9 : 0.1);
        const score = Math.max(0, Math.min(1, Number(nsfwScore) || 0));
        return { isNsfw: score > 0.5, score };
      }

      if (status.status === "failed") {
        throw new Error(`NSFW detection failed: ${status.error}`);
      }
    }

    return { isNsfw: false, score: 0 };
  } catch (err) {
    console.error("NSFW detection failed:", err);
    return { isNsfw: false, score: 0 };
  }
}

// ─── Content-Based Recommendations ───────────────────────────────────────────

export async function getRecommendationScores(
  sourceTitle: string,
  sourceDescription: string | null,
  sourceTags: string[] | null,
  candidates: Array<{
    id: string;
    title: string;
    description: string | null;
    tags: string[] | null;
  }>
): Promise<Array<{ id: string; score: number }>> {
  if (candidates.length === 0) return [];

  const candidateList = candidates
    .map(
      (c, i) =>
        `${i}. "${c.title}" ${c.tags?.length ? `[${c.tags.join(",")}]` : ""}`
    )
    .join("\n");

  const prompt = `Given a source video and candidate videos, score each candidate 0.0-1.0 for relevance/similarity.

Source: "${sourceTitle}" ${sourceTags?.length ? `[${sourceTags.join(",")}]` : ""}
${sourceDescription ? `About: ${sourceDescription.slice(0, 200)}` : ""}

Candidates:
${candidateList}

Return JSON array of objects with "index" and "score". Example: [{"index":0,"score":0.8},{"index":1,"score":0.3}]`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You score video relevance. Return only valid JSON arrays.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const scores = JSON.parse(cleaned);
    if (Array.isArray(scores)) {
      return scores
        .filter(
          (s: { index: number; score: number }) =>
            typeof s.index === "number" && typeof s.score === "number"
        )
        .map((s: { index: number; score: number }) => ({
          id: candidates[s.index]?.id,
          score: Math.max(0, Math.min(1, s.score)),
        }))
        .filter((s: { id: string | undefined; score: number }) => s.id);
    }
    return [];
  } catch (err) {
    console.error("Recommendation scoring failed:", err);
    return [];
  }
}

// ─── Auto-Categorization ────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  "Entertainment",
  "Music",
  "Gaming",
  "Education",
  "Sports",
  "News",
  "Comedy",
  "Technology",
  "Travel",
  "Other",
];

export async function autoCategorizVideo(
  title: string,
  description?: string | null,
  tags?: string[] | null
): Promise<string> {
  const prompt = `Classify this video into exactly one category.
Title: "${title}"
${description ? `Description: "${description.slice(0, 300)}"` : ""}
${tags?.length ? `Tags: ${tags.join(", ")}` : ""}

Categories: ${VALID_CATEGORIES.join(", ")}

Return ONLY the category name, nothing else.`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You classify videos into categories. Return only the category name.",
    });

    const category = raw.trim().replace(/['"]/g, "");
    return VALID_CATEGORIES.includes(category) ? category : "Other";
  } catch (err) {
    console.error("Auto-categorization failed:", err);
    return "Other";
  }
}

// ─── Chapter Generation ─────────────────────────────────────────────────────

export interface VideoChapter {
  time: number; // seconds
  title: string;
}

export async function generateChapters(
  title: string,
  description?: string | null,
  transcript?: string | null,
  duration?: number | null
): Promise<VideoChapter[]> {
  if (!transcript && !description) return [];

  const durationMin = duration ? Math.floor(duration / 60) : 10;
  const content = transcript
    ? `Transcript (first 3000 chars): "${transcript.slice(0, 3000)}"`
    : `Description: "${description}"`;

  const prompt = `Generate video chapters (timestamps) for a ${durationMin}-minute video.
Title: "${title}"
${content}

Return a JSON array of objects with "time" (in seconds) and "title" (short chapter label).
Generate 3-8 chapters. First chapter should start at 0.
Example: [{"time":0,"title":"Introduction"},{"time":120,"title":"Main Topic"},{"time":360,"title":"Conclusion"}]`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You generate video chapter timestamps. Return only valid JSON arrays.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const chapters = JSON.parse(cleaned);
    if (Array.isArray(chapters)) {
      return chapters
        .filter(
          (c): c is VideoChapter =>
            typeof c.time === "number" && typeof c.title === "string"
        )
        .map((c) => ({
          time: Math.max(0, Math.round(c.time)),
          title: c.title.trim().slice(0, 100),
        }))
        .slice(0, 8);
    }
    return [];
  } catch (err) {
    console.error("Chapter generation failed:", err);
    return [];
  }
}

// ─── Trending Score ──────────────────────────────────────────────────────────

export function calculateTrendingScore(
  viewCount: number,
  likeCount: number,
  dislikeCount: number,
  commentCount: number,
  createdAt: Date | string
): number {
  const ageHours =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const decayFactor = Math.pow(0.95, ageHours / 24); // decay per day
  const engagement = viewCount + likeCount * 3 - dislikeCount + commentCount * 2;
  return engagement * decayFactor;
}

// ─── Spam Detection ─────────────────────────────────────────────────────────

export interface SpamResult {
  isSpam: boolean;
  score: number; // 0 to 1
  reason: string;
}

export async function detectSpam(text: string): Promise<SpamResult> {
  const prompt = `Analyze this comment for spam. Check for:
- Self-promotion / excessive links
- Repetitive/copy-paste patterns
- Irrelevant advertising
- Bot-like behavior
- "First!" or empty engagement bait

Comment: "${text.slice(0, 500)}"

Return ONLY valid JSON: {"isSpam":boolean,"score":0.0-1.0,"reason":"brief reason"}`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You detect spam in video comments. Return only valid JSON.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    return {
      isSpam: typeof result.isSpam === "boolean" ? result.isSpam : false,
      score: typeof result.score === "number" ? Math.max(0, Math.min(1, result.score)) : 0,
      reason: typeof result.reason === "string" ? result.reason.slice(0, 200) : "",
    };
  } catch (err) {
    console.error("Spam detection failed:", err);
    return { isSpam: false, score: 0, reason: "" };
  }
}

// ─── Emotion Detection ──────────────────────────────────────────────────────

export type Emotion =
  | "joy"
  | "anger"
  | "sadness"
  | "surprise"
  | "fear"
  | "disgust"
  | "love"
  | "neutral";

export interface EmotionResult {
  emotion: Emotion;
  confidence: number; // 0 to 1
  secondaryEmotion?: Emotion;
}

export async function detectEmotion(text: string): Promise<EmotionResult> {
  const prompt = `Detect the primary emotion in this text: joy, anger, sadness, surprise, fear, disgust, love, or neutral.

Text: "${text.slice(0, 500)}"

Return ONLY valid JSON: {"emotion":"...", "confidence":0.0-1.0, "secondaryEmotion":"..." or null}`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You detect emotions in text. Return only valid JSON. Allowed emotions: joy, anger, sadness, surprise, fear, disgust, love, neutral.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    const validEmotions: Emotion[] = [
      "joy", "anger", "sadness", "surprise", "fear", "disgust", "love", "neutral",
    ];
    const emotion = validEmotions.includes(result.emotion) ? result.emotion : "neutral";
    const confidence =
      typeof result.confidence === "number"
        ? Math.max(0, Math.min(1, result.confidence))
        : 0.5;
    const secondaryEmotion =
      result.secondaryEmotion && validEmotions.includes(result.secondaryEmotion)
        ? result.secondaryEmotion
        : undefined;

    return { emotion, confidence, secondaryEmotion };
  } catch (err) {
    console.error("Emotion detection failed:", err);
    return { emotion: "neutral", confidence: 0.5 };
  }
}

// ─── Language Detection ─────────────────────────────────────────────────────

export interface LanguageResult {
  language: string; // ISO 639-1 code (e.g., "en", "es", "ja")
  languageName: string; // Full name (e.g., "English")
  confidence: number;
}

export async function detectLanguage(text: string): Promise<LanguageResult> {
  const prompt = `Detect the language of this text.

Text: "${text.slice(0, 300)}"

Return ONLY valid JSON: {"language":"en","languageName":"English","confidence":0.95}
Use ISO 639-1 language codes.`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You detect languages. Return only valid JSON with ISO 639-1 code.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    return {
      language: typeof result.language === "string" ? result.language.slice(0, 5) : "en",
      languageName: typeof result.languageName === "string" ? result.languageName.slice(0, 30) : "English",
      confidence:
        typeof result.confidence === "number"
          ? Math.max(0, Math.min(1, result.confidence))
          : 0.5,
    };
  } catch (err) {
    console.error("Language detection failed:", err);
    return { language: "en", languageName: "English", confidence: 0.5 };
  }
}

// ─── Keyword Extraction ─────────────────────────────────────────────────────

export async function extractKeywords(
  title: string,
  description?: string | null,
  transcript?: string | null
): Promise<string[]> {
  const context = transcript
    ? `Transcript (first 2000 chars): "${transcript.slice(0, 2000)}"`
    : description
      ? `Description: "${description}"`
      : "";

  const prompt = `Extract 5-10 key topics/keywords from this video content. These should be informative, specific terms (not generic words).

Title: "${title}"
${context}

Return ONLY a JSON array of keyword strings. Example: ["machine learning","neural networks","python","deep learning"]`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You extract important keywords from content. Return only valid JSON arrays of strings.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const keywords = JSON.parse(cleaned);
    if (Array.isArray(keywords)) {
      return keywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.toLowerCase().trim())
        .slice(0, 10);
    }
    return [];
  } catch (err) {
    console.error("Keyword extraction failed:", err);
    return [];
  }
}

// ─── Content Quality Scoring ────────────────────────────────────────────────

export interface QualityScore {
  overall: number; // 0-100
  titleQuality: number; // 0-100
  descriptionQuality: number; // 0-100
  engagementPotential: number; // 0-100
  suggestions: string[];
}

export async function scoreContentQuality(
  title: string,
  description?: string | null,
  transcript?: string | null,
  tags?: string[] | null,
  duration?: number | null
): Promise<QualityScore> {
  const prompt = `Rate this video's content quality on multiple dimensions (0-100 each).

Title: "${title}"
${description ? `Description: "${description.slice(0, 500)}"` : "No description"}
${tags?.length ? `Tags: ${tags.join(", ")}` : "No tags"}
${transcript ? `Has transcript: Yes (${transcript.length} chars)` : "No transcript"}
${duration ? `Duration: ${Math.floor(duration / 60)}min ${duration % 60}s` : "Unknown duration"}

Evaluate:
1. titleQuality: Is the title clear, engaging, not clickbait?
2. descriptionQuality: Is the description informative and complete?
3. engagementPotential: Will this attract and retain viewers?
4. overall: Average weighted score

Also provide 1-3 brief actionable suggestions to improve.

Return ONLY valid JSON: {"overall":75,"titleQuality":80,"descriptionQuality":60,"engagementPotential":85,"suggestions":["Add a description","Include timestamps"]}`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You evaluate video content quality. Be constructive and fair. Return only valid JSON.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    const clampScore = (s: unknown) =>
      typeof s === "number" ? Math.max(0, Math.min(100, Math.round(s))) : 50;

    return {
      overall: clampScore(result.overall),
      titleQuality: clampScore(result.titleQuality),
      descriptionQuality: clampScore(result.descriptionQuality),
      engagementPotential: clampScore(result.engagementPotential),
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions
            .filter((s: unknown): s is string => typeof s === "string")
            .slice(0, 3)
        : [],
    };
  } catch (err) {
    console.error("Quality scoring failed:", err);
    return {
      overall: 50,
      titleQuality: 50,
      descriptionQuality: 50,
      engagementPotential: 50,
      suggestions: [],
    };
  }
}

// ─── Smart Search Query Expansion ───────────────────────────────────────────

export async function expandSearchQuery(userQuery: string): Promise<string[]> {
  const prompt = `A user is searching a video platform for: "${userQuery}"

Generate 3-5 expanded search terms that capture different interpretations and synonyms.
Example: for "js tutorial" → ["javascript tutorial", "javascript beginner guide", "learn javascript", "js programming"]

Return ONLY a JSON array of strings.`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You expand search queries with synonyms and related terms. Return only valid JSON arrays.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const terms = JSON.parse(cleaned);
    if (Array.isArray(terms)) {
      return [userQuery, ...terms.filter((t): t is string => typeof t === "string").slice(0, 5)];
    }
    return [userQuery];
  } catch (err) {
    console.error("Search query expansion failed:", err);
    return [userQuery];
  }
}

// ─── Reply Suggestions ──────────────────────────────────────────────────────

export async function generateReplySuggestions(
  commentContent: string,
  videoTitle: string
): Promise<string[]> {
  const prompt = `Suggest 3 short, natural reply options for this comment on a video titled "${videoTitle}".

Comment: "${commentContent.slice(0, 300)}"

Generate 3 different reply styles:
1. Friendly/positive
2. Informative/helpful
3. Engaging question

Return ONLY a JSON array of 3 reply strings. Keep each under 100 characters.`;

  try {
    const raw = await pollinationsText({
      prompt,
      systemPrompt:
        "You generate natural comment replies. Return only valid JSON arrays of strings.",
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
    const replies = JSON.parse(cleaned);
    if (Array.isArray(replies)) {
      return replies.filter((r): r is string => typeof r === "string").slice(0, 3);
    }
    return [];
  } catch (err) {
    console.error("Reply suggestion failed:", err);
    return [];
  }
}

// ─── Personalized Feed Scoring ──────────────────────────────────────────────

export function personalizedFeedScore(
  video: {
    tags: string[] | null;
    category: string | null;
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    createdAt: Date | string;
  },
  userPreferences: {
    watchedCategories: Record<string, number>; // category -> watch count
    watchedTags: Record<string, number>; // tag -> watch count
    totalWatched: number;
  }
): number {
  let score = 0;

  // Category match score (0-40)
  if (video.category && userPreferences.watchedCategories[video.category]) {
    const categoryFreq =
      userPreferences.watchedCategories[video.category] /
      Math.max(1, userPreferences.totalWatched);
    score += categoryFreq * 40;
  }

  // Tag overlap score (0-40)
  if (video.tags && video.tags.length > 0) {
    let tagScore = 0;
    for (const tag of video.tags) {
      if (userPreferences.watchedTags[tag]) {
        tagScore +=
          userPreferences.watchedTags[tag] /
          Math.max(1, userPreferences.totalWatched);
      }
    }
    score += Math.min(40, tagScore * 40);
  }

  // Engagement quality (0-10)
  const totalVotes = video.likeCount + video.dislikeCount;
  if (totalVotes > 0) {
    score += (video.likeCount / totalVotes) * 10;
  }

  // Recency bonus (0-10)
  const ageHours =
    (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60);
  score += Math.max(0, 10 - ageHours / 24);

  return Math.round(score * 100) / 100;
}
