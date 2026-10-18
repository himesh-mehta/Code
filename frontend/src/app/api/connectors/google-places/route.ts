import { NextRequest, NextResponse } from "next/server";
import { Post, Platform, Sentiment } from "@/types";

export const runtime = "nodejs";

const DEFAULT_GOOGLE_PLACES_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
  "";

// In-memory cache for fast sub-second repeat responses
interface CacheEntry {
  data: any;
  timestamp: number;
}
const placesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function inferTopicFromReview(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("solar") ||
    lower.includes("ev") ||
    lower.includes("electric") ||
    lower.includes("technician") ||
    lower.includes("gda") ||
    lower.includes("automotive") ||
    lower.includes("vocational") ||
    lower.includes("trade")
  ) {
    return "Vocational training access";
  }
  if (
    lower.includes("interview") ||
    lower.includes("placement") ||
    lower.includes("resume") ||
    lower.includes("hr") ||
    lower.includes("job")
  ) {
    return "Interview preparation";
  }
  if (
    lower.includes("ai") ||
    lower.includes("prompt") ||
    lower.includes("excel") ||
    lower.includes("data") ||
    lower.includes("computer")
  ) {
    return "Practical AI skills";
  }
  return "Employability";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "Tata STRIVE";
  const limitParam = parseInt(searchParams.get("limit") || "15", 10);
  const limit = Math.min(Math.max(5, isNaN(limitParam) ? 15 : limitParam), 50);
  const apiKey = searchParams.get("apiKey") || DEFAULT_GOOGLE_PLACES_KEY;

  const cacheKey = `${q.toLowerCase()}:${limit}`;
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        items: [],
        total: 0,
        source: "google_maps",
        error: "GOOGLE_PLACES_API_KEY is not configured. Add GOOGLE_PLACES_API_KEY to .env to fetch live center reviews.",
      },
      { status: 503 }
    );
  }

  try {
    const searchQuery = `${q} Skill Development Centre India`;
    const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    searchUrl.searchParams.set("query", searchQuery);
    searchUrl.searchParams.set("key", apiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let searchRes: Response;
    try {
      searchRes = await fetch(searchUrl.toString(), {
        signal: controller.signal,
        next: { revalidate: 120 },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!searchRes.ok) {
      return NextResponse.json(
        {
          items: [],
          total: 0,
          source: "google_maps",
          error: `Google Places API returned HTTP ${searchRes.status}`,
        },
        { status: searchRes.status >= 500 ? 502 : searchRes.status }
      );
    }

    const searchData = await searchRes.json();
    if (searchData.status === "REQUEST_DENIED" || searchData.status === "OVER_QUERY_LIMIT") {
      return NextResponse.json({
        items: [],
        total: 0,
        source: "google_maps",
        error: searchData.error_message || `Google Places API: ${searchData.status}. Ensure billing is enabled in Google Cloud Console.`,
      });
    }
    const places = (searchData.results || []).slice(0, 3);

    if (places.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
        source: "google_maps",
        message: `No Google Places centres found for "${q}".`,
      });
    }

    // Fetch details & reviews for the found centers in parallel
    const reviewsPromises = places.map(async (place: any) => {
      try {
        const placeId = place.place_id;
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,reviews,formatted_address,url&key=${apiKey}`;
        const detRes = await fetch(detailsUrl, { next: { revalidate: 120 } });
        if (!detRes.ok) return [];
        const detData = await detRes.json();
        const placeDetails = detData.result || {};
        const rawReviews = placeDetails.reviews || [];

        return rawReviews.map((rev: any, idx: number) => {
          const rating = rev.rating || 5;
          const text = rev.text || `Verified review for ${placeDetails.name || place.name}`;
          const sentiment: Sentiment = rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";
          const date = rev.time ? new Date(rev.time * 1000).toISOString() : new Date().toISOString();

          return {
            id: `gplaces_${placeId}_${idx}`,
            platform: "google_maps" as Platform,
            author_handle: `@${(rev.author_name || "Center_Student").replace(/\s+/g, "_")}`,
            content: `${placeDetails.name || place.name}: "${text}"`,
            posted_at: date,
            likes: undefined,
            comments: undefined,
            shares: undefined,
            rating,
            topic: inferTopicFromReview(text),
            sentiment,
            is_question: text.includes("?") || text.toLowerCase().includes("how ") || text.toLowerCase().includes("what "),
            is_relevant: true,
            place_name: placeDetails.name || place.name,
            place_id: placeId,
            url: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
            is_sample: false,
          } as Post;
        });
      } catch {
        return [];
      }
    });

    const reviewsResults = await Promise.all(reviewsPromises);
    const flatReviews = reviewsResults.flat();
    const finalReviews = flatReviews.slice(0, limit);

    const responseData = {
      items: finalReviews,
      total: finalReviews.length,
      source: "google_maps",
    };

    placesCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json(
      {
        items: [],
        total: 0,
        source: "google_maps",
        error: err.message || "Failed to query Google Places API.",
      },
      { status: 504 }
    );
  }
}
