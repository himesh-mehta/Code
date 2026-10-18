import { NextRequest, NextResponse } from "next/server";
import { Post, Platform, Sentiment } from "@/types";

export const runtime = "nodejs";

const DEFAULT_YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ||
  "";

// In-memory cache for ultra-fast response
interface CacheEntry {
  data: any;
  timestamp: number;
}
const youtubeCache = new Map<string, CacheEntry>();
const YOUTUBE_CACHE_TTL_MS = 5 * 60 * 1000;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function inferTopic(title: string, desc: string, query: string): string {
  const text = `${title} ${desc} ${query}`.toLowerCase();
  if (
    text.includes("interview") ||
    text.includes("hr discussion") ||
    text.includes("mock") ||
    text.includes("resume") ||
    text.includes("behavioral") ||
    text.includes("campus placement")
  ) {
    return "Interview preparation";
  }
  if (
    text.includes("ai") ||
    text.includes("prompt") ||
    text.includes("chatgpt") ||
    text.includes("automation") ||
    text.includes("python") ||
    text.includes("data analytics")
  ) {
    return "Practical AI skills";
  }
  if (
    text.includes("solar") ||
    text.includes("electric vehicle") ||
    text.includes("ev technician") ||
    text.includes("strive") ||
    text.includes("tata") ||
    text.includes("vocational") ||
    text.includes("iti") ||
    text.includes("polytechnic") ||
    text.includes("trade") ||
    text.includes("tvet")
  ) {
    return "Vocational training access";
  }
  if (
    text.includes("apprentice") ||
    text.includes("internship") ||
    text.includes("stipend") ||
    text.includes("nats") ||
    text.includes("naps")
  ) {
    return "Apprenticeships";
  }
  if (
    text.includes("startup") ||
    text.includes("business") ||
    text.includes("mudra") ||
    text.includes("self employment") ||
    text.includes("entrepreneur")
  ) {
    return "Entrepreneurship";
  }
  if (
    text.includes("guidance") ||
    text.includes("roadmap") ||
    text.includes("which course") ||
    text.includes("mentorship") ||
    text.includes("career advice")
  ) {
    return "Career guidance";
  }
  return "Employability";
}

function inferSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const positiveWords = [
    "free",
    "placement",
    "success",
    "helpful",
    "good",
    "great",
    "excellent",
    "opportunity",
    "hired",
    "growth",
    "empower",
    "certified",
    "guaranteed",
  ];
  const negativeWords = [
    "reject",
    "no job",
    "unemployed",
    "difficult",
    "struggle",
    "bad",
    "scam",
    "confused",
    "problem",
    "fail",
    "delay",
    "worst",
    "fraud",
    "fake",
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

function checkIfQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    text.includes("?") ||
    lower.startsWith("how ") ||
    lower.startsWith("what ") ||
    lower.startsWith("why ") ||
    lower.startsWith("is ") ||
    lower.startsWith("can ") ||
    lower.includes("how to") ||
    lower.includes("how can") ||
    lower.includes("where to")
  );
}

function classifyRelevance(title: string, desc: string, query: string): boolean {
  const fullText = `${title} ${desc}`.toLowerCase();
  const q = query.toLowerCase();

  // Filter out Jeffrey Skilling (Enron) and Tom Skilling (weatherman) false positives
  if (
    fullText.includes("jeffrey skilling") ||
    fullText.includes("enron") ||
    fullText.includes("tom skilling") ||
    fullText.includes("weatherman")
  ) {
    return false;
  }

  // Filter out gaming keywords
  const gamingKeywords = ["osrs", "runescape", "ironman", "afk", "mmorpg", "pvp", "gameplay", "walkthrough", "speedrun"];
  if (gamingKeywords.some((g) => fullText.includes(g))) {
    return false;
  }

  const relevantKeywords = [
    "skill",
    "employability",
    "vocational",
    "tata",
    "strive",
    "job",
    "career",
    "placement",
    "training",
    "apprentice",
    "interview",
    "course",
    "resume",
    "freshers",
    "education",
    "tvet",
    "learner",
    "iti",
    "certificate",
  ];

  if (relevantKeywords.some((rk) => fullText.includes(rk))) {
    return true;
  }

  return fullText.includes(q);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const limitParam = parseInt(searchParams.get("limit") || "12", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 12 : limitParam), 50);
  const cursor = searchParams.get("cursor") || undefined;
  const apiKey = searchParams.get("apiKey") || DEFAULT_YOUTUBE_API_KEY;

  if (!q) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required (e.g. skilling, employability, apprenticeships)" },
      { status: 400 }
    );
  }

  const cacheKey = `${q.toLowerCase()}:${limit}:${cursor || ""}`;
  const cached = youtubeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < YOUTUBE_CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        items: [],
        total: 0,
        hits_total: 0,
        relevant_count: 0,
        query: q,
        source: "youtube",
        error: "YOUTUBE_API_KEY is not configured. Please add YOUTUBE_API_KEY in .env.",
      },
      { status: 503 }
    );
  }

  try {
    let searchTerms = q;
    const lowerQ = q.toLowerCase();
    if (lowerQ === "skilling" || lowerQ === "skills") {
      searchTerms = `${q} development employability India`;
    }

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", limit.toString());
    searchUrl.searchParams.set("q", searchTerms);
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("key", apiKey);

    if (cursor) {
      searchUrl.searchParams.set("pageToken", cursor);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let searchRes: Response;
    try {
      searchRes = await fetch(searchUrl.toString(), {
        signal: controller.signal,
        next: { revalidate: 60 },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!searchRes.ok) {
      const errData = await searchRes.json().catch(() => ({}));
      const errMsg = errData.error?.message || `YouTube API error (HTTP ${searchRes.status})`;
      return NextResponse.json(
        {
          items: [],
          total: 0,
          hits_total: 0,
          relevant_count: 0,
          query: q,
          source: "youtube",
          error: errMsg,
          error_code: searchRes.status,
        },
        { status: searchRes.status >= 500 ? 502 : searchRes.status }
      );
    }

    const searchData = await searchRes.json();
    const rawItems: any[] = searchData.items || [];

    if (rawItems.length === 0) {
      return NextResponse.json({
        items: [],
        cursor: null,
        hits_total: 0,
        total: 0,
        relevant_count: 0,
        query: q,
        source: "youtube",
        message: `No YouTube videos found matching "${q}".`,
      });
    }

    // Fetch genuine video statistics (likes, comments, views)
    const videoIds = rawItems.map((it: any) => it.id?.videoId).filter(Boolean);
    const statsMap: Record<string, { likes: number; comments: number; views: number }> = {};

    if (videoIds.length > 0) {
      try {
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(",")}&key=${apiKey}`;
        const statsRes = await fetch(statsUrl, { next: { revalidate: 60 } });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          (statsData.items || []).forEach((st: any) => {
            statsMap[st.id] = {
              likes: parseInt(st.statistics?.likeCount || "0", 10),
              comments: parseInt(st.statistics?.commentCount || "0", 10),
              views: parseInt(st.statistics?.viewCount || "0", 10),
            };
          });
        }
      } catch (err) {
        console.warn("Could not fetch YouTube statistics:", err);
      }
    }

    // Map into normalized Post model with genuine metrics only
    const transformedPosts: Post[] = rawItems.map((it: any) => {
      const vidId = it.id?.videoId;
      const snippet = it.snippet || {};
      const cleanTitle = decodeHtmlEntities(snippet.title || "");
      const cleanDesc = decodeHtmlEntities(snippet.description || "");
      const channel = decodeHtmlEntities(snippet.channelTitle || "YouTube Creator");
      const fullText = `${cleanTitle}\n\n${cleanDesc}`.trim();
      const stats = statsMap[vidId] || { likes: 0, comments: 0, views: 0 };
      const isRelevant = classifyRelevance(cleanTitle, cleanDesc, q);

      const thumbnail =
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        (vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : null);

      return {
        id: `yt_${vidId}`,
        platform: "youtube" as Platform,
        author_handle: `@${channel.replace(/\s+/g, "")}`,
        content: fullText,
        posted_at: snippet.publishedAt || new Date().toISOString(),
        likes: stats.likes || undefined,
        comments: stats.comments || undefined,
        shares: undefined, // YouTube Data API v3 does not provide share counts
        topic: inferTopic(cleanTitle, cleanDesc, q),
        sentiment: inferSentiment(fullText),
        is_question: checkIfQuestion(cleanTitle) || checkIfQuestion(cleanDesc),
        is_relevant: isRelevant,
        url: `https://www.youtube.com/watch?v=${vidId}`,
        is_sample: false,
        video_id: vidId || null,
        media_url: thumbnail,
      };
    });

    const relevantCount = transformedPosts.filter((p) => p.is_relevant).length;
    const nextCursor = searchData.nextPageToken || null;

    const finalResult = {
      items: transformedPosts,
      cursor: nextCursor,
      hits_total: searchData.pageInfo?.totalResults || transformedPosts.length,
      total: transformedPosts.length,
      relevant_count: relevantCount,
      query: q,
      source: "youtube",
    };

    youtubeCache.set(cacheKey, { data: finalResult, timestamp: Date.now() });

    return NextResponse.json(finalResult);
  } catch (err: any) {
    return NextResponse.json(
      {
        items: [],
        total: 0,
        hits_total: 0,
        relevant_count: 0,
        query: q,
        source: "youtube",
        error: err.message || "YouTube search failed or timed out.",
      },
      { status: 504 }
    );
  }
}
