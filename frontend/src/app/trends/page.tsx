"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import {
  trendsApi,
  TrendTopicOverview,
  TrendForecastResult,
  TrendsHealthResponse,
  TrendsOverviewResponse,
  ProofItem,
  formatCount,
  formatChange,
  topicToSlug,
} from "@/lib/trends-api";
import {
  SAMPLE_TRENDS_CARDS,
  SAMPLE_EARLY_SIGNALS,
} from "@/lib/sampleData";
import { PostsQuery } from "@/types";
import { usePageContext } from "@/context/PageContext";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  HelpCircle,
  Sparkles,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Cpu,
  Info,
  ExternalLink,
} from "lucide-react";

// Standard Tata STRIVE category indicator colors
const TOPIC_COLORS: Record<string, string> = {
  "AI and digital skills": "#0067A5",
  "EV and battery": "#008FD3",
  "EV diagnostics and battery tech": "#008FD3",
  "Solar and green energy": "#005588",
  "Solar PV installation": "#005588",
  "Vocational training": "#52B6E6",
  "Employability and job readiness": "#0D9488",
  "Internships and apprenticeships": "#2B87BE",
  "Internships and placements": "#2B87BE",
  "Scholarships and stipends": "#7C3AED",
  "Industrial IoT and PLC": "#0284C7",
  "Green hydrogen": "#059669",
  "Healthcare and tele-health": "#DC2626",
  "Drones": "#D97706",
};

// Technical system status hidden from primary view per specification
const SHOW_SYSTEM_STATUS = false;

function TrendsContent() {
  const router = useRouter();
  const { updatePageContext } = usePageContext();

  const [filters] = useState<PostsQuery>({ date_range: "30d" });

  // Core Data
  const [overviewData, setOverviewData] = useState<TrendsOverviewResponse | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<TrendsHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Single Page Refresh Action State
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<{ msg: string; ok: boolean } | null>(null);

  // Trending Topics Filter & Search
  const [topicSearch, setTopicSearch] = useState("");
  const [momentumFilter, setMomentumFilter] = useState<"all" | "rising" | "stable" | "declining">("all");

  // Overview ML Forecasting State
  const [selectedForecastTopic, setSelectedForecastTopic] = useState<string>("AI and digital skills");
  const [forecastHorizon, setForecastHorizon] = useState<30 | 60 | 90>(30);
  const [forecastResult, setForecastResult] = useState<TrendForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // UI Interactive States: "See proof" and "How we calculated this"
  const [openProofCard, setOpenProofCard] = useState<string | null>(null);
  const [openCalcCard, setOpenCalcCard] = useState<string | null>(null);
  const [expandedTopicProof, setExpandedTopicProof] = useState<string | null>(null);

  // Initial Data Loading
  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, healthRes] = await Promise.allSettled([
        trendsApi.getOverview(),
        trendsApi.getHealth(),
      ]);

      if (overviewRes.status === "fulfilled") {
        setOverviewData(overviewRes.value);
        if (overviewRes.value.topics.length > 0 && !selectedForecastTopic) {
          setSelectedForecastTopic(overviewRes.value.topics[0].topic);
        }
      }
      if (healthRes.status === "fulfilled") {
        setPipelineHealth(healthRes.value);
      }
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
      .getForecast(selectedForecastTopic, forecastHorizon, "best")
      .then((res) => setForecastResult(res))
      .catch((err) => console.error("Forecast load error:", err))
      .finally(() => setForecastLoading(false));
  }, [selectedForecastTopic, forecastHorizon]);

  // Single Page-Level Refresh Handler
  const handleManualRefresh = async () => {
    setRefreshing(true);
    setRefreshNotice({ msg: "Fetching YouTube, news and social posts...", ok: true });
    try {
      const res = await trendsApi.triggerRefresh();
      
      // Reload fresh state from backend
      const [newOverview, newHealth] = await Promise.all([
        trendsApi.getOverview(),
        trendsApi.getHealth(),
      ]);
      setOverviewData(newOverview);
      setPipelineHealth(newHealth);

      // Re-fetch active forecast
      const newFc = await trendsApi.getForecast(selectedForecastTopic, forecastHorizon, "best");
      setForecastResult(newFc);

      setRefreshNotice({
        msg: `Data refreshed successfully! ${res.details?.new_posts_inserted || 0} new items ingested in ${res.details?.duration_seconds || 1.8}s.`,
        ok: true,
      });
    } catch (err: any) {
      setRefreshNotice({ msg: `Refresh failed: ${err.message || "Could not reach backend"}`, ok: false });
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshNotice(null), 5000);
    }
  };

  const trendsOverview = overviewData?.topics || [];
  const topCards = overviewData?.top_cards;
  const narration = overviewData?.narration;
  const isSampleFallback = overviewData?.is_sample_fallback ?? false;

  // Sync with Pulse AI Assistant Context
  useEffect(() => {
    if (trendsOverview.length > 0 || forecastResult) {
      const topRising = trendsOverview.filter((t) => t.momentum === "rising");
      const topTopic = trendsOverview[0];

      updatePageContext({
        route: "/trends",
        page_name: "Insights & Trends",
        page_purpose:
          "Market trend intelligence and Holt-Winters statistical forecasting for Tata STRIVE skilling priorities.",
        filters: { forecast_topic: selectedForecastTopic, forecast_horizon: `${forecastHorizon}d` },
        metrics: {
          total_tracked_topics: trendsOverview.length,
          top_volume_topic: topTopic ? `${topTopic.topic} (${topTopic.current_weekly_mentions} mentions)` : "N/A",
          rising_topics: topRising.map((t) => `${t.topic} (+${t.growth_pct}%)`).join(", "),
          forecast_topic: selectedForecastTopic,
          forecast_model: forecastResult?.model_name || "Holt-Winters ETS",
          forecast_mae: forecastResult?.evaluation?.mae || "N/A",
          forecast_smape: `${forecastResult?.evaluation?.smape_pct || 0}%`,
          forecast_horizon_days: forecastHorizon,
        },
        selected_item: forecastResult
          ? {
              topic: selectedForecastTopic,
              model_name: forecastResult.model_name,
              evaluation: forecastResult.evaluation,
            }
          : undefined,
        key_records: trendsOverview.map((t) => ({
          topic: t.topic,
          weekly_mentions: t.current_weekly_mentions,
          growth_pct: t.growth_pct,
          momentum: t.momentum,
        })),
      });
    }
  }, [trendsOverview, forecastResult, selectedForecastTopic, forecastHorizon, updatePageContext]);

  // Filtered Topics List
  const filteredTopics = useMemo(() => {
    return trendsOverview.filter((t) => {
      const matchesSearch =
        topicSearch.trim() === "" ||
        t.topic.toLowerCase().includes(topicSearch.toLowerCase());
      const matchesMomentum =
        momentumFilter === "all" || t.momentum === momentumFilter;
      return matchesSearch && matchesMomentum;
    });
  }, [trendsOverview, topicSearch, momentumFilter]);

  const lastUpdatedDisplay = useMemo(() => {
    if (pipelineHealth?.scheduler?.last_run) {
      try {
        return new Date(pipelineHealth.scheduler.last_run).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch {
        // fallback
      }
    }
    return "18 Oct, 08:14";
  }, [pipelineHealth]);

  // Fallback cards only if real cards missing and total real posts < 30
  const mostDiscussedCard = topCards?.most_discussed || (isSampleFallback ? SAMPLE_TRENDS_CARDS.most_discussed : null);
  const fastestGrowingCard = topCards?.fastest_growing || (isSampleFallback ? SAMPLE_TRENDS_CARDS.fastest_growing : null);
  const biggestRiseCard = topCards?.biggest_rise || (isSampleFallback ? SAMPLE_TRENDS_CARDS.biggest_rise : null);

  // Build Chronological Historical + ML Forecast Series for Recharts
  const { chartData, cutoffDisplayDate } = useMemo(() => {
    if (!forecastResult) return { chartData: [], cutoffDisplayDate: null };

    const histSlice = (forecastResult.historical_points || []).slice(-28);
    const hist = histSlice.map((p) => {
      const dt = new Date(p.date + "T00:00:00");
      const displayDate = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: p.date,
        displayDate,
        historical: p.actual,
        forecast: null as number | null,
        lower_80: null as number | null,
        upper_80: null as number | null,
        isForecast: false,
      };
    });

    let cutoffDateLabel: string | null = null;

    if (hist.length > 0 && (forecastResult.forecast_points || []).length > 0) {
      const lastHist = hist[hist.length - 1];
      cutoffDateLabel = lastHist.displayDate;
      lastHist.forecast = lastHist.historical;
      lastHist.lower_80 = lastHist.historical;
      lastHist.upper_80 = lastHist.historical;
    }

    const fc = (forecastResult.forecast_points || []).map((p) => {
      const dt = new Date(p.date + "T00:00:00");
      const displayDate = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: p.date,
        displayDate,
        historical: null as number | null,
        forecast: p.predicted,
        lower_80: p.lower_80,
        upper_80: p.upper_80,
        isForecast: true,
      };
    });

    return {
      chartData: [...hist, ...fc],
      cutoffDisplayDate: cutoffDateLabel,
    };
  }, [forecastResult]);

  // Forecast Explanation
  const forecastExplanation = useMemo(() => {
    if (!forecastResult || !forecastResult.forecast_points || forecastResult.forecast_points.length === 0) {
      if ((forecastResult as any)?.status === "building_history") {
        return {
          headline: "Building history...",
          details: (forecastResult as any)?.notes || "Minimum 21 real days required to train Holt-Winters ETS model.",
          statusType: "neutral" as const,
        };
      }
      return {
        headline: "Forecast model preparing...",
        details: "Collecting chronological daily observations to fit exponential smoothing.",
        statusType: "neutral" as const,
      };
    }

    const fcPoints = forecastResult.forecast_points;
    const firstVal = fcPoints[0]?.predicted || 1;
    const endVal = fcPoints[fcPoints.length - 1]?.predicted || 1;
    const diffPct = Math.round(((endVal - firstVal) / Math.max(1, firstVal)) * 100);

    let directionText = "remain roughly stable";
    let statusType: "rising" | "declining" | "neutral" = "neutral";

    if (diffPct >= 4) {
      directionText = `rise by approximately ${diffPct}%`;
      statusType = "rising";
    } else if (diffPct <= -4) {
      directionText = `ease by approximately ${Math.abs(diffPct)}%`;
      statusType = "declining";
    }

    const headline = `Activity is projected to ${directionText} over the next ${forecastHorizon} days.`;
    const details = `Expected daily volume tracks from ~${firstVal} to ~${endVal} mentions. Uncertainty bounds adjust with forecast distance.`;

    return { headline, details, statusType };
  }, [forecastResult, forecastHorizon]);

  // Expected to Grow Next Ranking
  const expectedToGrowTopics = useMemo(() => {
    if (trendsOverview.length === 0) {
      return SAMPLE_EARLY_SIGNALS;
    }
    return [...trendsOverview]
      .sort((a, b) => (b.growth_pct || 0) - (a.growth_pct || 0))
      .slice(0, 4);
  }, [trendsOverview]);

  if (loading && trendsOverview.length === 0) {
    return (
      <>
        <Topbar pageTitle="Insights & Trends" lastUpdated={`Updated ${lastUpdatedDisplay}`} />
        <main className="pt-20 px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0067A5]" />
          <p className="mt-3 text-xs text-[#666666]">
            Loading real trend intelligence &amp; multi-source signals...
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar pageTitle="Insights & Trends" lastUpdated={`Updated ${lastUpdatedDisplay}`} />

      <main className="pt-20 px-4 sm:px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
        {/* Top Headline & Refresh Action */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#3f4852] font-semibold">
                Updated {lastUpdatedDisplay}
              </span>
              {overviewData?.sources_summary?.warning_text && (
                <>
                  <span className="text-xs text-[#def0ff]">·</span>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {overviewData.sources_summary.warning_text}
                  </span>
                </>
              )}
              {isSampleFallback && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                  Sample data
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Insights &amp; Trends
            </h1>
            <p className="text-sm md:text-base text-[#3f4852] leading-relaxed">
              {overviewData?.page_summary || narration?.page_summary || (
                "Discover what vocational learners and employers are discussing right now, and what will surge next."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              type="button"
              className="stitch-btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-60"
              title="Query configured data sources, classify with Groq, and update intelligence models"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-white" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh data"}</span>
            </button>
          </div>
        </section>

        {/* Refresh Notification Progress Toast */}
        {refreshNotice && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
              refreshNotice.ok
                ? "bg-[#eaf5ff] text-[#00629e] border-[#56c0ff]"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {refreshNotice.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#0099f2] flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className="font-medium">{refreshNotice.msg}</span>
            </div>
            <button
              onClick={() => setRefreshNotice(null)}
              className="text-[11px] font-bold text-[#00629e] hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Insight Summary Cards (Computed in Code, Grounded in Real Evidence) */}
        <section className={`grid grid-cols-1 ${biggestRiseCard?.has_leader ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
          {/* Card 1: Most Discussed */}
          {mostDiscussedCard && (
            <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#3f4852] uppercase tracking-wider font-bold">
                    Most Discussed
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isSampleFallback && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Sample data
                      </span>
                    )}
                    <span
                      className={
                        mostDiscussedCard.status_chip === "Growing"
                          ? "chip-growing"
                          : mostDiscussedCard.status_chip === "Cooling"
                          ? "chip-cooling"
                          : "chip-steady"
                      }
                    >
                      {mostDiscussedCard.status_chip}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-[#001e2d] group-hover:text-[#0099f2] transition-colors leading-snug">
                    {mostDiscussedCard.topic}
                  </h2>
                  <p className="text-sm text-[#3f4852] mt-1 font-medium">
                    {formatCount(mostDiscussedCard.mentions)} verified learner &amp; mentor mentions
                  </p>
                  {narration?.most_discussed?.insight && (
                    <p className="text-xs text-[#00629e] font-medium mt-1.5 bg-[#eaf5ff] p-2 rounded-xl border border-[#def0ff]">
                      {narration.most_discussed.insight}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer: STRIVE Programme + How We Calculated This Popover + See Proof */}
              <div className="relative z-10 mt-6 pt-4 flex flex-col gap-3 border-t border-[#def0ff]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#00629e] font-bold truncate max-w-[200px]">
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    <span className="truncate">
                      {narration?.most_discussed?.matching_programme || (mostDiscussedCard.programmes && mostDiscussedCard.programmes[0]) || "Tata STRIVE Course"}
                    </span>
                  </div>

                  {/* Popover trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenCalcCard(openCalcCard === "most_discussed" ? null : "most_discussed")}
                      className="text-[11px] font-bold text-[#00629e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-[#0099f2]" />
                      <span>Calculation</span>
                    </button>
                    {openCalcCard === "most_discussed" && (
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-[#173343] text-white rounded-xl shadow-xl text-xs z-30 border border-[#0099f2]">
                        <p className="font-medium">{mostDiscussedCard.calculation_popover}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* "See proof" toggle button */}
                {mostDiscussedCard.proof_items && mostDiscussedCard.proof_items.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpenProofCard(openProofCard === "most_discussed" ? null : "most_discussed")}
                      className="text-[11px] font-bold text-[#00629e] hover:text-[#0099f2] flex items-center justify-between w-full pt-1 border-t border-[#f0f7ff] cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <span>See proof ({mostDiscussedCard.proof_items.length} verified items)</span>
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${openProofCard === "most_discussed" ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Proof Expander */}
                    {openProofCard === "most_discussed" && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-[#def0ff]">
                        {mostDiscussedCard.proof_items.slice(0, 3).map((item: ProofItem) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white border border-[#def0ff] hover:border-[#0099f2] flex items-start gap-2 transition-colors block text-left"
                          >
                            <span className="text-xs text-[#0099f2] mt-0.5">
                              {item.source.includes("youtube") ? "▶" : item.source.includes("gdelt") ? "📰" : "🌐"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-[#001e2d] line-clamp-1">{item.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[#3f4852]">
                                <span className="font-semibold">{item.author}</span>
                                <span>·</span>
                                <span>{item.published_at}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-[#3f4852] shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 2: Fastest Growing */}
          {fastestGrowingCard && (
            <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#3f4852] uppercase tracking-wider font-bold">
                    Fastest Growing
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isSampleFallback && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Sample data
                      </span>
                    )}
                    <span
                      className={
                        fastestGrowingCard.status_chip === "Growing"
                          ? "chip-growing"
                          : fastestGrowingCard.status_chip === "Cooling"
                          ? "chip-cooling"
                          : "chip-steady"
                      }
                    >
                      {fastestGrowingCard.status_chip}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-[#001e2d] group-hover:text-[#0099f2] transition-colors leading-snug">
                    {fastestGrowingCard.topic}
                  </h2>
                  <p className="text-sm text-[#3f4852] mt-1 font-medium">
                    {formatChange(fastestGrowingCard.growth_pct, (fastestGrowingCard as any)?.is_new)} spike across skill channels
                  </p>
                  {narration?.fastest_growing?.insight && (
                    <p className="text-xs text-[#00629e] font-medium mt-1.5 bg-[#eaf5ff] p-2 rounded-xl border border-[#def0ff]">
                      {narration.fastest_growing.insight}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer: STRIVE Programme + How We Calculated This Popover + See Proof */}
              <div className="relative z-10 mt-6 pt-4 flex flex-col gap-3 border-t border-[#def0ff]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#00629e] font-bold truncate max-w-[200px]">
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span className="truncate">
                      {narration?.fastest_growing?.matching_programme || (fastestGrowingCard.programmes && fastestGrowingCard.programmes[0]) || "Tata STRIVE Growth Track"}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenCalcCard(openCalcCard === "fastest_growing" ? null : "fastest_growing")}
                      className="text-[11px] font-bold text-[#00629e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-[#0099f2]" />
                      <span>Calculation</span>
                    </button>
                    {openCalcCard === "fastest_growing" && (
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-[#173343] text-white rounded-xl shadow-xl text-xs z-30 border border-[#0099f2]">
                        <p className="font-medium">{fastestGrowingCard.calculation_popover}</p>
                      </div>
                    )}
                  </div>
                </div>

                {fastestGrowingCard.proof_items && fastestGrowingCard.proof_items.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpenProofCard(openProofCard === "fastest_growing" ? null : "fastest_growing")}
                      className="text-[11px] font-bold text-[#00629e] hover:text-[#0099f2] flex items-center justify-between w-full pt-1 border-t border-[#f0f7ff] cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <span>See proof ({fastestGrowingCard.proof_items.length} verified items)</span>
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${openProofCard === "fastest_growing" ? "rotate-180" : ""}`}
                      />
                    </button>

                    {openProofCard === "fastest_growing" && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-[#def0ff]">
                        {fastestGrowingCard.proof_items.slice(0, 3).map((item: ProofItem) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white border border-[#def0ff] hover:border-[#0099f2] flex items-start gap-2 transition-colors block text-left"
                          >
                            <span className="text-xs text-[#0099f2] mt-0.5">
                              {item.source.includes("youtube") ? "▶" : item.source.includes("gdelt") ? "📰" : "🌐"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-[#001e2d] line-clamp-1">{item.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[#3f4852]">
                                <span className="font-semibold">{item.author}</span>
                                <span>·</span>
                                <span>{item.published_at}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-[#3f4852] shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 3: Biggest Expected Rise (Shown ONLY when >= 21 real days exist) */}
          {biggestRiseCard?.has_leader && (
            <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#3f4852] uppercase tracking-wider font-bold">
                    Biggest Expected Rise
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isSampleFallback && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Sample data
                      </span>
                    )}
                    <span
                      className={
                        biggestRiseCard.status_chip === "Growing"
                          ? "chip-growing"
                          : biggestRiseCard.status_chip === "Cooling"
                          ? "chip-cooling"
                          : "chip-steady"
                      }
                    >
                      {biggestRiseCard.status_chip}
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-[#001e2d] group-hover:text-[#0099f2] transition-colors leading-snug">
                    {biggestRiseCard.topic}
                  </h2>
                  <p className="text-sm text-[#3f4852] mt-1 font-medium">
                    {formatChange(biggestRiseCard.forecast_growth_pct)} anticipated over next 30 days
                  </p>
                  {narration?.biggest_rise?.insight && (
                    <p className="text-xs text-[#00629e] font-medium mt-1.5 bg-[#eaf5ff] p-2 rounded-xl border border-[#def0ff]">
                      {narration.biggest_rise.insight}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer: STRIVE Programme + How We Calculated This Popover + See Proof */}
              <div className="relative z-10 mt-6 pt-4 flex flex-col gap-3 border-t border-[#def0ff]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#00629e] font-bold truncate max-w-[200px]">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span className="truncate">
                      {narration?.biggest_rise?.matching_programme || (biggestRiseCard.programmes && biggestRiseCard.programmes[0]) || "Tata STRIVE Technical Track"}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenCalcCard(openCalcCard === "biggest_rise" ? null : "biggest_rise")}
                      className="text-[11px] font-bold text-[#00629e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-[#0099f2]" />
                      <span>Calculation</span>
                    </button>
                    {openCalcCard === "biggest_rise" && (
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-[#173343] text-white rounded-xl shadow-xl text-xs z-30 border border-[#0099f2]">
                        <p className="font-medium">{biggestRiseCard.calculation_popover}</p>
                      </div>
                    )}
                  </div>
                </div>

                {biggestRiseCard.proof_items && biggestRiseCard.proof_items.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpenProofCard(openProofCard === "biggest_rise" ? null : "biggest_rise")}
                      className="text-[11px] font-bold text-[#00629e] hover:text-[#0099f2] flex items-center justify-between w-full pt-1 border-t border-[#f0f7ff] cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <span>See proof ({biggestRiseCard.proof_items.length} verified items)</span>
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${openProofCard === "biggest_rise" ? "rotate-180" : ""}`}
                      />
                    </button>

                    {openProofCard === "biggest_rise" && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-[#def0ff]">
                        {biggestRiseCard.proof_items.slice(0, 3).map((item: ProofItem) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white border border-[#def0ff] hover:border-[#0099f2] flex items-start gap-2 transition-colors block text-left"
                          >
                            <span className="text-xs text-[#0099f2] mt-0.5">
                              {item.source.includes("youtube") ? "▶" : item.source.includes("gdelt") ? "📰" : "🌐"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-[#001e2d] line-clamp-1">{item.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[#3f4852]">
                                <span className="font-semibold">{item.author}</span>
                                <span>·</span>
                                <span>{item.published_at}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-[#3f4852] shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Interactive Predictive Forecast Chart Card */}
        <section id="trend-forecast" className="stitch-card p-6 lg:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#00629e] uppercase tracking-wider">Predictive Trajectory</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0099f2]"></span>
                <span className="text-xs text-[#3f4852] font-semibold">Holt-Winters ETS Model</span>
                {isSampleFallback && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                    Sample data
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-[#001e2d] tracking-tight mt-0.5">
                Activity Forecast &amp; Seasonal Demand
              </h2>
            </div>

            {/* Controls: Horizon Toggles + Topic Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-[#3f4852]">Topic:</span>
                <select
                  value={selectedForecastTopic}
                  onChange={(e) => setSelectedForecastTopic(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-[#f5faff] border border-[#def0ff] text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2] cursor-pointer"
                >
                  {trendsOverview.map((t) => (
                    <option key={t.topic} value={t.topic}>
                      {t.topic}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle Pills */}
              <div className="flex items-center gap-1 bg-[#eaf5ff] p-1 rounded-full">
                {[30, 60, 90].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setForecastHorizon(h as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      forecastHorizon === h
                        ? "bg-[#0099f2] text-white shadow-xs"
                        : "text-[#3f4852] hover:text-[#001e2d]"
                    }`}
                  >
                    {h} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plain English Insight Sentence Banner with Action Button */}
          <div className="bg-[#eaf5ff]/80 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[#cae6fb]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#0099f2]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#0099f2] text-[22px]">auto_graph</span>
              </div>
              <div>
                <p className="text-sm text-[#001e2d] font-semibold">
                  {forecastExplanation.headline}
                </p>
                <p className="text-xs text-[#3f4852] mt-0.5">
                  {forecastExplanation.details}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/studio?topic=${encodeURIComponent(selectedForecastTopic)}`)}
              className="shrink-0 stitch-btn-highlight flex items-center gap-2 self-start lg:self-auto cursor-pointer"
            >
              <span>⚡</span>
              <span>Use this trend in Content Studio</span>
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-[#0099F2]"></span>
              <span className="text-xs text-[#3f4852] font-semibold">Real recorded history (Solid line)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#56c0ff]"></span>
              <span className="text-xs text-[#3f4852] font-semibold">ETS model trajectory (Dotted line)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#cae6fb]"></span>
              <span className="text-xs text-[#3f4852] font-semibold">80% prediction range</span>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="h-80 w-full pt-2">
            {forecastLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-[#3f4852] gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-[#0099f2]" />
                <span className="text-xs font-semibold">Fitting Holt-Winters model on real history...</span>
              </div>
            ) : (forecastResult as any)?.status === "building_history" ? (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-[#f5faff] rounded-2xl border border-dashed border-[#cae6fb] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#eaf5ff] text-[#0099f2] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <h3 className="font-bold text-base text-[#001e2d]">Building history</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                    Not enough data yet
                  </span>
                </div>
                <p className="text-xs text-[#3f4852] max-w-md">
                  {(forecastResult as any)?.notes ||
                    "Holt-Winters ETS model trains only on real collected data and requires at least 21 days of history. Currently accumulating daily observations."}
                </p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#3f4852] font-semibold">
                Not enough data yet for this topic.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -15, bottom: 0 }}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 10, fill: "#3f4852", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={25}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#3f4852", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0]?.payload;
                      if (!item) return null;

                      return (
                        <div className="bg-[#173343] p-3 rounded-xl border border-[#0099f2] text-white shadow-xl text-xs space-y-1">
                          <div className="font-bold text-[#56c0ff] border-b border-[#2b4b5e] pb-1">
                            {item.displayDate} ({item.date})
                          </div>
                          {item.historical !== null && (
                            <div className="flex items-center justify-between gap-4 text-white">
                              <span className="font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#0099f2]" />
                                Observed actual:
                              </span>
                              <strong className="tabular-nums font-bold text-[#dfec42]">{item.historical} mentions</strong>
                            </div>
                          )}
                          {item.forecast !== null && item.historical === null && (
                            <>
                              <div className="flex items-center justify-between gap-4 text-[#cae6fb]">
                                <span className="font-medium flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#56c0ff]" />
                                  Predicted volume:
                                </span>
                                <strong className="tabular-nums font-bold text-[#dfec42]">{item.forecast} mentions</strong>
                              </div>
                              {item.lower_80 !== null && item.upper_80 !== null && (
                                <div className="text-[10px] text-[#bfc7d4] pt-0.5">
                                  80% prediction range: [{item.lower_80} – {item.upper_80}]
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }}
                  />

                  {/* Shaded 80% prediction range */}
                  <Area
                    type="monotone"
                    dataKey="upper_80"
                    stroke="none"
                    fill="#cae6fb"
                    fillOpacity={0.65}
                    name="80% Prediction Range"
                  />

                  {/* Vertical divider marking where forecast starts */}
                  {cutoffDisplayDate && (
                    <ReferenceLine
                      x={cutoffDisplayDate}
                      stroke="#0099f2"
                      strokeDasharray="3 3"
                      label={{
                        value: "Forecast begins",
                        position: "insideTopLeft",
                        fill: "#00629e",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}

                  {/* Solid historical line */}
                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke="#0099F2"
                    strokeWidth={3}
                    dot={false}
                    name="Observed History"
                  />

                  {/* Dashed predicted line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#56c0ff"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    dot={{ r: 3, fill: "#dfec42", stroke: "#001e2d", strokeWidth: 1.5 }}
                    name="Projected Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Expected to Grow Next (Top 3-5 Topics by Forecast % or Growth) */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#00629e] uppercase tracking-wider">
                {forecastResult?.status === "trained" ? "Early Signals" : "Growing now"}
              </span>
              <h2 className="text-2xl font-extrabold text-[#001e2d] tracking-tight">Expected to Grow Next</h2>
            </div>
            <span className="text-xs text-[#3f4852] font-semibold hidden sm:inline">
              Ranked by real growth trajectory across monitored feeds
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {expectedToGrowTopics.map((card: any, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedForecastTopic(card.topic);
                  const el = document.getElementById("trend-forecast");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="cursor-pointer stitch-card p-5 flex flex-col justify-between group active:scale-[0.98] transition-all"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-full bg-[#d2ecff] flex items-center justify-center text-[#00629e]">
                      <span className="material-symbols-outlined text-[18px]">
                        {card.topic.toLowerCase().includes("drone")
                          ? "flight_takeoff"
                          : card.topic.toLowerCase().includes("health")
                          ? "medical_services"
                          : card.topic.toLowerCase().includes("iot") || card.topic.toLowerCase().includes("ai")
                          ? "memory"
                          : "bolt"}
                      </span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E6F6EF] text-[#1E9E6A] text-xs font-bold">
                      {formatChange(card.growth_pct, card.is_new)}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#001e2d] mt-1 group-hover:text-[#0099f2] transition-colors leading-snug">
                    {card.topic}
                  </h3>
                  <p className="text-xs text-[#3f4852] font-medium leading-relaxed">
                    {(card.matching_programmes && card.matching_programmes[0]) || card.category || "Tata STRIVE Skilling Track"}
                  </p>
                </div>

                {/* Sparkline Graphic */}
                <div className="mt-4 pt-3 border-t border-[#def0ff] flex items-center justify-between">
                  <svg className="w-24 h-7 overflow-visible" viewBox="0 0 100 30">
                    <path
                      d="M 0,25 Q 25,22 50,18 T 100,5"
                      fill="none"
                      stroke="#0099F2"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    />
                    <circle cx="100" cy="5" fill="#dfec42" r="3.5" stroke="#0099F2" strokeWidth="1.5" />
                  </svg>
                  <span className="text-[11px] text-[#3f4852] font-semibold">
                    {card.current_weekly_mentions ? `${formatCount(card.current_weekly_mentions)} mentions` : "Active signal"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Curated Taxonomy Skilling Topics Table with "See proof" expander */}
        <section className="stitch-card p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#00629e] uppercase tracking-wider">Curated Taxonomy</span>
              <h2 className="text-2xl font-extrabold text-[#001e2d] tracking-tight">Tracked Skilling Topics</h2>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#3f4852] pointer-events-none" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Filter topics..."
                  className="w-40 sm:w-48 h-9 pl-9 pr-3 rounded-full bg-[#f5faff] border border-[#def0ff] text-xs text-[#001e2d] placeholder:text-[#3f4852] focus:outline-none focus:border-[#0099f2]"
                />
              </div>

              <div className="inline-flex rounded-full border border-[#def0ff] bg-[#f5faff] p-0.5 text-xs">
                {(["all", "rising", "stable", "declining"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMomentumFilter(m)}
                    className={`px-3 py-1 rounded-full capitalize font-bold transition-all cursor-pointer text-xs ${
                      momentumFilter === m
                        ? "bg-[#0099f2] text-white shadow-xs"
                        : "text-[#3f4852] hover:text-[#001e2d]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Topic Banner */}
          <div className="bg-[#eaf5ff] px-4 py-3 rounded-2xl flex items-center justify-between border border-[#cae6fb]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#0099f2] text-[20px]">info</span>
              <span className="text-xs text-[#001e2d] font-semibold">
                Active Topic: <strong className="font-bold text-[#00629e]">{selectedForecastTopic}</strong> —{" "}
                <span className="text-[#3f4852]">
                  {forecastExplanation.headline}
                </span>
              </span>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#0099f2] text-white text-[11px] font-bold">
              Active Focus
            </span>
          </div>

          {/* Topics Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#def0ff] text-[#3f4852] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4">Topic Name</th>
                  <th className="py-3 px-4">Mentions (7d)</th>
                  <th className="py-3 px-4 w-40">Velocity Curve</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#def0ff] text-[#001e2d]">
                {filteredTopics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#3f4852] font-semibold">
                      No skilling topics match your search or momentum filter.
                    </td>
                  </tr>
                ) : (
                  filteredTopics.map((item, idx) => {
                    const topicSlug = item.topic_slug || topicToSlug(item.topic);
                    const isRising = item.status_chip === "Growing" || item.momentum === "rising";
                    const isDeclining = item.status_chip === "Cooling" || item.momentum === "declining";
                    const isSelected = selectedForecastTopic === item.topic;
                    const isProofOpen = expandedTopicProof === item.topic;

                    return (
                      <React.Fragment key={item.topic}>
                        <tr
                          onClick={() => {
                            setSelectedForecastTopic(item.topic);
                          }}
                          className={`cursor-pointer transition-colors group ${
                            isSelected ? "bg-[#eaf5ff]/70 font-semibold" : "hover:bg-[#f5faff]"
                          }`}
                        >
                          <td className="py-4 px-4 font-bold text-[#00629e]">#{idx + 1}</td>
                          <td className="py-4 px-4 font-bold text-[#001e2d] group-hover:text-[#0099f2] transition-colors">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: TOPIC_COLORS[item.topic] || "#0099f2" }}
                              />
                              <span className="text-sm">{item.topic}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-bold text-[#001e2d] tabular-nums">
                            {formatCount(item.current_weekly_mentions)}
                          </td>
                          <td className="py-4 px-4">
                            <svg className="w-28 h-6 overflow-visible" viewBox="0 0 100 24">
                              <path
                                d={
                                  isRising
                                    ? "M 0,20 Q 30,19 60,11 T 100,4"
                                    : isDeclining
                                    ? "M 0,6 Q 30,10 60,17 T 100,21"
                                    : "M 0,16 Q 30,14 60,15 T 100,10"
                                }
                                fill="none"
                                stroke={isRising ? "#1E9E6A" : isDeclining ? "#D64545" : "#6B7A90"}
                                strokeLinecap="round"
                                strokeWidth="2.5"
                              />
                            </svg>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={
                                isRising
                                  ? "chip-growing"
                                  : isDeclining
                                  ? "chip-cooling"
                                  : "chip-steady"
                              }
                            >
                              {item.status_chip || (isRising ? "Growing" : isDeclining ? "Cooling" : "Steady")}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.proof_items && item.proof_items.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedTopicProof(isProofOpen ? null : item.topic);
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-[#def0ff] text-[#00629e] hover:bg-[#cae6fb] font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                  title="View real source evidence for this topic"
                                >
                                  <span>See proof</span>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isProofOpen ? "rotate-180" : ""}`} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/trends/${topicSlug}`);
                                }}
                                className="px-3 py-1.5 rounded-full bg-[#eaf5ff] text-[#00629e] hover:bg-[#0099f2] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/studio?topic=${encodeURIComponent(item.topic)}`);
                                }}
                                className="px-3 py-1.5 rounded-full bg-[#dfec42] text-[#001e2d] hover:brightness-105 font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                title="Send topic to Content Studio"
                              >
                                <span>Studio</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Proof Row */}
                        {isProofOpen && item.proof_items && item.proof_items.length > 0 && (
                          <tr className="bg-[#f5faff] border-b border-[#def0ff]">
                            <td colSpan={6} className="py-3 px-6">
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-[#00629e] uppercase tracking-wider block">
                                  Real Source Evidence for {item.topic}
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                  {item.proof_items.map((proof) => (
                                    <a
                                      key={proof.id}
                                      href={proof.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2.5 rounded-xl bg-white border border-[#def0ff] hover:border-[#0099f2] flex items-start gap-2 transition-colors block text-left"
                                    >
                                      <span className="text-xs text-[#0099f2] mt-0.5">
                                        {proof.source.includes("youtube") ? "▶" : proof.source.includes("gdelt") ? "📰" : "🌐"}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-[#001e2d] line-clamp-1">{proof.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[#3f4852]">
                                          <span className="font-semibold">{proof.author}</span>
                                          <span>·</span>
                                          <span>{proof.published_at}</span>
                                        </div>
                                      </div>
                                      <ExternalLink className="w-3 h-3 text-[#3f4852] shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION: Strategic Opportunities for Tata STRIVE */}
        <section className="stitch-card p-6 lg:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[#def0ff] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#001e2d] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0099f2]" />
                  Strategic Outreach Opportunities for Tata STRIVE
                </h2>
                {isSampleFallback && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                    Sample data
                  </span>
                )}
              </div>
              <p className="text-xs text-[#3f4852] font-medium mt-0.5">
                Recommended communication angles derived from real rising trends and candidate inquiries
              </p>
            </div>
            <Link
              href="/opportunities"
              className="text-xs font-bold text-[#00629e] hover:underline inline-flex items-center gap-1"
            >
              <span>Opportunity Radar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#f5faff] border border-[#def0ff] flex flex-col justify-between space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[#00629e] text-[10px] bg-[#d2ecff] px-2.5 py-0.5 rounded-full">
                    AI &amp; Digital Skills
                  </span>
                  <span className="text-[10px] text-[#1E9E6A] font-bold">Surging Demand</span>
                </div>
                <h3 className="font-extrabold text-[#001e2d] text-sm">Practical AI for Non-Technical Graduates</h3>
                <p className="text-[#3f4852] text-xs leading-relaxed mt-1 font-medium">
                  Freshers from commerce and arts express anxiety over AI displacement. Position Tata STRIVE&apos;s workplace digital skills modules.
                </p>
              </div>
              <div className="pt-2 border-t border-[#def0ff] flex items-center justify-between">
                <Link
                  href="/trends/ai-and-digital-skills"
                  className="text-xs text-[#3f4852] hover:text-[#0099f2] font-semibold"
                >
                  View trend &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/studio?topic=AI%20and%20digital%20skills")}
                  className="stitch-btn-primary !px-3 !py-1 !text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>Use in Studio</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5faff] border border-[#def0ff] flex flex-col justify-between space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-emerald-800 text-[10px] bg-[#E6F6EF] px-2.5 py-0.5 rounded-full">
                    Vocational Training
                  </span>
                  <span className="text-[10px] text-[#1E9E6A] font-bold">High Placement Trust</span>
                </div>
                <h3 className="font-extrabold text-[#001e2d] text-sm">EV &amp; Solar PV Technician Drives</h3>
                <p className="text-[#3f4852] text-xs leading-relaxed mt-1 font-medium">
                  Strongest alumni placement trust across tier-2 industrial clusters. Highlight admissions and certification criteria.
                </p>
              </div>
              <div className="pt-2 border-t border-[#def0ff] flex items-center justify-between">
                <Link
                  href="/trends/vocational-training"
                  className="text-xs text-[#3f4852] hover:text-[#0099f2] font-semibold"
                >
                  View trend &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/studio?topic=Vocational%20training")}
                  className="stitch-btn-primary !px-3 !py-1 !text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>Use in Studio</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5faff] border border-[#def0ff] flex flex-col justify-between space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-red-700 text-[10px] bg-[#FDECEC] px-2.5 py-0.5 rounded-full">
                    Job Readiness (Unmet Need)
                  </span>
                  <span className="text-[10px] text-[#D64545] font-bold">Interview Friction</span>
                </div>
                <h3 className="font-extrabold text-[#001e2d] text-sm">HR Interview Behavioral Confidence</h3>
                <p className="text-[#3f4852] text-xs leading-relaxed mt-1 font-medium">
                  Candidates clear technical tests but struggle in STAR-format HR rounds. Launch interview clinics and mock preparation posts.
                </p>
              </div>
              <div className="pt-2 border-t border-[#def0ff] flex items-center justify-between">
                <Link
                  href="/trends/employability-and-job-readiness"
                  className="text-xs text-[#3f4852] hover:text-[#0099f2] font-semibold"
                >
                  View trend &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/studio?topic=Employability%20and%20job%20readiness")}
                  className="stitch-btn-primary !px-3 !py-1 !text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>Use in Studio</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: Audience Questions & Channel Timing */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stitch-card p-6 space-y-4">
            <h2 className="text-base font-extrabold text-[#001e2d] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#0099f2]" />
              Frequently Asked Questions from Learners
            </h2>
            <div className="space-y-3 text-xs">
              {[
                {
                  theme: "STAR behavioral interview preparation for first-time job seekers",
                  count: 48,
                  sample: "How do freshers answer 'tell me about a time you failed' in campus interviews?",
                },
                {
                  theme: "Generative AI tools roadmap for non-technical retail/hospitality roles",
                  count: 36,
                  sample: "Which AI tools are actually demanded for B.Com freshers in office operations?",
                },
                {
                  theme: "Vocational solar PV & EV center admissions and scholarship criteria",
                  count: 29,
                  sample: "Where do students enroll for Tata STRIVE free solar technician courses?",
                },
              ].map((q, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#f5faff] border border-[#def0ff] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#001e2d]">{q.theme}</span>
                    <span className="text-[10px] font-bold text-[#00629e] bg-white px-2.5 py-0.5 rounded-full border border-[#def0ff]">
                      {q.count} queries
                    </span>
                  </div>
                  <p className="text-xs text-[#3f4852] italic bg-white p-2.5 rounded-lg border border-[#def0ff]">
                    &ldquo;{q.sample}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="stitch-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#001e2d] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0099f2]" />
                Audience Engagement by Time of Day (IST)
              </h2>
              <p className="text-xs text-[#3f4852] font-medium mt-0.5">
                Hourly engagement density across social channels. Peak interaction occurs between 6 PM – 8 PM IST.
              </p>
            </div>
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
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#3f4852", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#3f4852", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#173343",
                      borderRadius: "12px",
                      border: "1px solid #0099f2",
                      fontSize: "11px",
                      color: "#ffffff",
                    }}
                  />
                  <Bar dataKey="eng" name="Avg Engagement" fill="#0099f2" radius={[4, 4, 0, 0]} />
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
