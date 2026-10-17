export interface TrendTopicOverview {
  topic: string;
  current_weekly_mentions: number;
  prev_weekly_mentions: number;
  growth_pct: number;
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
  latest_date: string;
  data_points_count: number;
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

export const trendsApi = {
  async getOverview(): Promise<{ topics: TrendTopicOverview[] }> {
    const res = await fetch("/api/trends/overview");
    if (!res.ok) throw new Error("Failed to load trends overview");
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
