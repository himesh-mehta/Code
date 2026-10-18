import { Post, Sentiment, Platform, GdeltTimelinePoint, GdeltNewsResponse } from "@/types";

export const GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

export interface RawGdeltArticle {
  url: string;
  url_mobile?: string;
  title: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

/**
 * Parses GDELT's compact timestamp format (YYYYMMDDTHHMMSSZ or YYYYMMDDHHMMSS) into ISO-8601
 */
export function parseGdeltDate(rawDate?: string): string {
  if (!rawDate) return new Date().toISOString();
  try {
    const clean = rawDate.replace(/[^0-9]/g, "");
    if (clean.length >= 8) {
      const year = clean.slice(0, 4);
      const month = clean.slice(4, 6);
      const day = clean.slice(6, 8);
      const hour = clean.length >= 10 ? clean.slice(8, 10) : "00";
      const min = clean.length >= 12 ? clean.slice(10, 12) : "00";
      const sec = clean.length >= 14 ? clean.slice(12, 14) : "00";
      return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
    }
  } catch (e) {
    // fallback
  }
  return new Date().toISOString();
}

/**
 * Classifies news article topic into Tata STRIVE actionable categories
 */
export function classifyGdeltTopic(title: string, query: string): string {
  const text = `${title} ${query}`.toLowerCase();

  if (
    text.includes("solar") ||
    text.includes("electric vehicle") ||
    text.includes("ev technician") ||
    text.includes("vocational") ||
    text.includes("iti") ||
    text.includes("tvet") ||
    text.includes("polytechnic") ||
    text.includes("tata strive") ||
    text.includes("skill center") ||
    text.includes("trade")
  ) {
    return "Vocational training access";
  }

  if (
    text.includes("ai") ||
    text.includes("artificial intelligence") ||
    text.includes("digital skill") ||
    text.includes("automation") ||
    text.includes("tech") ||
    text.includes("coding") ||
    text.includes("cyber")
  ) {
    return "Practical AI skills";
  }

  if (
    text.includes("interview") ||
    text.includes("placement") ||
    text.includes("recruitment") ||
    text.includes("resume") ||
    text.includes("campus") ||
    text.includes("hiring")
  ) {
    return "Interview preparation";
  }

  if (
    text.includes("apprentice") ||
    text.includes("internship") ||
    text.includes("stipend") ||
    text.includes("on-the-job") ||
    text.includes("naps")
  ) {
    return "Apprenticeships";
  }

  if (
    text.includes("entrepreneur") ||
    text.includes("startup") ||
    text.includes("mudra") ||
    text.includes("self-employment") ||
    text.includes("micro business")
  ) {
    return "Entrepreneurship";
  }

  if (
    text.includes("guidance") ||
    text.includes("career") ||
    text.includes("counseling") ||
    text.includes("mentor") ||
    text.includes("roadmap")
  ) {
    return "Career guidance";
  }

  return "Employability";
}

/**
 * Classifies media coverage tone (positive, neutral, negative)
 * GDELT represents media tone from journalists and publishers, not individual citizen sentiment
 */
export function classifyGdeltTone(title: string): Sentiment {
  const text = title.toLowerCase();

  const positiveSignals = [
    "boost",
    "empower",
    "growth",
    "launch",
    "success",
    "opportunity",
    "expand",
    "partnership",
    "mou",
    "trained",
    "placed",
    "milestone",
    "award",
    "record",
    "initiative",
    "free",
    "promising",
    "champion",
  ];

  const negativeSignals = [
    "unemployment",
    "jobless",
    "crisis",
    "shortage",
    "decline",
    "layoff",
    "drop",
    "struggle",
    "gap",
    "deficit",
    "fail",
    "strike",
    "protest",
    "scam",
    "delay",
    "concern",
    "slowdown",
  ];

  let posScore = 0;
  let negScore = 0;

  positiveSignals.forEach((w) => {
    if (text.includes(w)) posScore += 1;
  });

  negativeSignals.forEach((w) => {
    if (text.includes(w)) negScore += 1;
  });

  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

/**
 * Maps standard date range options into GDELT timespan parameters
 */
export function mapDateRangeToTimespan(range?: string): string {
  switch (range) {
    case "7d":
      return "7days";
    case "14d":
      return "14days";
    case "30d":
      return "1month";
    case "90d":
      return "3months";
    case "all":
      return "3months";
    default:
      return "1month";
  }
}

/**
 * Transforms a raw GDELT DOC API article item into the Social Pulse Post model
 */
export function transformGdeltArticle(raw: RawGdeltArticle, query: string, index: number): Post {
  const publishedAt = parseGdeltDate(raw.seendate);
  const domain = raw.domain || (raw.url ? new URL(raw.url).hostname.replace(/^www\./, "") : "news.media");
  const topic = classifyGdeltTopic(raw.title || "", query);
  const tone = classifyGdeltTone(raw.title || "");

  // Generate deterministic id from url or title
  const cleanId = raw.url
    ? "gdelt_" + Math.abs(raw.url.split("").reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)).toString(36)
    : `gdelt_${Date.now()}_${index}`;

  return {
    id: cleanId,
    platform: "gdelt" as Platform,
    author_handle: domain,
    content: raw.title || "Untitled Media Dispatch",
    article_title: raw.title || "Untitled Media Dispatch",
    domain,
    media_url: raw.socialimage || null,
    posted_at: publishedAt,
    likes: undefined,
    comments: undefined,
    shares: undefined,
    topic,
    sentiment: tone,
    is_question: (raw.title || "").includes("?"),
    is_relevant: true,
    url: raw.url || null,
    is_sample: false,
  };
}
