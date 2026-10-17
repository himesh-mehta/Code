// Mirrors docs/data-schema.md. Change both together, by agreement.

export type Platform =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "youtube"
  | "reddit"
  | "facebook"
  | "other";

export type Sentiment = "positive" | "neutral" | "negative";
export type Priority = "high" | "medium" | "low";

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface Post {
  id: string;
  platform: Platform;
  author_handle: string;
  content: string;
  posted_at: string;
  likes: number;
  comments: number;
  shares: number;
  topic: string;
  sentiment: Sentiment;
  is_question: boolean;
  url: string | null;
  is_sample: boolean;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface Topic {
  id: string;
  name: string;
  post_count: number;
  growth_pct: number;
  sentiment_breakdown: SentimentBreakdown;
  top_keywords: string[];
  trend_series: TrendPoint[];
  supporting_post_ids: string[];
}

export interface AudienceQuestion {
  id: string;
  text: string;
  count: number;
  topic: string;
  supporting_post_ids: string[];
}

export interface EngagementPattern {
  by_platform: { platform: Platform; posts: number; avg_engagement: number }[];
  by_hour: { hour: number; avg_engagement: number }[];
}

export interface ScoreBreakdown {
  volume: number;
  growth: number;
  relevance: number;
  engagement: number;
  sentiment_gap: number;
}

export interface Opportunity {
  id: string;
  title: string;
  topic: string;
  summary: string;
  why_it_matters: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  score_weights: Record<keyof ScoreBreakdown, number>;
  priority: Priority;
  supporting_post_ids: string[];
  recommended_action: string;
  platforms: Platform[];
}

export type CampaignTone = "friendly" | "professional" | "inspiring";
export type CampaignMetric = "shares" | "saves" | "comments" | "clicks";

export interface Campaign {
  opportunity_id: string;
  generated_at: string;
  content_ideas: { format: string; title: string; description: string }[];
  captions: { platform: Platform; text: string }[];
  key_messages: string[];
  call_to_action: string;
  success_metrics: { metric: CampaignMetric; target: string }[];
}

export interface Overview {
  is_sample: boolean;
  last_updated: string;
  total_posts: number;
  sentiment_breakdown: SentimentBreakdown;
  top_topics: Topic[];
  top_questions: AudienceQuestion[];
  top_opportunities: Opportunity[];
}

export interface PostsResponse {
  items: Post[];
  total: number;
  page: number;
  page_size: number;
}

export interface AudienceResponse {
  questions: AudienceQuestion[];
  sentiment_breakdown: SentimentBreakdown;
  engagement: EngagementPattern;
}

export interface PostsQuery {
  query?: string;
  platform?: Platform;
  sentiment?: Sentiment;
  topic?: string;
  is_question?: boolean;
  ids?: string[];
  sort?: "recent" | "engagement";
  page?: number;
  page_size?: number;
}

export interface GenerateCampaignRequest {
  opportunity_id: string;
  tone?: CampaignTone;
  platform?: Platform;
}

export interface ApiError {
  error: { code: string; message: string };
}
