import { NextRequest, NextResponse } from "next/server";
import { Post, Platform, Sentiment } from "@/types";

export const runtime = "nodejs";

// In-memory cache for fast sub-second repeat responses
interface CacheEntry {
  data: any;
  timestamp: number;
}
const newsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function inferTopic(title: string): string {
  const lower = title.toLowerCase();
  if (
    lower.includes("solar") ||
    lower.includes("ev") ||
    lower.includes("electric") ||
    lower.includes("iti") ||
    lower.includes("vocational") ||
    lower.includes("technician")
  ) {
    return "Vocational training access";
  }
  if (
    lower.includes("interview") ||
    lower.includes("placement") ||
    lower.includes("recruit") ||
    lower.includes("hiring")
  ) {
    return "Interview preparation";
  }
  if (
    lower.includes("ai") ||
    lower.includes("prompt") ||
    lower.includes("data") ||
    lower.includes("tech")
  ) {
    return "Practical AI skills";
  }
  if (
    lower.includes("apprentice") ||
    lower.includes("internship") ||
    lower.includes("stipend") ||
    lower.includes("nats") ||
    lower.includes("naps")
  ) {
    return "Apprenticeships";
  }
  if (
    lower.includes("guidance") ||
    lower.includes("career") ||
    lower.includes("counseling") ||
    lower.includes("mentorship")
  ) {
    return "Career guidance";
  }
  return "Employability";
}

function inferSentiment(title: string): Sentiment {
  const lower = title.toLowerCase();
  if (
    lower.includes("boom") ||
    lower.includes("grow") ||
    lower.includes("partner") ||
    lower.includes("expand") ||
    lower.includes("award") ||
    lower.includes("success") ||
    lower.includes("placed") ||
    lower.includes("opportunity") ||
    lower.includes("boost")
  ) {
    return "positive";
  }
  if (
    lower.includes("shortage") ||
    lower.includes("crisis") ||
    lower.includes("unemploy") ||
    lower.includes("delay") ||
    lower.includes("struggle") ||
    lower.includes("gap") ||
    lower.includes("layoff") ||
    lower.includes("deficit")
  ) {
    return "negative";
  }
  return "neutral";
}

function parseGoogleNewsXml(xmlText: string, query: string): Post[] {
  const posts: Post[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = itemRegex.exec(xmlText)) !== null && idx < 30) {
    const itemContent = match[1];
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
    const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

    if (titleMatch) {
      let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim();
      let sourceName = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() : "Google News";

      const dashIdx = rawTitle.lastIndexOf(" - ");
      if (dashIdx > 0) {
        if (!sourceMatch) {
          sourceName = rawTitle.slice(dashIdx + 3).trim();
        }
        rawTitle = rawTitle.slice(0, dashIdx).trim();
      }

      const link = linkMatch ? linkMatch[1].trim() : `https://news.google.com/search?q=${encodeURIComponent(query)}`;
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

      posts.push({
        id: `gnews_${idx}_${Date.now()}`,
        platform: "google_news" as Platform,
        author_handle: sourceName,
        content: rawTitle,
        article_title: rawTitle,
        domain: sourceName,
        posted_at: pubDate,
        likes: undefined,
        comments: undefined,
        shares: undefined,
        topic: inferTopic(rawTitle),
        sentiment: inferSentiment(rawTitle),
        is_question: rawTitle.includes("?"),
        is_relevant: true,
        url: link,
        is_sample: false,
      });

      idx++;
    }
  }

  return posts;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "Tata STRIVE";
  const limitParam = parseInt(searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(5, isNaN(limitParam) ? 20 : limitParam), 50);

  const cacheKey = `${q.toLowerCase()}:${limit}`;
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const encodedQ = encodeURIComponent(`${q} skilling India`);
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQ}&hl=en-IN&gl=IN&ceid=IN:en`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(googleNewsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialPulse-TataSTRIVE/1.0",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: controller.signal,
        next: { revalidate: 60 },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          items: [],
          total: 0,
          source: "google_news",
          error: `Google News RSS returned HTTP ${res.status}`,
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const xmlText = await res.text();
    const parsedArticles = parseGoogleNewsXml(xmlText, q);
    const finalArticles = parsedArticles.slice(0, limit);

    const responseData = {
      items: finalArticles,
      total: finalArticles.length,
      source: "google_news",
    };

    newsCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json(
      {
        items: [],
        total: 0,
        source: "google_news",
        error: err.message || "Failed to fetch Google News RSS feed.",
      },
      { status: 504 }
    );
  }
}
