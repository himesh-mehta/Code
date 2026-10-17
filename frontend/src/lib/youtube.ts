import { Post, Topic, Platform, Sentiment } from "../types";

const DEFAULT_YOUTUBE_API_KEY =
  process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || "";

function inferTopic(title: string, desc: string, query: string): string {
  const text = `${title} ${desc} ${query}`.toLowerCase();
  if (text.includes("interview") || text.includes("hr") || text.includes("mock") || text.includes("resume") || text.includes("gd")) {
    return "Interview preparation";
  }
  if (text.includes("ai") || text.includes("prompt") || text.includes("chatgpt") || text.includes("python") || text.includes("software") || text.includes("coding")) {
    return "Practical AI skills";
  }
  if (text.includes("solar") || text.includes("electric") || text.includes("strive") || text.includes("tata") || text.includes("vocational") || text.includes("placement") || text.includes("training") || text.includes("course") || text.includes("iti")) {
    return "Vocational training access";
  }
  if (text.includes("communication") || text.includes("english") || text.includes("soft skills") || text.includes("confidence")) {
    return "Workplace communication";
  }
  // Default to a capitalized version of the query if meaningful
  if (query.trim().length > 2) {
    return query
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return "Employability & Skilling";
}

function inferSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const positiveWords = ["free", "placement", "success", "helpful", "good", "great", "excellent", "opportunity", "hired", "change", "boost", "growth", "best"];
  const negativeWords = ["reject", "no job", "unemployed", "difficult", "struggle", "bad", "scam", "confused", "problem", "fail", "delay", "worst", "waste"];

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
  const lower = text.toLowerCase();
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

export async function fetchYouTubePosts(
  query: string,
  apiKey?: string,
  maxResults = 12
): Promise<{ posts: Post[]; totalFound: number; error?: string }> {
  const key = apiKey || DEFAULT_YOUTUBE_API_KEY;

  if (!key) {
    return {
      posts: [],
      totalFound: 0,
      error: "YouTube API key not configured. Add it in Settings or .env.local",
    };
  }

  if (!query || !query.trim()) {
    return { posts: [], totalFound: 0 };
  }

  try {
    // 1. Search for videos matching query
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(
      query.trim()
    )}&type=video&key=${key}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const errJson = await searchRes.json().catch(() => null);
      const msg = errJson?.error?.message || `YouTube API returned status ${searchRes.status}`;
      return { posts: [], totalFound: 0, error: msg };
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];
    if (items.length === 0) {
      return { posts: [], totalFound: 0 };
    }

    // 2. Fetch statistics (views, likes, comments) for returned video IDs
    const videoIds = items.map((it: any) => it.id?.videoId).filter(Boolean);
    let statsMap: Record<string, { likes: number; comments: number; views: number }> = {};

    if (videoIds.length > 0) {
      try {
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(
          ","
        )}&key=${key}`;
        const statsRes = await fetch(statsUrl);
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
        console.warn("Could not fetch YouTube video statistics, continuing with snippet data:", err);
      }
    }

    // 3. Map into Post objects
    const posts: Post[] = items.map((it: any) => {
      const vidId = it.id?.videoId;
      const snippet = it.snippet || {};
      const title = snippet.title || "";
      const description = snippet.description || "";
      const channel = snippet.channelTitle || "YouTube Creator";
      const fullText = `${title}\n\n${description}`.trim();

      const stats = statsMap[vidId] || { likes: 0, comments: 0, views: 0 };

      return {
        id: `yt_${vidId}`,
        platform: "youtube" as Platform,
        author_handle: `@${channel.replace(/\s+/g, "")}`,
        content: fullText,
        posted_at: snippet.publishedAt || new Date().toISOString(),
        likes: stats.likes,
        comments: stats.comments,
        shares: Math.round(stats.likes * 0.15),
        topic: inferTopic(title, description, query),
        sentiment: inferSentiment(fullText),
        is_question: checkIfQuestion(title) || checkIfQuestion(description),
        is_relevant: true,
        url: `https://www.youtube.com/watch?v=${vidId}`,
        is_sample: false, // Live verified YouTube API signal
      };
    });

    return {
      posts,
      totalFound: searchData.pageInfo?.totalResults || posts.length,
    };
  } catch (err: any) {
    return {
      posts: [],
      totalFound: 0,
      error: err.message || "Failed to query YouTube Data API",
    };
  }
}
