export interface ProofItem {
  id: string;
  title: string;
  source: string;
  author: string;
  published_at: string;
  url: string;
}

export interface TopCardData {
  topic: string;
  topic_slug: string;
  mentions: number;
  growth_pct: number;
  is_new?: boolean;
  status_chip: "Growing" | "Cooling" | "Steady";
  calculation_popover: string;
  proof_items: ProofItem[];
  programmes: string[];
}

export interface BiggestRiseCardData {
  has_leader: boolean;
  topic?: string | null;
  topic_slug?: string;
  forecast_growth_pct?: number;
  status_chip?: "Growing" | "Cooling" | "Steady";
  calculation_popover?: string;
  proof_items?: ProofItem[];
  programmes?: string[];
  status?: string;
  notes?: string;
}

export interface CardNarration {
  insight?: string;
  why_it_matters?: string;
  matching_programme?: string;
}

export interface EmergingSkill {
  id: string;
  skill: string;
  topic: string;
  category: string;
  demand_status: "Surging" | "High Demand" | "Rising Fast" | "Critical Need";
  growth: string;
  post_count: number;
  matching_programme: string;
  practical_application: string;
  evidence_quote: string;
  evidence_author: string;
  evidence_url?: string;
  source: string;
  is_real?: boolean;
}

export interface TrendsOverviewResponse {
  status: string;
  total_topics: number;
  topics: TrendTopicOverview[];
  top_cards: {
    most_discussed: TopCardData | null;
    fastest_growing: TopCardData | null;
    biggest_rise: BiggestRiseCardData | null;
  };
  narration?: {
    page_summary?: string;
    most_discussed?: CardNarration;
    fastest_growing?: CardNarration;
    biggest_rise?: CardNarration;
  };
  page_summary?: string;
  sources_summary?: {
    healthy_count: number;
    total_sources: number;
    warning_text: string;
    failed_sources: string[];
    sources: Record<string, any>;
  };
  is_sample_fallback?: boolean;
  total_real_posts?: number;
  taxonomy: string[];
  emerging_skills?: EmergingSkill[];
}

export function formatCount(count: number | null | undefined): string {
  if (count === null || count === undefined || isNaN(count)) return "—";
  return count.toLocaleString();
}

export function formatChange(changePct: number | null | undefined, isNew?: boolean): string {
  if (isNew) return "New";
  if (changePct === null || changePct === undefined || isNaN(changePct)) return "—";
  return changePct > 0 ? `+${changePct}%` : `${changePct}%`;
}

export interface TrendTopicOverview {
  topic: string;
  topic_slug?: string;
  current_weekly_mentions: number;
  prev_weekly_mentions: number;
  growth_pct: number;
  is_new?: boolean;
  status_chip?: "Growing" | "Cooling" | "Steady";
  momentum: "rising" | "stable" | "declining";
  total_engagement: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  source_breakdown: {
    youtube: number;
    gdelt: number;
  };
  proof_items?: ProofItem[];
  matching_programmes?: string[];
  sparkline?: number[];
  latest_date: string;
  data_points_count: number;
  real_days_count?: number;
}


export interface ForecastPoint {
  date: string;
  predicted: number;
  lower_80: number;
  upper_80: number;
  lower_95: number;
  upper_95: number;
}

export interface HistoricalPoint {
  date: string;
  actual: number;
}

export interface TrendForecastResult {
  topic: string;
  target_metric: string;
  horizon_days: number;
  model_name: string;
  model_version: string;
  training_cutoff_date: string;
  forecast_generated_at: string;
  evaluation: {
    mae: number;
    rmse: number;
    smape_pct: number;
    baseline_mae: number;
    relative_improvement_pct: number;
  };
  status: "trained" | "sparse_data" | "insufficient_history";
  notes: string;
  historical_points: HistoricalPoint[];
  forecast_points: ForecastPoint[];
}

export interface SourceHealthItem {
  source: string;
  status: "online" | "degraded" | "limited_access" | "offline";
  last_sync: string;
  records_collected: number;
  quota_info?: string;
  note: string;
}

export interface TrendsHealthResponse {
  status: string;
  sources: Record<string, SourceHealthItem>;
  scheduler: {
    scheduler_running: boolean;
    timezone: string;
    last_run?: string;
    last_status?: string;
    scheduled_time: string;
  };
}

export interface SupportingRecord {
  id: string;
  title: string;
  source: string;
  author?: string;
  published_at: string;
  engagement: number;
  url: string;
  sentiment: "positive" | "neutral" | "negative";
  record_type?: string;
  excerpt?: string;
}

export interface SampleExcerpt {
  text: string;
  author?: string;
  sentiment: "positive" | "neutral" | "negative";
  source: string;
  url?: string;
}

export interface TopicDetailResponse {
  status: string;
  topic: string;
  slug: string;
  category: string;
  description: string;
  overview: {
    current_weekly_mentions: number;
    prev_weekly_mentions: number;
    growth_pct: number | null;
    momentum: "rising" | "stable" | "declining" | "building_history";
    total_engagement: number;
    data_freshness: string;
    source_coverage: string;
    latest_date: string;
    data_points_count: number;
  };
  historical_series: Array<{
    date: string;
    mentions: number;
    youtube_count: number;
    gdelt_count: number;
    engagement: number;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  source_breakdown: {
    youtube: {
      count: number;
      percentage: number;
      description: string;
    };
    gdelt: {
      count: number;
      percentage: number;
      description: string;
    };
  };
  sentiment: {
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
    total_records_analyzed: number;
    period_covered: string;
    model_name: string;
    model_limitations: string;
    sample_excerpts: SampleExcerpt[];
  };
  forecast?: TrendForecastResult;
  supporting_records: SupportingRecord[];
  strategic_context: {
    evidence_summary: string;
    strive_importance: string;
    uncertainties: string;
    recommended_next_steps: string;
  };
}

export const TOPIC_SLUG_MAP: Record<string, string> = {
  "ai-and-digital-skills": "AI and digital skills",
  "vocational-training": "Vocational training",
  "employability-and-job-readiness": "Employability and job readiness",
  "internships-and-placements": "Internships and placements",
  "entrepreneurship": "Entrepreneurship",
  "youth-education": "Youth education",
  "employer-skill-requirements": "Employer skill requirements",
};

export function topicToSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/\//g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export function slugToTopic(slugOrName: string): string {
  const slug = topicToSlug(slugOrName);
  return TOPIC_SLUG_MAP[slug] || slugOrName;
}

export const trendsApi = {
  async getOverview(): Promise<TrendsOverviewResponse> {
    const res = await fetch("/api/trends/overview");
    if (!res.ok) throw new Error("Failed to load trends overview");
    return await res.json();
  },


  async getDetail(
    topic: string,
    days: number = 30,
    horizon: number = 30
  ): Promise<TopicDetailResponse> {
    const res = await fetch(
      `/api/trends/detail?topic=${encodeURIComponent(topic)}&days=${days}&horizon=${horizon}`
    );
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Topic '${topic}' not found`);
      }
      throw new Error("Failed to load topic details");
    }
    return await res.json();
  },

  async getForecast(
    topic: string,
    horizon: number = 30,
    model: string = "best"
  ): Promise<TrendForecastResult> {
    const res = await fetch(
      `/api/trends/forecast?topic=${encodeURIComponent(
        topic
      )}&horizon=${horizon}&model=${model}`
    );
    if (!res.ok) throw new Error("Failed to load topic forecast");
    return await res.json();
  },

  async getHealth(): Promise<TrendsHealthResponse> {
    const res = await fetch("/api/trends/health");
    if (!res.ok) throw new Error("Failed to load pipeline health");
    return await res.json();
  },

  async triggerRefresh(): Promise<any> {
    const res = await fetch("/api/trends/refresh", {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Refresh request failed");
    }
    return await res.json();
  },
};
