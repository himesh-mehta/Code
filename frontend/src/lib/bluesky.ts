import { Post, Platform, Sentiment } from "../types";

// Classify skilling & employability relevance
export function classifyRelevance(text: string, query?: string): boolean {
  const lower = `${text} ${query || ""}`.toLowerCase();

  // Explicit gaming or non-skilling exclusions (e.g. Old School RuneScape skilling, MMORPGs, etc.)
  const noiseKeywords = [
    "osrs",
    "runescape",
    "mmorpg",
    "free mmorpg",
    "freethevibe",
    "watching tv is basically meditation",
    "world of warcraft",
    "fortnite",
    "playstation",
    "xbox",
    "valorant",
  ];
  for (const noise of noiseKeywords) {
    if (lower.includes(noise)) return false;
  }

  // Positive relevance keywords for Tata STRIVE / youth skilling ecosystem
  const relevanceKeywords = [
    "skill",
    "skilling",
    "reskill",
    "upskill",
    "employability",
    "vocational",
    "tvet",
    "training",
    "apprentice",
    "apprenticeship",
    "career",
    "job",
    "placement",
    "intern",
    "internship",
    "interview",
    "entrepreneur",
    "entrepreneurship",
    "startup",
    "tata strive",
    "fresher",
    "graduate",
    "resume",
    "cv",
    "soft skill",
    "self-management",
    "workplace",
    "hiring",
    "counseling",
    "guidance",
    "iti",
    "polytechnic",
    "course",
    "learning",
  ];

  for (const kw of relevanceKeywords) {
    if (lower.includes(kw)) return true;
  }

  // If query is specifically a skilling term and no noise detected, mark relevant
  if (query) {
    const qLower = query.toLowerCase();
    if (
      qLower.includes("skill") ||
      qLower.includes("employ") ||
      qLower.includes("vocational") ||
      qLower.includes("career") ||
      qLower.includes("apprentice") ||
      qLower.includes("entrepreneur")
    ) {
      return true;
    }
  }

  return false;
}

// Classify into Tata STRIVE strategic topic areas
export function classifyTopic(text: string, query?: string): string {
  const lower = `${text} ${query || ""}`.toLowerCase();

  if (
    lower.includes("vocational") ||
    lower.includes("tvet") ||
    lower.includes("apprentice") ||
    lower.includes("iti") ||
    lower.includes("solar") ||
    lower.includes("electrician") ||
    lower.includes("technician") ||
    lower.includes("trades") ||
    lower.includes("strive")
  ) {
    return "Vocational training access";
  }

  if (
    lower.includes("interview") ||
    lower.includes("mock") ||
    lower.includes("hr discussion") ||
    lower.includes("resume") ||
    lower.includes("cv") ||
    lower.includes("star method")
  ) {
    return "Interview preparation";
  }

  if (
    lower.includes("ai") ||
    lower.includes("chatgpt") ||
    lower.includes("prompt") ||
    lower.includes("generative ai") ||
    lower.includes("python") ||
    lower.includes("digital fluency") ||
    lower.includes("coding")
  ) {
    return "Practical AI skills";
  }

  if (
    lower.includes("entrepreneur") ||
    lower.includes("startup") ||
    lower.includes("founder") ||
    lower.includes("self-employed") ||
    lower.includes("micro-enterprise") ||
    lower.includes("business")
  ) {
    return "Entrepreneurship";
  }

  if (
    lower.includes("communication") ||
    lower.includes("english") ||
    lower.includes("soft skills") ||
    lower.includes("presentation") ||
    lower.includes("behavioral")
  ) {
    return "Workplace communication";
  }

  if (
    lower.includes("career guidance") ||
    lower.includes("counseling") ||
    lower.includes("mentorship") ||
    lower.includes("pathway") ||
    lower.includes("roadmap")
  ) {
    return "Career guidance";
  }

  return "Employability";
}

// Determine sentiment
export function classifySentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const positiveWords = [
    "opportunity",
    "placement",
    "success",
    "growth",
    "boost",
    "helpful",
    "great",
    "excellent",
    "achieve",
    "guarantee",
    "free",
    "benefit",
    "congrats",
    "hired",
    "empower",
  ];
  const negativeWords = [
    "struggle",
    "reject",
    "fail",
    "unemployed",
    "no job",
    "difficult",
    "problem",
    "worst",
    "delay",
    "gap",
    "lack",
    "scam",
    "confused",
    "unpalatable",
  ];

  let score = 0;
  positiveWords.forEach((w) => {
    if (lower.includes(w)) score += 1;
  });
  negativeWords.forEach((w) => {
    if (lower.includes(w)) score -= 1;
  });

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

// Detect questions or youth inquiries
export function detectQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    text.includes("?") ||
    lower.startsWith("how ") ||
    lower.startsWith("what ") ||
    lower.startsWith("why ") ||
    lower.startsWith("is ") ||
    lower.startsWith("can ") ||
    lower.startsWith("where ") ||
    lower.startsWith("which ") ||
    lower.includes("how to") ||
    lower.includes("how can") ||
    lower.includes("how do")
  );
}

// Transform raw Bluesky API post into application Post model
export function transformBlueskyPost(raw: any, query?: string): Post {
  const uri = raw.uri || "";
  const rkey = uri.split("/").pop() || "";
  const handle = raw.author?.handle || "unknown.bsky.social";
  const displayName = raw.author?.displayName || handle;
  const text = raw.record?.text || "";
  const createdAt = raw.record?.createdAt || raw.indexedAt || new Date().toISOString();

  const webUrl = rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : null;

  return {
    id: `bsky_${rkey || Math.random().toString(36).substring(2, 9)}`,
    platform: "bluesky" as Platform,
    author_handle: `@${handle}${displayName && displayName !== handle ? ` (${displayName})` : ""}`,
    content: text,
    posted_at: createdAt,
    likes: raw.likeCount || 0,
    comments: raw.replyCount || 0, // Replies
    shares: raw.repostCount || 0, // Reposts
    topic: classifyTopic(text, query),
    sentiment: classifySentiment(text),
    is_question: detectQuestion(text),
    is_relevant: classifyRelevance(text, query),
    url: webUrl,
    is_sample: false, // Verified live public Bluesky signal
  };
}
