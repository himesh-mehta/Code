import { NextRequest, NextResponse } from "next/server";
import {
  GDELT_DOC_ENDPOINT,
  RawGdeltArticle,
  transformGdeltArticle,
  mapDateRangeToTimespan,
} from "@/lib/gdelt";
import { Post, GdeltNewsResponse, GdeltTimelinePoint } from "@/types";

export const runtime = "nodejs";

// Server-side in-memory cache
interface CacheEntry {
  data: GdeltNewsResponse;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Server-side cooldown tracker for GDELT API rate limits
let lastGdeltRequestTime = 0;
const GDELT_COOLDOWN_MS = 5000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") || searchParams.get("query") || "Tata STRIVE";
  const query = rawQuery.trim();
  const dateRange = searchParams.get("date_range") || searchParams.get("timespan") || "30d";
  const timespan = mapDateRangeToTimespan(dateRange);
  const limitParam = parseInt(searchParams.get("limit") || searchParams.get("maxrecords") || "25", 10);
  const limit = Math.min(Math.max(5, isNaN(limitParam) ? 25 : limitParam), 100);

  const cacheKey = `${query.toLowerCase()}:${timespan}:${limit}`;

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Check rate limit cooldown
  const elapsed = Date.now() - lastGdeltRequestTime;
  if (elapsed < GDELT_COOLDOWN_MS) {
    return NextResponse.json({
      articles: [],
      total_retrieved: 0,
      hits_estimate: 0,
      tone_distribution: { positive: 0, neutral: 0, negative: 0 },
      timeline: [],
      top_domains: [],
      top_topics: [],
      query,
      timespan,
      is_rate_limited: true,
      notice: "GDELT upstream requires 5 seconds between queries. Please retry shortly.",
      source: "gdelt",
    });
  }

  try {
    const gdeltUrl = new URL(GDELT_DOC_ENDPOINT);
    gdeltUrl.searchParams.set("query", query);
    gdeltUrl.searchParams.set("mode", "artlist");
    gdeltUrl.searchParams.set("maxrecords", limit.toString());
    gdeltUrl.searchParams.set("timespan", timespan);
    gdeltUrl.searchParams.set("sort", "datedesc");
    gdeltUrl.searchParams.set("format", "json");

    lastGdeltRequestTime = Date.now();

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialPulse-TataSTRIVE/1.0",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(gdeltUrl.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
        next: { revalidate: 60 },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const responseText = await res.text();

    if (
      res.status === 429 ||
      responseText.includes("Please limit requests to one every 5 seconds") ||
      responseText.includes("limit requests")
    ) {
      return NextResponse.json({
        articles: [],
        total_retrieved: 0,
        hits_estimate: 0,
        tone_distribution: { positive: 0, neutral: 0, negative: 0 },
        timeline: [],
        top_domains: [],
        top_topics: [],
        query,
        timespan,
        is_rate_limited: true,
        notice: "GDELT upstream rate limit reached. Please wait 5 seconds.",
        source: "gdelt",
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          articles: [],
          total_retrieved: 0,
          hits_estimate: 0,
          tone_distribution: { positive: 0, neutral: 0, negative: 0 },
          timeline: [],
          top_domains: [],
          top_topics: [],
          query,
          timespan,
          is_rate_limited: false,
          error: `GDELT API error (HTTP ${res.status})`,
          source: "gdelt",
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    let rawArticles: RawGdeltArticle[] = [];
    try {
      const data = JSON.parse(responseText);
      rawArticles = data.articles || [];
    } catch {
      rawArticles = [];
    }

    if (rawArticles.length === 0) {
      return NextResponse.json({
        articles: [],
        total_retrieved: 0,
        hits_estimate: 0,
        tone_distribution: { positive: 0, neutral: 0, negative: 0 },
        timeline: [],
        top_domains: [],
        top_topics: [],
        query,
        timespan,
        is_rate_limited: false,
        notice: `No GDELT news articles found for "${query}".`,
        source: "gdelt",
      });
    }

    // Normalize into Social Pulse Post models
    const articles: Post[] = rawArticles.map((raw, idx) =>
      transformGdeltArticle(raw, query, idx)
    );

    // Compute genuine tone distribution
    const toneDist = { positive: 0, neutral: 0, negative: 0 };
    articles.forEach((art) => {
      if (art.sentiment === "positive") toneDist.positive++;
      else if (art.sentiment === "negative") toneDist.negative++;
      else toneDist.neutral++;
    });

    // Compute genuine coverage timeline
    const dateMap: Record<string, number> = {};
    articles.forEach((art) => {
      const d = art.posted_at ? art.posted_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
      dateMap[d] = (dateMap[d] || 0) + 1;
    });

    const timeline: GdeltTimelinePoint[] = Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top domains
    const domainMap: Record<string, number> = {};
    articles.forEach((art) => {
      const domain = art.author_handle || "news.media";
      domainMap[domain] = (domainMap[domain] || 0) + 1;
    });
    const topDomains = Object.entries(domainMap)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top topics
    const topicMap: Record<string, number> = {};
    articles.forEach((art) => {
      topicMap[art.topic] = (topicMap[art.topic] || 0) + 1;
    });
    const topTopics = Object.entries(topicMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    const payload: GdeltNewsResponse = {
      articles,
      total_retrieved: articles.length,
      hits_estimate: articles.length,
      tone_distribution: toneDist,
      timeline,
      top_domains: topDomains,
      top_topics: topTopics,
      query,
      timespan,
      is_rate_limited: false,
      source: "gdelt",
    };

    cache.set(cacheKey, { data: payload, timestamp: Date.now() });

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json(
      {
        articles: [],
        total_retrieved: 0,
        hits_estimate: 0,
        tone_distribution: { positive: 0, neutral: 0, negative: 0 },
        timeline: [],
        top_domains: [],
        top_topics: [],
        query,
        timespan,
        is_rate_limited: false,
        error: err.message || "Failed to query GDELT API.",
        source: "gdelt",
      },
      { status: 504 }
    );
  }
}
