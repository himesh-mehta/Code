import { NextRequest, NextResponse } from "next/server";
import { transformBlueskyPost } from "@/lib/bluesky";
import { Post } from "@/types";

export const runtime = "nodejs";

const BLUESKY_SEARCH_ENDPOINT = "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const limitParam = parseInt(searchParams.get("limit") || "15", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 15 : limitParam), 50);
  const cursor = searchParams.get("cursor") || undefined;

  if (!q) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required (e.g. skilling, employability, apprenticeships)" },
      { status: 400 }
    );
  }

  try {
    const targetUrl = new URL(BLUESKY_SEARCH_ENDPOINT);
    targetUrl.searchParams.set("q", q);
    targetUrl.searchParams.set("limit", limit.toString());

    // If cursor looks like an ISO date or timestamp, use 'until', otherwise pass 'cursor'
    if (cursor) {
      if (cursor.includes("T") || cursor.includes("-") || !isNaN(Number(cursor))) {
        targetUrl.searchParams.set("until", cursor);
      } else {
        targetUrl.searchParams.set("cursor", cursor);
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "SocialPulse-TataSTRIVE/1.0 (Next.js Social Listening Connector)",
    };

    let bskyRes = await fetch(targetUrl.toString(), {
      method: "GET",
      headers,
      next: { revalidate: 30 }, // Cache briefly to prevent rate limits
    });

    // If cursor was blocked by WAF with 403, retry with 'until' if possible or without cursor
    if (bskyRes.status === 403 && cursor) {
      console.warn("Bluesky returned 403 with cursor, retrying search without cursor...");
      targetUrl.searchParams.delete("cursor");
      bskyRes = await fetch(targetUrl.toString(), { method: "GET", headers });
    }

    // Handle HTTP 429 Rate Limiting
    if (bskyRes.status === 429) {
      return NextResponse.json(
        {
          error: "Bluesky rate limit reached (HTTP 429). Please pause for a moment before searching again.",
          status: 429,
          items: [],
          total: 0,
        },
        { status: 429 }
      );
    }

    // Handle other HTTP errors
    if (!bskyRes.ok) {
      const errText = await bskyRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Bluesky API returned HTTP ${bskyRes.status}: ${errText.slice(0, 150) || bskyRes.statusText}`,
          status: bskyRes.status,
          items: [],
          total: 0,
        },
        { status: bskyRes.status }
      );
    }

    const data = await bskyRes.json();
    const rawPosts: any[] = data.posts || [];

    // Transform raw posts into normalized Social Pulse Post models
    const transformedPosts: Post[] = rawPosts.map((raw) =>
      transformBlueskyPost(raw, q)
    );

    // Calculate next cursor: either data.cursor or the posted_at timestamp of the oldest post
    let nextCursor = data.cursor || null;
    if (!nextCursor && transformedPosts.length > 0) {
      nextCursor = transformedPosts[transformedPosts.length - 1].posted_at;
    }

    const relevantCount = transformedPosts.filter((p) => p.is_relevant).length;

    /*
     * SUPABASE INTEGRATION HOOK (Ready for future database enablement):
     * When Supabase credentials are configured, persist posts seamlessly here:
     *
     * if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
     *   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
     *   await supabase.from('posts').upsert(transformedPosts, { onConflict: 'id' });
     * }
     */

    return NextResponse.json({
      items: transformedPosts,
      cursor: nextCursor,
      hits_total: data.hitsTotal || transformedPosts.length,
      total: transformedPosts.length,
      relevant_count: relevantCount,
      query: q,
      source: "bluesky",
    });
  } catch (err: any) {
    console.error("Error fetching Bluesky public stream:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to contact Bluesky network",
        items: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}
