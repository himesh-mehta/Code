/**
 * feed-analytics.ts — Real Analytics & Classification Engine for Social Listening (/feed)
 * 
 * Implements:
 * 1. 8-topic keyword taxonomy classification with topic_id
 * 2. Multi-lingual (English, Hindi, Hinglish) sentiment analysis with question neutrality
 * 3. 7-day velocity and top recurring topics computation (safe from NaN)
 * 4. Rich in-depth sentiment breakdown with themes, examples, source mood, and summary
 * 5. Round-robin multi-source interleaving for balanced feeds
 * 6. Safe formatting helpers (preventing "mentions mentions", NaN%, empty hashtags)
 */

import { Post, Platform, Sentiment } from "@/types";

// ============================================================================
// 1. TOPIC TAXONOMY CLASSIFICATION
// ============================================================================

export interface TaxonomyTopic {
  id: string;
  name: string;
  keywords: string[];
}

export const FEED_TAXONOMY: TaxonomyTopic[] = [
  {
    id: "ai-and-digital-skills",
    name: "AI and digital skills",
    keywords: [
      "ai", "prompt engineering", "genai", "chatgpt", "machine learning",
      "digital skills", "python", "data analytics", "automation", "coding",
      "software", "cloud computing", "llm", "copilot", "cybersecurity"
    ],
  },
  {
    id: "ev-and-battery",
    name: "EV and battery",
    keywords: [
      "ev", "electric vehicle", "battery", "bms", "lithium", "charging station",
      "ev technician", "powertrain", "chakan", "two wheeler ev", "electric scooter"
    ],
  },
  {
    id: "solar-pv",
    name: "Solar PV",
    keywords: [
      "solar", "solar pv", "rooftop solar", "photovoltaic", "solar technician",
      "inverter", "surya ghar", "clean energy", "renewable", "net metering"
    ],
  },
  {
    id: "employability-and-jobs",
    name: "Employability and jobs",
    keywords: [
      "employability", "interview", "resume", "cv", "job", "career", "placement",
      "campus drive", "fresher", "soft skills", "communication", "mock interview",
      "workplace", "hiring", "salary"
    ],
  },
  {
    id: "vocational-training",
    name: "Vocational training",
    keywords: [
      "vocational", "vocational training", "iti", "polytechnic", "trade", "tvet",
      "welding", "electrical", "mechanic", "technician", "plumbing", "hvac",
      "skill development", "training centre", "practical lab"
    ],
  },
  {
    id: "internships-and-apprenticeships",
    name: "Internships and apprenticeships",
    keywords: [
      "internship", "intern", "apprenticeship", "apprentice", "naps", "nats",
      "stipend", "on the job training", "ojt", "trainee", "rozgar mela"
    ],
  },
  {
    id: "scholarships-and-stipends",
    name: "Scholarships and stipends",
    keywords: [
      "scholarship", "stipend", "financial aid", "grant", "subsidy", "fees",
      "fee waiver", "free course", "allowance", "dbt", "pm scheme"
    ],
  },
  {
    id: "tata-strive",
    name: "Tata STRIVE",
    keywords: [
      "tata strive", "tatastrive", "strive", "tata community initiatives", "tcit",
      "tssdc", "tsec", "tata trust", "tata group skilling"
    ],
  },
];

export function classifyPostTopic(content: string, query?: string, title?: string): { topic: string; topic_id: string } {
  const text = `${content} ${query || ""} ${title || ""}`.toLowerCase();

  // 1. Direct Tata STRIVE brand mentions
  if (text.includes("tata strive") || text.includes("tatastrive") || text.includes("tssdc") || text.includes("tsec")) {
    // Check if sub-topic is prominent
    for (const t of FEED_TAXONOMY) {
      if (t.id === "tata-strive") continue;
      if (t.keywords.some((k) => text.includes(k))) {
        return { topic: t.name, topic_id: t.id };
      }
    }
    return { topic: "Tata STRIVE", topic_id: "tata-strive" };
  }

  // 2. Score matches across taxonomy
  let bestTopic = FEED_TAXONOMY[3]; // default: Employability and jobs
  let maxScore = 0;

  for (const t of FEED_TAXONOMY) {
    let score = 0;
    for (const kw of t.keywords) {
      if (text.includes(kw)) {
        score += kw.includes(" ") ? 3 : 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestTopic = t;
    }
  }

  return { topic: bestTopic.name, topic_id: bestTopic.id };
}

// ============================================================================
// 2. MULTI-LINGUAL SENTIMENT ANALYSIS (ENGLISH, HINDI, HINGLISH)
// ============================================================================

const POSITIVE_LEXICON = [
  "good", "great", "excellent", "placement", "placed", "thank", "thanks",
  "congratulations", "best", "helpful", "proud", "job", "salary", "offer",
  "selected", "awesome", "supportive", "inspired", "wonderful", "successful",
  "badhiya", "shandar", "achha", "accha", "dhanyawad", "sahyog", "safal",
  "mila", "pass", "certified", "appreciate", "super", "kamaal", "badhia",
  "positive", "happy", "beneficial", "worth", "top", "opportunity"
];

const NEGATIVE_LEXICON = [
  "bad", "worst", "fraud", "fake", "problem", "issue", "delayed", "delay",
  "stipend", "fees", "fee", "expensive", "reject", "scam", "struggle",
  "loot", "unpaid", "tension", "drop", "difficult", "bekhar", "bekar",
  "galat", "dukh", "dikkat", "pareshani", "cheating", "waste", "complaint",
  "unattended", "fail", "poor", "unemployed", "hard", "loss", "useless"
];

const QUESTION_LEXICON = [
  "?", "how", "what", "why", "when", "where", "which", "who", "kya", "kaise",
  "kab", "kahan", "kitna", "eligibility", "can i", "is it", "process", "apply"
];

// In-memory cache for computed sentiment
const sentimentCache = new Map<string, Sentiment>();

export function classifyPostSentiment(content: string, isQuestion?: boolean): Sentiment {
  const cacheKey = content.trim().slice(0, 100);
  if (sentimentCache.has(cacheKey)) {
    return sentimentCache.get(cacheKey)!;
  }

  const text = content.toLowerCase();

  let posScore = 0;
  let negScore = 0;

  for (const word of POSITIVE_LEXICON) {
    if (text.includes(word)) posScore++;
  }
  for (const word of NEGATIVE_LEXICON) {
    if (text.includes(word)) negScore++;
  }

  const hasQuestionMarks = text.includes("?") || isQuestion || QUESTION_LEXICON.some((q) => text.includes(q));

  let sentiment: Sentiment = "neutral";

  // Plain questions without strong positive/negative sentiment are neutral
  if (hasQuestionMarks && Math.abs(posScore - negScore) <= 1) {
    sentiment = "neutral";
  } else if (posScore > negScore) {
    sentiment = "positive";
  } else if (negScore > posScore) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
  }

  sentimentCache.set(cacheKey, sentiment);
  return sentiment;
}

// ============================================================================
// 3. WHAT PEOPLE ARE TALKING ABOUT (TOP 5 RECURRING TOPICS)
// ============================================================================

export interface ComputedTopicItem {
  id: string;
  name: string;
  post_count: number;
  growth_label: string | null; // e.g. "+18%", "-12%", "New", or null
  growth_pct?: number;
  location_or_source: string; // e.g. "Pune Centre" or "Mostly Bluesky"
  is_new?: boolean;
}

export function computeTopTopics(
  allPosts: Post[],
  activeFilters?: { query?: string; topic?: string }
): ComputedTopicItem[] {
  if (!allPosts || allPosts.length === 0) return [];

  // Filter out posts if search/filter is active
  let matchingPosts = allPosts;
  if (activeFilters?.query) {
    const q = activeFilters.query.toLowerCase();
    matchingPosts = matchingPosts.filter((p) =>
      `${p.content} ${p.topic} ${p.author_handle}`.toLowerCase().includes(q)
    );
  }

  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  // Group by topic
  const topicMap = new Map<
    string,
    {
      id: string;
      name: string;
      recentPosts: Post[];
      prevPosts: Post[];
      allMatchingPosts: Post[];
    }
  >();

  // Initialize with taxonomy topics so names are standardized
  for (const t of FEED_TAXONOMY) {
    topicMap.set(t.name, {
      id: t.id,
      name: t.name,
      recentPosts: [],
      prevPosts: [],
      allMatchingPosts: [],
    });
  }

  for (const post of matchingPosts) {
    // Determine standardized topic
    const topicInfo = classifyPostTopic(post.content, activeFilters?.query, post.article_title || "");
    const topicName = topicInfo.topic;

    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, {
        id: topicInfo.topic_id,
        name: topicName,
        recentPosts: [],
        prevPosts: [],
        allMatchingPosts: [],
      });
    }

    const group = topicMap.get(topicName)!;
    group.allMatchingPosts.push(post);

    const postTime = new Date(post.posted_at).getTime();
    if (isNaN(postTime)) {
      group.recentPosts.push(post);
    } else {
      const age = now - postTime;
      if (age <= SEVEN_DAYS_MS) {
        group.recentPosts.push(post);
      } else if (age <= FOURTEEN_DAYS_MS) {
        group.prevPosts.push(post);
      }
    }
  }

  // Filter topics with at least 1 post and sort by count
  const computedList: ComputedTopicItem[] = [];

  for (const [, group] of topicMap.entries()) {
    const totalCount = group.allMatchingPosts.length;
    if (totalCount === 0) continue;

    // Use recent count if available; fallback to totalCount if all data is recent
    const recentCount = group.recentPosts.length > 0 ? group.recentPosts.length : totalCount;
    const prevCount = group.prevPosts.length;

    let growthLabel: string | null = null;
    let growthPct: number | undefined = undefined;

    if (prevCount === 0 && recentCount > 0) {
      growthLabel = "New";
    } else if (prevCount > 0) {
      const pct = Math.round(((recentCount - prevCount) / prevCount) * 100);
      growthPct = pct;
      growthLabel = pct >= 0 ? `+${pct}%` : `${pct}%`;
    }

    // Determine location or top source
    let locationOrSource = "";
    const postWithLocation = group.allMatchingPosts.find((p) => p.place_name || p.location);
    if (postWithLocation) {
      locationOrSource = postWithLocation.place_name || postWithLocation.location || "Centres Network";
    } else {
      // Find top platform
      const platformCounts: Record<string, number> = {};
      group.allMatchingPosts.forEach((p) => {
        platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
      });
      const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
      const platformName = topPlatform
        ? topPlatform[0] === "youtube"
          ? "YouTube"
          : topPlatform[0] === "bluesky"
          ? "Bluesky"
          : topPlatform[0] === "google_news"
          ? "Google News"
          : topPlatform[0] === "gdelt"
          ? "GDELT"
          : "Google Places"
        : "Social Signals";
      locationOrSource = `Mostly ${platformName}`;
    }

    computedList.push({
      id: group.id,
      name: group.name,
      post_count: recentCount,
      growth_label: growthLabel,
      growth_pct: growthPct,
      location_or_source: locationOrSource,
      is_new: growthLabel === "New",
    });
  }

  computedList.sort((a, b) => b.post_count - a.post_count);
  return computedList.slice(0, 5);
}

// ============================================================================
// 4. IN-DEPTH SENTIMENT BREAKDOWN ENGINE
// ============================================================================

export interface SentimentExamplePost {
  id: string;
  author: string;
  snippet: string;
  platform: Platform;
  url: string | null;
}

export interface SentimentRowData {
  count: number;
  percentage: number;
  themes: string[];
  examples: SentimentExamplePost[];
}

export interface SourceMoodItem {
  source: string;
  platform: Platform;
  total: number;
  posPct: number;
  neuPct: number;
  negPct: number;
}

export interface InDepthSentimentAnalysis {
  totalAnalyzed: number;
  headerTitle: string;
  summarySentence: string;
  positive: SentimentRowData;
  neutral: SentimentRowData;
  negative: SentimentRowData;
  sourceMoods: SourceMoodItem[];
}

export function computeInDepthSentiment(
  posts: Post[],
  searchQuery?: string,
  dateRange: string = "30d"
): InDepthSentimentAnalysis {
  const total = posts.length;

  if (total === 0) {
    return {
      totalAnalyzed: 0,
      headerTitle: "No records to analyse",
      summarySentence: "Not enough posts to analyse yet.",
      positive: { count: 0, percentage: 0, themes: [], examples: [] },
      neutral: { count: 0, percentage: 0, themes: [], examples: [] },
      negative: { count: 0, percentage: 0, themes: [], examples: [] },
      sourceMoods: [],
    };
  }

  const posPosts = posts.filter((p) => p.sentiment === "positive");
  const neuPosts = posts.filter((p) => p.sentiment === "neutral");
  const negPosts = posts.filter((p) => p.sentiment === "negative");

  const posPct = Math.round((posPosts.length / total) * 100);
  const neuPct = Math.round((neuPosts.length / total) * 100);
  const negPct = Math.max(0, 100 - posPct - neuPct);

  // Extract themes per sentiment group from keyword frequency
  const extractThemes = (group: Post[], defaultThemes: string[]): string[] => {
    if (group.length === 0) return defaultThemes;
    const freq: Record<string, number> = {};
    const candidateKeywords = [
      "placement support", "job readiness", "lab equipment", "practical training",
      "certification", "faculty guidance", "fees", "eligibility confusion",
      "stipend delay", "course timing", "admissions", "curriculum", "scholarship",
      "batch start date", "career guidance", "interview prep", "iti placement"
    ];

    for (const p of group) {
      const txt = p.content.toLowerCase();
      for (const kw of candidateKeywords) {
        if (txt.includes(kw)) {
          freq[kw] = (freq[kw] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2) {
      return sorted.slice(0, 3).map(([k]) => k);
    }
    return defaultThemes;
  };

  const posThemes = extractThemes(posPosts, ["placement support", "practical training"]);
  const neuThemes = extractThemes(neuPosts, ["admissions & eligibility", "batch start date"]);
  const negThemes = extractThemes(negPosts, ["fees & stipend queries", "eligibility confusion"]);

  // Extract 2 clean, truncated examples
  const getExamples = (group: Post[]): SentimentExamplePost[] => {
    return group.slice(0, 2).map((p) => ({
      id: p.id,
      author: p.author_handle || "@learner",
      snippet: p.content.length > 110 ? `${p.content.slice(0, 110)}...` : p.content,
      platform: p.platform,
      url: p.url,
    }));
  };

  // Build Sentiment by Source Breakdown
  const sourceGroups: Record<Platform, Post[]> = {
    youtube: [],
    bluesky: [],
    google_news: [],
    gdelt: [],
    google_maps: [],
    instagram: [],
    facebook: [],
    linkedin: [],
    google_play: [],
    csv_import: [],
    reddit: [],
    twitter: [],
    other: [],
  };

  posts.forEach((p) => {
    if (sourceGroups[p.platform]) {
      sourceGroups[p.platform].push(p);
    }
  });

  const sourceMoods: SourceMoodItem[] = [];
  const sourceLabels: Record<string, string> = {
    youtube: "YouTube",
    bluesky: "Bluesky",
    google_news: "Google News",
    gdelt: "GDELT",
    google_maps: "Places",
  };

  for (const [platformKey, pList] of Object.entries(sourceGroups)) {
    if (pList.length > 0 && sourceLabels[platformKey]) {
      const pCount = pList.length;
      const pPos = Math.round((pList.filter((p) => p.sentiment === "positive").length / pCount) * 100);
      const pNeu = Math.round((pList.filter((p) => p.sentiment === "neutral").length / pCount) * 100);
      const pNeg = Math.max(0, 100 - pPos - pNeu);
      sourceMoods.push({
        source: sourceLabels[platformKey],
        platform: platformKey as Platform,
        total: pCount,
        posPct: pPos,
        neuPct: pNeu,
        negPct: pNeg,
      });
    }
  }

  // Generate plain-English summary sentence
  let summarySentence = "";
  if (posPct >= 50) {
    summarySentence = `Predominantly positive (${posPct}%). Discussions celebrate ${posThemes.join(" and ")}.`;
  } else if (negPct >= 30) {
    summarySentence = `Elevated negative feedback (${negPct}%). Community mainly inquires about ${negThemes.join(" and ")}.`;
  } else if (neuPct >= 50) {
    summarySentence = `Mostly neutral queries (${neuPct}%). Inquirers seek details on ${neuThemes.join(" and ")}.`;
  } else {
    summarySentence = `Balanced community mood across ${total} records. Positive signals highlight ${posThemes[0]}.`;
  }

  const queryLabel = searchQuery && searchQuery.trim() ? `'${searchQuery.trim()}'` : "all active signals";
  const timeLabel = dateRange === "7d" ? "Last 7 days" : dateRange === "14d" ? "Last 14 days" : dateRange === "all" ? "All time" : "Last 30 days";
  const headerTitle = `Based on ${total} posts for ${queryLabel} (${timeLabel})`;

  return {
    totalAnalyzed: total,
    headerTitle,
    summarySentence,
    positive: {
      count: posPosts.length,
      percentage: posPct,
      themes: posThemes,
      examples: getExamples(posPosts),
    },
    neutral: {
      count: neuPosts.length,
      percentage: neuPct,
      themes: neuThemes,
      examples: getExamples(neuPosts),
    },
    negative: {
      count: negPosts.length,
      percentage: negPct,
      themes: negThemes,
      examples: getExamples(negPosts),
    },
    sourceMoods,
  };
}

// ============================================================================
// 5. ROUND-ROBIN PLATFORM INTERLEAVING
// ============================================================================

export function interleavePostsRoundRobin(posts: Post[]): Post[] {
  if (!posts || posts.length <= 1) return posts;

  // Group by platform
  const byPlatform: Record<string, Post[]> = {};
  for (const p of posts) {
    if (!byPlatform[p.platform]) {
      byPlatform[p.platform] = [];
    }
    byPlatform[p.platform].push(p);
  }

  const platforms = Object.keys(byPlatform);
  if (platforms.length <= 1) return posts;

  const result: Post[] = [];
  let addedInPass = true;
  let index = 0;

  while (addedInPass) {
    addedInPass = false;
    for (const plat of platforms) {
      const list = byPlatform[plat];
      if (index < list.length) {
        result.push(list[index]);
        addedInPass = true;
      }
    }
    index++;
  }

  return result;
}

// ============================================================================
// 6. SAFE FORMATTING HELPERS
// ============================================================================

export function formatCount(count?: number | string | null): string {
  if (count === null || count === undefined || count === "") return "0 mentions";
  if (typeof count === "string") {
    // If it already ends with mentions, clean it
    const cleaned = count.replace(/mentions/gi, "").trim();
    const num = parseInt(cleaned.replace(/,/g, ""), 10);
    return isNaN(num) ? "0 mentions" : `${num.toLocaleString()} mentions`;
  }
  return `${count.toLocaleString()} mentions`;
}

export function formatChange(change?: number | string | null): string | null {
  if (change === null || change === undefined || change === "" || change === "NaN" || Number.isNaN(change)) {
    return null;
  }
  if (typeof change === "string") {
    if (change === "New") return "New";
    const cleaned = change.replace(/%/g, "").trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return num >= 0 ? `+${num}%` : `${num}%`;
  }
  if (typeof change === "number") {
    if (isNaN(change)) return null;
    return change >= 0 ? `+${change}%` : `${change}%`;
  }
  return null;
}
