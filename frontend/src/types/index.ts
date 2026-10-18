// Expanded schema matching social listening sources, analytics, and Supabase integration

export type Platform =
  | "youtube"
  | "bluesky"
  | "gdelt"
  | "google_news"
  | "google_maps"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "google_play"
  | "csv_import"
  | "reddit"
  | "twitter"
  | "other";

export type Sentiment = "positive" | "neutral" | "negative";
export type Priority = "high" | "medium" | "low";

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface CommentItem {
  id: string;
  author_handle: string;
  content: string;
  posted_at: string;
  likes?: number;
  is_official?: boolean;
}

export interface Post {
  id: string;
  platform: Platform;
  author_handle: string;
  content: string;
  posted_at: string; // ISO date string
  likes?: number;
  comments?: number;
  shares?: number;
  rating?: number; // 1-5 for reviews (Google Maps, Google Play)
  topic: string;
  topic_id?: string;
  location?: string;
  sentiment: Sentiment;
  is_question: boolean;
  is_relevant?: boolean; // Relevant skilling & employability conversation
  url: string | null;
  is_sample: boolean;
  // Platform-specific media & contextual metadata
  media_url?: string | null;
  video_id?: string | null;
  place_name?: string | null;
  place_id?: string | null;
  article_title?: string | null;
  domain?: string | null;
  comment_list?: CommentItem[];
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
  platformCounts?: Partial<Record<Platform, number>>;
}

export interface Topic {
  id: string;
  name: string;
  post_count: number;
  growth_pct: number;
  is_new?: boolean; // Topic newly observed in current period
  prev_count?: number;
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
  representative_posts?: { text: string; author: string; platform: Platform }[];
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
  target_audience?: string;
  suggested_cta?: string;
  is_sample?: boolean;
  post_count?: number;
  evidence_posts?: any[];
  sample_questions?: string[];
}

export type CampaignTone = "friendly" | "professional" | "inspiring";
export type CampaignMetric = "shares" | "saves" | "comments" | "clicks";

export interface Campaign {
  opportunity_id: string;
  generated_at: string;
  content_ideas: { format: string; title: string; description: string; target_audience?: string }[];
  captions: { platform: Platform; text: string }[];
  key_messages: string[];
  call_to_action: string;
  success_metrics: { metric: CampaignMetric; target: string }[];
}

export interface Overview {
  is_sample: boolean;
  last_updated: string;
  updated_at?: string;
  total_posts: number;
  relevant_posts: number;
  questions_detected: number;
  sentiment_breakdown: SentimentBreakdown;
  emerging_topics_count: number;
  opportunities_count: number;
  top_topics: Topic[];
  emerging_topics: Topic[];
  top_questions: AudienceQuestion[];
  top_opportunities: Opportunity[];
  recent_posts: Post[];
  top_impact_cards?: {
    most_discussed: { topic: string; mentions_7d: number; growth_pct: number; hubs_reporting: string };
    fastest_growing: { topic: string; new_questions: number; growth_pct: number; subtitle: string };
    needs_attention: { topic: string; subtitle: string; decline_pct: number; action: string };
  };
  learner_voices?: Array<{
    quote: string;
    author: string;
    source: string;
    topic: string;
    url: string;
    likes: number;
    published_at: string;
  }>;
  telemetry_curve?: Array<{
    date: string;
    count: number;
  }>;
  last_successful_refresh?: string;
  last_refresh_attempt?: {
    timestamp: string;
    status: string;
    trigger?: string;
    error?: string;
    new_posts?: number;
  };
}

export interface OfficialImpactMetric {
  id: string;
  name: string;
  value: number;
  display_value: string;
  unit: string;
  definition: string;
  reporting_period: string;
  is_cumulative: boolean;
  source_url: string;
  verified_date: string;
  highlight?: boolean;
}

export interface OfficialImpactResponse {
  organization: string;
  official_website: string;
  impact_page: string;
  what_we_do_page: string;
  last_retrieved: string;
  status: string;
  notice: string;
  cumulative_metrics: OfficialImpactMetric[];
  annual_outcomes: OfficialImpactMetric[];
}

export interface AppSettings {
  account: {
    display_name: string;
    email: string;
    organization: string;
    role: string;
    avatar_initials: string;
    session_status: string;
    auth_configured: boolean;
    auth_note: string;
  };
  appearance: {
    theme: string;
    density: string;
  };
  data_collection: {
    refresh_interval_minutes: number;
    auto_sync_enabled: boolean;
    monitored_topics: string[];
    keywords: string[];
    sentiment_threshold: number;
  };
  ai_analysis: {
    model_name: string;
    default_tone: string;
    default_language: string;
    strict_factual_grounding: boolean;
    zero_hallucination_mode: boolean;
    api_configured: boolean;
  };
}

export interface AudienceResponse {
  questions: AudienceQuestion[];
  sentiment_breakdown: SentimentBreakdown;
  engagement: EngagementPattern;
}

export interface PostsResponse {
  items: Post[];
  total: number;
  page: number;
  page_size: number;
}

export interface PostsQuery {
  query?: string;
  platform?: Platform;
  sentiment?: Sentiment;
  topic?: string;
  topic_id?: string;
  is_question?: boolean;
  is_relevant?: boolean;
  date_range?: "7d" | "14d" | "30d" | "90d" | "all";
  ids?: string[];
  sort?: "recent" | "engagement" | "rating";
  mix_sources?: boolean;
  page?: number;
  page_size?: number;
}

export interface GenerateCampaignRequest {
  opportunity_id: string;
  tone?: CampaignTone;
  platform?: Platform;
}

export interface ApiSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  youtubeApiKey: string;
  blueskyHandle: string;
  blueskyPassword: string;
  useLiveSupabase: boolean;
  // Platform developer credentials
  instagramAccessToken?: string;
  facebookPageAccessToken?: string;
  linkedInClientId?: string;
  linkedInClientSecret?: string;
  googleMapsApiKey?: string;
}

export interface GdeltTimelinePoint {
  date: string;
  count: number;
}

export interface GdeltNewsResponse {
  articles: Post[];
  total_retrieved: number;
  hits_estimate: number;
  tone_distribution: { positive: number; neutral: number; negative: number };
  timeline: GdeltTimelinePoint[];
  top_domains: { domain: string; count: number }[];
  top_topics: { topic: string; count: number }[];
  query: string;
  timespan: string;
  is_rate_limited?: boolean;
  notice?: string;
  source: "gdelt";
}

export interface StudioEvidencePack {
  topic: string;
  is_off_topic: boolean;
  has_live_data: boolean;
  post_count: number;
  snapshot: {
    mentions_7d: number;
    mentions_prev_7d: number;
    change_pct: number | null;
    is_new: boolean;
    status: "Growing" | "Steady" | "Cooling";
    updated_at: string;
  } | null;
  what_people_are_saying: {
    positive: number;
    neutral: number;
    negative: number;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
    top_themes: string[];
  } | null;
  questions: Array<{
    id: string;
    text: string;
    source: string;
    author: string;
    url: string;
    published_at: string;
  }>;
  matching_programme: {
    name: string;
    description: string;
    url: string;
  } | null;
  best_time_to_post: {
    windows: string[];
    sentence: string;
  } | null;
  top_posts: Array<{
    title: string;
    url: string;
    source: string;
    author: string;
    likes: number;
  }>;
  evidence_context_for_ai: any;
}

export interface StudioSuggestionsResponse {
  taxonomy_topics: string[];
  strive_programmes: Array<{
    name: string;
    category: string;
    source: string;
  }>;
}

export interface OfflineCentre {
  id: string;
  name: string;
  short_name: string;
  city: string;
  state: string;
  zone: string;
  type: "Flagship TSSDC" | "Domain TSEC";
  address: string;
  key_domains: string[];
  specialized_labs: string[];
  corporate_partners: string[];
  annual_capacity: number;
  placement_rate: string;
  contact_email: string;
  primary_topic: string;
  description: string;
}

export interface OutreachInitiative {
  id: string;
  title: string;
  description: string;
  target_cohort: string;
  tag: string;
  icon: string;
  topic: string;
  centre_name: string;
  centre_location: string;
  action_cta: string;
}

export interface CategorizedFaq {
  id: string;
  topic: string;
  topic_id?: string;
  count: number;
  sample_question: string;
  suggested_reply: string;
  reply_label?: string;
  centre_connection?: string;
}

export interface RealAudienceResponse {
  status: string;
  is_sample: boolean;
  learner_questions_digest: {
    total_questions: number;
    sources_used: string[];
    period: string;
  };
  offline_centres: OfflineCentre[];
  outreach_initiatives: OutreachInitiative[];
  categorized_faqs: CategorizedFaq[];
  best_time_to_post: Array<{
    hour: string;
    label: string;
    score: number;
    peak: boolean;
  }>;
  updated_at: string;
}



