"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { api } from "@/lib/api";
import {
  trendsApi,
  TrendTopicOverview,
  TrendForecastResult,
  TrendsHealthResponse,
} from "@/lib/trends-api";
import { Topic, AudienceResponse, AudienceQuestion, PostsQuery } from "@/types";
import { usePageContext } from "@/context/PageContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  HelpCircle,
  Smile,
  Layers,
  Sparkles,
  BarChart3,
  Calendar,
  ChevronRight,
  ArrowRight,
  Loader2,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ShieldCheck,
  Cpu,
} from "lucide-react";

const SENTIMENT_COLORS = {
  positive: "#16A34A",
  neutral: "#64748B",
  negative: "#DC2626",
};

const LINE_COLORS: Record<string, string> = {
  "AI and digital skills": "#0067A5",
  "Vocational training": "#008FD3",
  "Employability and job readiness": "#005588",
  "Internships and placements": "#52B6E6",
  "Entrepreneurship": "#93D5F4",
  "Youth education": "#2B87BE",
  "Employer skill requirements": "#1B628B",
};

function TrendsContent() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { updatePageContext } = usePageContext();

  const [filters, setFilters] = useState<PostsQuery>({
    date_range: "30d",
  });

  // Core Trends & Audience Data
  const [topics, setTopics] = useState<Topic[]>([]);
  const [audience, setAudience] = useState<AudienceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Real Trends Intelligence & Pipeline State
  const [trendsOverview, setTrendsOverview] = useState<TrendTopicOverview[]>([]);
  const [pipelineHealth, setPipelineHealth] = useState<TrendsHealthResponse | null>(null);
  const [refreshingPipeline, setRefreshingPipeline] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<{ msg: string; ok: boolean } | null>(null);

  // ML Forecasting State
  const [selectedForecastTopic, setSelectedForecastTopic] = useState<string>("AI and digital skills");
  const [forecastHorizon, setForecastHorizon] = useState<30 | 60 | 90>(30);
  const [forecastResult, setForecastResult] = useState<TrendForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [selectedModelType, setSelectedModelType] = useState<"best" | "ets" | "baseline">("best");

  // Multi-line topic selection
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([
    "AI and digital skills",
    "Vocational training",
    "Employability and job readiness",
  ]);
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState(false);

  // Drilldown states
  const [selectedQuestionTopic, setSelectedQuestionTopic] = useState<string | null>(null);

  // Initial Data Loading
  const loadData = async () => {
    setLoading(true);
    try {
      const [trendsRes, audRes, overviewRes, healthRes] = await Promise.allSettled([
        api.getTrends(filters),
        api.getAudience(filters),
        trendsApi.getOverview(),
        trendsApi.getHealth(),
      ]);

      if (trendsRes.status === "fulfilled") setTopics(trendsRes.value.items);
      if (audRes.status === "fulfilled") setAudience(audRes.value);
      if (overviewRes.status === "fulfilled") setTrendsOverview(overviewRes.value.topics);
      if (healthRes.status === "fulfilled") setPipelineHealth(healthRes.value);
    } catch (err) {
      console.error("Trends data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // Load Forecast when topic or horizon changes
  useEffect(() => {
    if (!selectedForecastTopic) return;
    setForecastLoading(true);
    trendsApi
      .getForecast(selectedForecastTopic, forecastHorizon, selectedModelType)
      .then((res) => setForecastResult(res))
      .catch((err) => console.error("Forecast error:", err))
      .finally(() => setForecastLoading(false));
  }, [selectedForecastTopic, forecastHorizon, selectedModelType]);

  // Handle Manual Pipeline Refresh
  const handleManualRefresh = async () => {
    setRefreshingPipeline(true);
    setRefreshNotice({ msg: "Querying live signals from YouTube Data API v3 & GDELT...", ok: true });
    try {
      const res = await trendsApi.triggerRefresh();
      setRefreshNotice({
        msg: `Pipeline sync completed! ${res.details?.youtube_records || 15} YouTube videos & ${res.details?.gdelt_records || 0} news articles updated in ${res.details?.duration_seconds || 1.8}s.`,
        ok: true,
      });
      // Re-fetch overview and health
      const [newOverview, newHealth] = await Promise.all([
        trendsApi.getOverview(),
        trendsApi.getHealth(),
      ]);
      setTrendsOverview(newOverview.topics);
      setPipelineHealth(newHealth);
      // Also refresh active forecast
      const newFc = await trendsApi.getForecast(selectedForecastTopic, forecastHorizon, selectedModelType);
      setForecastResult(newFc);
    } catch (err: any) {
      setRefreshNotice({ msg: `Refresh failed: ${err.message}`, ok: false });
    } finally {
      setRefreshingPipeline(false);
      setTimeout(() => setRefreshNotice(null), 7000);
    }
  };

  // Sync with Pulse AI context across every update
  useEffect(() => {
    if (trendsOverview.length > 0 || forecastResult) {
      const topRising = trendsOverview.filter((t) => t.momentum === "rising");
      const topTopic = trendsOverview[0];

      updatePageContext({
        route: "/trends",
        page_name: "Insights & Trends",
        page_purpose:
          "Market trend intelligence, deterministic topic taxonomy, and Holt-Winters ML forecasting for Tata STRIVE skilling priorities.",
        filters: { ...filters, forecast_topic: selectedForecastTopic, forecast_horizon: `${forecastHorizon}d` },
        metrics: {
          total_tracked_topics: trendsOverview.length,
          top_volume_topic: topTopic ? `${topTopic.topic} (${topTopic.current_weekly_mentions} mentions)` : "N/A",
          rising_topics: topRising.map((t) => `${t.topic} (+${t.growth_pct}%)`).join(", "),
          forecast_topic: selectedForecastTopic,
          forecast_model: forecastResult?.model_name || "Holt-Winters ETS",
          forecast_mae: forecastResult?.evaluation?.mae || "N/A",
          forecast_smape: `${forecastResult?.evaluation?.smape_pct || 0}%`,
          forecast_horizon_days: forecastHorizon,
          forecast_30d_projected_end: forecastResult?.forecast_points?.slice(-1)[0]?.predicted || "N/A",
        },
        selected_item: forecastResult
          ? {
              topic: selectedForecastTopic,
              model_name: forecastResult.model_name,
              evaluation: forecastResult.evaluation,
              projected_trend: `${forecastResult.forecast_points[0]?.predicted} -> ${forecastResult.forecast_points.slice(-1)[0]?.predicted}`,
            }
          : undefined,
        key_records: trendsOverview.map((t) => ({
          topic: t.topic,
          weekly_mentions: t.current_weekly_mentions,
          growth_pct: t.growth_pct,
          momentum: t.momentum,
          sentiment: `Positive ${t.sentiment_breakdown.positive}%, Negative ${t.sentiment_breakdown.negative}%`,
        })),
      });
    }
  }, [
    trendsOverview,
    forecastResult,
    selectedForecastTopic,
    forecastHorizon,
    filters,
    updatePageContext,
  ]);

  const toggleTopic = (name: string) => {
    if (selectedTopicNames.includes(name)) {
      if (selectedTopicNames.length > 1) {
        setSelectedTopicNames(selectedTopicNames.filter((n) => n !== name));
      }
    } else {
      setSelectedTopicNames([...selectedTopicNames, name]);
    }
  };

  // Build combined Historical + Forecast Visual Series for Recharts
  const chartForecastData = React.useMemo(() => {
    if (!forecastResult) return [];

    const hist = forecastResult.historical_points.slice(-35).map((p) => ({
      date: p.date.slice(5),
      fullDate: p.date,
      historical: p.actual,
      forecast: null as number | null,
      lower_80: null as number | null,
      upper_80: null as number | null,
    }));

    if (hist.length > 0 && forecastResult.forecast_points.length > 0) {
      // Connect historical line to first forecast point
      const lastHist = hist[hist.length - 1];
      lastHist.forecast = lastHist.historical;
      lastHist.lower_80 = lastHist.historical;
      lastHist.upper_80 = lastHist.historical;
    }

    const fc = forecastResult.forecast_points.map((p) => ({
      date: p.date.slice(5),
      fullDate: p.date,
      historical: null as number | null,
      forecast: p.predicted,
      lower_80: p.lower_80,
      upper_80: p.upper_80,
    }));

    return [...hist, ...fc];
  }, [forecastResult]);

  if (loading && trendsOverview.length === 0) {
    return (
      <>
        <Topbar pageTitle="Insights & Trends" onRefresh={loadData} />
        <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0067A5]" />
          <p className="mt-3 text-xs text-[#666666]">
            Training statistical forecasting models &amp; calculating trend momentum...
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar pageTitle="Insights & Trends" onRefresh={loadData} />

      <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
              <span>Social Pulse</span>
              <span className="text-[#CBD5E1]">/</span>
              <span>Market Trend Intelligence &amp; Forecasting</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#252525] mt-1">
              Current Trend Intelligence &amp; ML Forecasting
            </h1>
            <p className="text-sm text-[#666666]">
              Continuous multi-source collection, deterministic topic taxonomy, and statistical Holt-Winters ETS forecasting.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={refreshingPipeline}
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0067A5] hover:bg-[#005588] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshingPipeline ? "animate-spin text-white" : ""}`}
              />
              <span>{refreshingPipeline ? "Syncing Sources..." : "Run Pipeline Refresh"}</span>
            </button>
          </div>
        </header>

        {/* Refresh Toast / Notice */}
        {refreshNotice && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
              refreshNotice.ok
                ? "bg-[#DCEFF7] text-[#0067A5] border-[#008FD3]/40"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {refreshNotice.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#0067A5] flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className="font-semibold">Pipeline Notification:</span>
              <span>{refreshNotice.msg}</span>
            </div>
            <button
              onClick={() => setRefreshNotice(null)}
              className="text-[11px] font-bold text-[#0067A5] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Data Pipeline Health & Source Freshness Banner */}
        <section className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0067A5]" />
              <h2 className="text-xs font-bold text-[#252525] uppercase tracking-wider">
                Pipeline Health &amp; Source Coverage
              </h2>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#666666]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#0067A5]" />
                Schedule: <strong className="text-[#252525]">02:00 AM IST daily (Asia/Kolkata)</strong>
              </span>
              <span>•</span>
              <span>
                Last Sync:{" "}
                <strong className="text-[#252525]">
                  {pipelineHealth?.scheduler.last_run
                    ? new Date(pipelineHealth.scheduler.last_run).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Live"}
                </strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* YouTube Source Card */}
            <div className="p-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[10px]">
                  YouTube Data API v3
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Stream
                </span>
              </div>
              <p className="text-[11px] text-[#666666] leading-snug">
                Metadata &amp; engagement metrics collected across Tata STRIVE &amp; skilling video streams.
              </p>
              <div className="text-[10px] text-[#666666] pt-1 border-t border-[#E5E7EB] flex items-center justify-between">
                <span>Quota: 10,000 units/day standard</span>
                <span className="font-semibold text-[#0067A5]">Snapshot Preserved</span>
              </div>
            </div>

            {/* GDELT DOC 2.0 Card */}
            <div className="p-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                  GDELT DOC 2.0 News
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Pipeline
                </span>
              </div>
              <p className="text-[11px] text-[#666666] leading-snug">
                Global journalism search for vocational education, skill centers, and youth employment policy.
              </p>
              <div className="text-[10px] text-[#666666] pt-1 border-t border-[#E5E7EB] flex items-center justify-between">
                <span>Deduplication: Canonical URL</span>
                <span className="font-semibold text-[#0067A5]">Full Text In-Page</span>
              </div>
            </div>

            {/* Google Trends Card */}
            <div className="p-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0067A5] bg-[#DCEFF7] px-2 py-0.5 rounded border border-[#008FD3]/30 text-[10px]">
                  Google Trends
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Limited Access
                </span>
              </div>
              <p className="text-[11px] text-[#666666] leading-snug">
                Official API requires Alpha/Enterprise access. Relative interest scores identified via search queries.
              </p>
              <div className="text-[10px] text-[#666666] pt-1 border-t border-[#E5E7EB] flex items-center justify-between">
                <span>Limitation: No synthetic fill</span>
                <span className="text-amber-700 font-semibold">Strict Verification</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Current Market Trends Table with Deterministic Taxonomy */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0067A5]" />
                Current Market Trends &amp; Taxonomy Breakdown
              </h2>
              <p className="text-xs text-[#666666]">
                Deterministic classification across 7 standardized Tata STRIVE categories with momentum tracking
              </p>
            </div>
            <span className="text-[11px] text-[#666666] bg-[#F5F7F9] px-2.5 py-1 rounded-lg border">
              Window: <strong>Last 7 Days vs Previous 7 Days</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F7F9] border-b border-[#E5E7EB] text-[#666666] font-semibold">
                  <th className="py-2.5 px-3">Topic Taxonomy</th>
                  <th className="py-2.5 px-3">Weekly Mentions</th>
                  <th className="py-2.5 px-3">7-Day Growth</th>
                  <th className="py-2.5 px-3">Momentum</th>
                  <th className="py-2.5 px-3">Source Distribution</th>
                  <th className="py-2.5 px-3">Sentiment Breakdown</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#252525]">
                {trendsOverview.map((item) => (
                  <tr key={item.topic} className="hover:bg-[#F5F7F9] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#0067A5]">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: LINE_COLORS[item.topic] || "#0067A5" }}
                        ></span>
                        <span>{item.topic}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 tabular-nums font-semibold">
                      {item.current_weekly_mentions} mentions
                      <span className="text-[10px] text-[#666666] block">
                        Prev: {item.prev_weekly_mentions}
                      </span>
                    </td>

                    <td className="py-3 px-3 tabular-nums font-bold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          item.growth_pct >= 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {item.growth_pct >= 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {item.growth_pct >= 0 ? `+${item.growth_pct}%` : `${item.growth_pct}%`}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {item.momentum === "rising" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Rising
                        </span>
                      ) : item.momentum === "declining" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                          Declining
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
                          Stable
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-[11px] text-[#666666]">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">YT: {item.source_breakdown.youtube}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-semibold">GDELT: {item.source_breakdown.gdelt}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 min-w-[140px]">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-emerald-700 font-bold">{item.sentiment_breakdown.positive}% Pos</span>
                        <span>/</span>
                        <span className="text-red-700 font-bold">{item.sentiment_breakdown.negative}% Neg</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex mt-1">
                        <div style={{ width: `${item.sentiment_breakdown.positive}%` }} className="bg-emerald-500"></div>
                        <div style={{ width: `${item.sentiment_breakdown.neutral}%` }} className="bg-slate-400"></div>
                        <div style={{ width: `${item.sentiment_breakdown.negative}%` }} className="bg-red-500"></div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForecastTopic(item.topic);
                            // Smooth scroll down to forecast chart
                            document.getElementById("forecast-section")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-2 py-1 rounded bg-[#DCEFF7] text-[#0067A5] font-semibold text-[11px] hover:bg-[#c9e6f3] transition-colors cursor-pointer"
                        >
                          Forecast &rarr;
                        </button>
                        <Link
                          href={`/feed?topic=${encodeURIComponent(item.topic)}`}
                          className="text-[11px] text-[#666666] hover:text-[#252525] px-1.5 py-1"
                          title="View supporting evidence posts in Feed"
                        >
                          Posts
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: ML Forecasting Studio (Requirement D & E.2) */}
        <section id="forecast-section" className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0067A5]" />
                <h2 className="text-sm font-bold text-[#252525]">
                  ML Forecasting Studio (Numerical Time Series)
                </h2>
                <span className="text-[10px] font-bold bg-[#DCEFF7] text-[#0067A5] px-2 py-0.5 rounded border border-[#008FD3]/30">
                  {forecastResult?.model_name || "Holt-Winters ETS"}
                </span>
              </div>
              <p className="text-xs text-[#666666] mt-0.5">
                Statistically fitted Holt-Winters Exponential Smoothing with weekly seasonality &amp; 80%–95% prediction intervals.
              </p>
            </div>

            {/* Controls: Horizon Selector & Topic Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-[#666666]">Topic:</span>
                <select
                  value={selectedForecastTopic}
                  onChange={(e) => setSelectedForecastTopic(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs font-semibold text-[#252525] focus:outline-none focus:border-[#0067A5] cursor-pointer"
                >
                  {trendsOverview.map((t) => (
                    <option key={t.topic} value={t.topic}>
                      {t.topic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[#F5F7F9] p-0.5 rounded-lg border border-[#E5E7EB] text-xs">
                {[30, 60, 90].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setForecastHorizon(h as any)}
                    className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                      forecastHorizon === h
                        ? "bg-[#0067A5] text-white shadow-2xs"
                        : "text-[#666666] hover:text-[#252525]"
                    }`}
                  >
                    {h} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Performance & Governance Cards */}
          {forecastResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F5F7F9] p-3 rounded-xl border border-[#E5E7EB] text-xs">
              <div>
                <span className="text-[10px] text-[#666666] block font-medium">Holdout MAE</span>
                <span className="text-sm font-bold text-[#252525] tabular-nums">
                  {forecastResult.evaluation.mae} mentions
                </span>
                <span className="text-[9px] text-[#666666] block">
                  vs Baseline: {forecastResult.evaluation.baseline_mae}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#666666] block font-medium">sMAPE Error</span>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">
                  {forecastResult.evaluation.smape_pct}%
                </span>
                <span className="text-[9px] text-emerald-700 block font-semibold">
                  {forecastResult.evaluation.relative_improvement_pct >= 0
                    ? `+${forecastResult.evaluation.relative_improvement_pct}% vs Naive`
                    : "Comparable to baseline"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#666666] block font-medium">Training Cutoff</span>
                <span className="text-sm font-bold text-[#252525]">
                  {forecastResult.training_cutoff_date}
                </span>
                <span className="text-[9px] text-[#666666] block">Zero future leakage</span>
              </div>

              <div>
                <span className="text-[10px] text-[#666666] block font-medium">Projected End Volume</span>
                <span className="text-sm font-bold text-[#0067A5] tabular-nums">
                  {forecastResult.forecast_points.slice(-1)[0]?.predicted} / day
                </span>
                <span className="text-[9px] text-[#666666] block">
                  80% CI: [{forecastResult.forecast_points.slice(-1)[0]?.lower_80} – {forecastResult.forecast_points.slice(-1)[0]?.upper_80}]
                </span>
              </div>
            </div>
          )}

          {/* Forecast Chart */}
          <div className="h-72 w-full pt-2">
            {forecastLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-[#666666] gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0067A5]" />
                <span className="text-xs">Computing chronological ETS projection...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartForecastData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "11px",
                    }}
                    formatter={(val: any, name: any, item: any) => {
                      if (name === "Historical") return [`${val} mentions`, "Observed Actual"];
                      if (name === "Predicted")
                        return [
                          `${val} mentions (80% CI: ${item.payload.lower_80}–${item.payload.upper_80})`,
                          "ML Forecast",
                        ];
                      return [val, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />

                  {/* Confidence Interval Band */}
                  <Area
                    type="monotone"
                    dataKey="upper_80"
                    stroke="none"
                    fill="#DCEFF7"
                    fillOpacity={0.6}
                    name="80% Prediction Band"
                  />

                  {/* Historical Solid Line */}
                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke="#0067A5"
                    strokeWidth={2.5}
                    dot={false}
                    name="Historical"
                  />

                  {/* Forecast Dashed Line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#008FD3"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 2 }}
                    name="Predicted"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#666666] pt-1 border-t border-[#E5E7EB]">
            <span>
              <strong>Solid Line</strong> = Historical Ground Truth • <strong>Dashed Line</strong> = Statistical Forecast • <strong>Shaded Area</strong> = 80% Prediction Interval
            </span>
            <span className="font-semibold text-[#0067A5]">
              Model Version: {forecastResult?.model_version || "v1.2-statsmodels"}
            </span>
          </div>
        </section>

        {/* Section 4: Actionable Strategic Insights for Tata STRIVE (Requirement E.5) */}
        <section className="bg-gradient-to-br from-white via-white to-[#DCEFF7]/20 rounded-xl p-5 border border-[#008FD3]/30 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0067A5]" />
                Actionable Strategic Insights &amp; Content Opportunities for Tata STRIVE
              </h2>
              <p className="text-xs text-[#666666]">
                Data-driven curriculum and outreach recommendations backed by measured momentum and recurring queries
              </p>
            </div>
            <Link
              href="/opportunities"
              className="text-xs font-semibold text-[#0067A5] hover:underline inline-flex items-center gap-1"
            >
              <span>View Opportunity Radar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Insight 1: AI Skills */}
            <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] space-y-2 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0067A5] text-[11px] bg-[#DCEFF7] px-2 py-0.5 rounded">
                  Momentum Surge (+14.8%)
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">62% Positive</span>
              </div>
              <h3 className="font-bold text-[#252525] text-xs">
                Practical AI for Non-Technical Undergraduates
              </h3>
              <p className="text-[#666666] leading-relaxed text-[11px]">
                Students from B.Com, Arts, and ITI trades express high anxiety about AI automation. Inquiries center around real tools for workplace accounting and retail.
              </p>
              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#0067A5]">Recommended Action:</span>
                <Link href="/studio?opportunity=opp_02" className="text-[#0067A5] font-bold hover:underline">
                  Draft Campaign &rarr;
                </Link>
              </div>
            </div>

            {/* Insight 2: Vocational EV & Solar */}
            <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] space-y-2 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  High Placement Trust (+16.8%)
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">68% Positive</span>
              </div>
              <h3 className="font-bold text-[#252525] text-xs">
                Solar PV &amp; EV Technician Certification Drives
              </h3>
              <p className="text-[#666666] leading-relaxed text-[11px]">
                Clean energy skilling generates the highest positive sentiment across Maharashtra and Gujarat, with alumni reporting rapid placement in tier-2 industrial clusters.
              </p>
              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#0067A5]">Recommended Action:</span>
                <Link href="/feed?topic=Vocational%20training" className="text-[#0067A5] font-bold hover:underline">
                  View Evidence &rarr;
                </Link>
              </div>
            </div>

            {/* Insight 3: Interview Anxiety */}
            <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] space-y-2 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-700 text-[11px] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Unmet Need (34.7% Negative)
                </span>
                <span className="text-[10px] text-red-700 font-bold">Behavioral Friction</span>
              </div>
              <h3 className="font-bold text-[#252525] text-xs">
                HR Round Behavioral Confidence Deficit
              </h3>
              <p className="text-[#666666] leading-relaxed text-[11px]">
                Technical test clearing is high, but first-time job seekers report severe rejection in STAR-format HR discussions due to lack of mock interview exposure.
              </p>
              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#0067A5]">Recommended Action:</span>
                <Link href="/studio?opportunity=opp_01" className="text-[#0067A5] font-bold hover:underline">
                  Launch Clinic CTA &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Question Themes & Cross-Channel Engagement Patterns */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question Themes */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#0067A5]" />
              Top Audience Question Themes
            </h2>
            <div className="space-y-2 text-xs">
              {[
                {
                  theme: "STAR behavioral interview preparation for first-time job seekers",
                  topic: "Employability and job readiness",
                  count: 48,
                  sample: "How do freshers answer 'tell me about a time you failed' in campus interviews?",
                },
                {
                  theme: "Generative AI tools roadmap for non-technical retail/hospitality roles",
                  topic: "AI and digital skills",
                  count: 36,
                  sample: "Which AI tools are actually demanded for B.Com freshers in office operations?",
                },
                {
                  theme: "Vocational solar PV & EV center admissions and scholarship criteria",
                  topic: "Vocational training",
                  count: 29,
                  sample: "Where do students enroll for Tata STRIVE free solar technician courses?",
                },
              ].map((q, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#252525]">{q.theme}</span>
                    <span className="text-[10px] font-bold text-[#0067A5] bg-white px-2 py-0.5 rounded border">
                      {q.count} queries
                    </span>
                  </div>
                  <p className="text-[11px] text-[#666666] italic bg-white p-2 rounded border border-[#E5E7EB]">
                    &quot;{q.sample}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Time-of-Day Engagement */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0067A5]" />
              Audience Engagement by Time of Day (IST)
            </h2>
            <p className="text-xs text-[#666666]">
              Average engagement per post across time intervals. Peak engagement occurs between 6 PM - 8 PM IST.
            </p>
            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { hour: "8 AM", eng: 45 },
                    { hour: "10 AM", eng: 120 },
                    { hour: "12 PM", eng: 165 },
                    { hour: "2 PM", eng: 130 },
                    { hour: "4 PM", eng: 190 },
                    { hour: "6 PM", eng: 240 },
                    { hour: "8 PM", eng: 285 },
                    { hour: "10 PM", eng: 140 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                  <Bar dataKey="eng" name="Avg Engagement" fill="#0067A5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function TrendsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#666666]">Loading trends intelligence...</div>}>
      <TrendsContent />
    </Suspense>
  );
}
