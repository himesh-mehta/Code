import { NextRequest, NextResponse } from "next/server";
import { transformBlueskyPost } from "@/lib/bluesky";
import { Post } from "@/types";

export const runtime = "nodejs";

const BLUESKY_SEARCH_ENDPOINT = "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts";

// In-memory cache for ultra-fast response
interface CacheEntry {
  data: any;
  timestamp: number;
}
const blueskyCache = new Map<string, CacheEntry>();
const BLUESKY_CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const limitParam = parseInt(searchParams.get("limit") || "15", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 15 : limitParam), 50);
  const cursor = searchParams.get("cursor") || undefined;

  if (!q) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required (e.g. skilling, youth employability, Tata STRIVE)" },
      { status: 400 }
    );
  }

  const cacheKey = `${q.toLowerCase()}:${limit}:${cursor || ""}`;
  const cached = blueskyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < BLUESKY_CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const targetUrl = new URL(BLUESKY_SEARCH_ENDPOINT);
    targetUrl.searchParams.set("q", q);
    targetUrl.searchParams.set("limit", limit.toString());
    targetUrl.searchParams.set("sort", "latest");

    if (cursor) {
      targetUrl.searchParams.set("cursor", cursor);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "SocialPulse-TataSTRIVE/1.0",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let bskyRes: Response;
    try {
      bskyRes = await fetch(targetUrl.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
        next: { revalidate: 30 },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (bskyRes.status === 403 && cursor) {
      targetUrl.searchParams.delete("cursor");
      bskyRes = await fetch(targetUrl.toString(), { method: "GET", headers });
    }

    if (bskyRes.status === 429) {
      return NextResponse.json(
        {
          error: "Bluesky rate limit reached (HTTP 429). Please pause for a moment before searching again.",
          status: 429,
          items: [],
          total: 0,
          source: "bluesky",
        },
        { status: 429 }
      );
    }

    if (!bskyRes.ok) {
      const errText = await bskyRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Bluesky API returned HTTP ${bskyRes.status}: ${errText.slice(0, 150) || bskyRes.statusText}`,
          status: bskyRes.status,
          items: [],
          total: 0,
          source: "bluesky",
        },
        { status: bskyRes.status >= 500 ? 502 : bskyRes.status }
      );
    }

    const data = await bskyRes.json();
    const rawPosts: any[] = data.posts || [];

    if (rawPosts.length === 0) {
      return NextResponse.json({
        items: [],
        cursor: null,
        hits_total: 0,
        total: 0,
        relevant_count: 0,
        query: q,
        source: "bluesky",
        message: `No Bluesky posts found matching "${q}".`,
      });
    }

    // Transform raw posts into normalized Social Pulse Post models
    const transformedPosts: Post[] = rawPosts.map((raw) =>
      transformBlueskyPost(raw, q)
    );

    let nextCursor = data.cursor || null;
    if (!nextCursor && transformedPosts.length > 0) {
      nextCursor = transformedPosts[transformedPosts.length - 1].posted_at;
    }

    const relevantCount = transformedPosts.filter((p) => p.is_relevant).length;

    const finalResult = {
      items: transformedPosts,
      cursor: nextCursor,
      hits_total: data.hitsTotal || transformedPosts.length,
      total: transformedPosts.length,
      relevant_count: relevantCount,
      query: q,
      source: "bluesky",
    };

    blueskyCache.set(cacheKey, { data: finalResult, timestamp: Date.now() });
    return NextResponse.json(finalResult);
  } catch (err: any) {
    return NextResponse.json(
      {
        items: [],
        cursor: null,
        hits_total: 0,
        total: 0,
        relevant_count: 0,
        query: q,
        source: "bluesky",
        error: err.message || "Bluesky search failed or timed out.",
      },
      { status: 504 }
    );
  }
}
