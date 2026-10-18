"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import {
  trendsApi,
  TopicDetailResponse,
  TOPIC_SLUG_MAP,
  topicToSlug,
} from "@/lib/trends-api";
import { usePageContext } from "@/context/PageContext";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  Cpu,
  BarChart3,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  MessageSquare,
  ShieldCheck,
  Video,
  Newspaper,
  UserCheck,
} from "lucide-react";

// Standard Tata STRIVE topic colors
const TOPIC_COLORS: Record<string, string> = {
  "AI and digital skills": "#0067A5",
  "Vocational training": "#008FD3",
  "Employability and job readiness": "#005588",
  "Internships and placements": "#52B6E6",
  "Entrepreneurship": "#0D9488",
  "Youth education": "#2B87BE",
  "Employer skill requirements": "#1B628B",
};

function TopicDetailContent() {
  const router = useRouter();
  const params = useParams();
  const topicParam = (params?.topicId as string) || "";
  const { updatePageContext } = usePageContext();

  const [historyDays, setHistoryDays] = useState<7 | 30 | 90>(30);
  const [forecastHorizon, setForecastHorizon] = useState<30 | 60 | 90>(30);

  const [detail, setDetail] = useState<TopicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Fetch topic details by slug or name
  useEffect(() => {
    if (!topicParam) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    trendsApi
      .getDetail(topicParam, historyDays, forecastHorizon)
      .then((data) => {
        setDetail(data);
      })
      .catch((err: any) => {
        console.error("Error loading topic detail:", err);
        if (err.message && err.message.includes("not found")) {
          setIsNotFound(true);
        } else {
          setError(err.message || "Failed to load topic details");
        }
      })
      .finally(() => setLoading(false));
  }, [topicParam, historyDays, forecastHorizon]);

  // Sync active page context with persistent Pulse AI Assistant
  useEffect(() => {
    if (detail) {
      updatePageContext({
        route: `/trends/${detail.slug}`,
        page_name: `Trend Detail: ${detail.topic}`,
        page_purpose: `Evidence-based historical analysis, source breakdown, sentiment diagnostics, and ML forecasting for ${detail.topic}.`,
        filters: {
          topic: detail.topic,
          history_days: `${historyDays}d`,
          forecast_horizon: `${forecastHorizon}d`,
        },
        metrics: {
          topic_name: detail.topic,
          current_weekly_mentions: detail.overview.current_weekly_mentions,
          growth_pct: detail.overview.growth_pct !== null ? `${detail.overview.growth_pct}%` : "N/A",
          momentum: detail.overview.momentum,
          total_engagement: detail.overview.total_engagement,
          positive_sentiment_pct: `${detail.sentiment.positive_pct}%`,
          negative_sentiment_pct: `${detail.sentiment.negative_pct}%`,
          youtube_share_pct: `${detail.source_breakdown.youtube.percentage}%`,
          gdelt_share_pct: `${detail.source_breakdown.gdelt.percentage}%`,
        },
        selected_item: {
          topic: detail.topic,
          category: detail.category,
          strategic_summary: detail.strategic_context.evidence_summary,
          strive_importance: detail.strategic_context.strive_importance,
        },
        key_records: detail.supporting_records.slice(0, 5).map((r) => ({
          title: r.title,
          source: r.source,
          sentiment: r.sentiment,
          url: r.url,
        })),
      });
    }
  }, [detail, historyDays, forecastHorizon, updatePageContext]);

  // Build Chronological Historical + ML Forecast Series for Recharts
  const { chartForecastData, cutoffDisplayDate } = useMemo(() => {
    if (!detail || !detail.forecast) return { chartForecastData: [], cutoffDisplayDate: null };

    const histSlice = (detail.forecast.historical_points || []).slice(-28);
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
      };
    });

    let cutoffLabel: string | null = null;

    if (hist.length > 0 && (detail.forecast.forecast_points || []).length > 0) {
      const lastHist = hist[hist.length - 1];
      cutoffLabel = lastHist.displayDate;
      lastHist.forecast = lastHist.historical;
      lastHist.lower_80 = lastHist.historical;
      lastHist.upper_80 = lastHist.historical;
    }

    const fc = (detail.forecast.forecast_points || []).map((p) => {
      const dt = new Date(p.date + "T00:00:00");
      const displayDate = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: p.date,
        displayDate,
        historical: null as number | null,
        forecast: p.predicted,
        lower_80: p.lower_80,
        upper_80: p.upper_80,
      };
    });

    return {
      chartForecastData: [...hist, ...fc],
      cutoffDisplayDate: cutoffLabel,
    };
  }, [detail]);

  // Dynamic Plain-English Forecast Summary based on actual figures
  const forecastExplanation = useMemo(() => {
    if (!detail?.forecast || !detail.forecast.forecast_points?.length) {
      return {
        headline: "Forecast projection unavailable",
        details: "Collecting chronological daily observations to fit statistical smoothing models.",
        direction: "neutral" as const,
      };
    }

    const fc = detail.forecast.forecast_points;
    const firstVal = fc[0]?.predicted || 1;
    const endVal = fc[fc.length - 1]?.predicted || 1;
    const diffPct = Math.round(((endVal - firstVal) / Math.max(1, firstVal)) * 100);

    const firstRange = Math.round(((fc[0]?.upper_80 || 0) - (fc[0]?.lower_80 || 0)) / 2);
    const endRange = Math.round(((fc[fc.length - 1]?.upper_80 || 0) - (fc[fc.length - 1]?.lower_80 || 0)) / 2);

    let directionText = "remain roughly stable";
    let direction: "rising" | "declining" | "neutral" = "neutral";

    if (diffPct >= 6) {
      directionText = `rise by approximately ${diffPct}%`;
      direction = "rising";
    } else if (diffPct <= -6) {
      directionText = `ease by approximately ${Math.abs(diffPct)}%`;
      direction = "declining";
    }

    return {
      headline: `Activity is projected to ${directionText} over the next ${forecastHorizon} days.`,
      details: `Projected daily volume moves from ~${firstVal} to ~${endVal} mentions. Prediction intervals widen further into the future (confidence band widens from ±${firstRange} to ±${endRange} mentions/day).`,
      direction,
    };
  }, [detail, forecastHorizon]);

  // Loading State
  if (loading && !detail) {
    return (
      <>
        <Topbar pageTitle="Insights & Trends / Loading..." />
        <main className="pt-20 px-4 sm:px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0067A5]" />
          <p className="mt-3 text-xs text-[#666666]">
            Retrieving evidence-based topic analytics and historical telemetry...
          </p>
        </main>
      </>
    );
  }

  // Not Found State (Useful error handling for invalid topic slugs)
  if (isNotFound || (!loading && !detail)) {
    return (
      <>
        <Topbar pageTitle="Insights & Trends / Topic Not Found" />
        <main className="pt-20 px-4 sm:px-6 md:px-8 pb-16 max-w-4xl mx-auto w-full space-y-6">
          <Link
            href="/trends"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0067A5] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Trends</span>
          </Link>

          <div className="p-8 rounded-xl bg-white border border-[#E5E7EB] text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#252525]">Topic Not Found</h1>
              <p className="text-xs text-[#666666] mt-1 max-w-md mx-auto">
                No active tracking category matching &ldquo;{topicParam}&rdquo; was found in the Tata STRIVE taxonomy storage.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-xs font-semibold text-[#252525] block mb-2">Available Categories:</span>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {Object.entries(TOPIC_SLUG_MAP).map(([slug, name]) => (
                  <Link
                    key={slug}
                    href={`/trends/${slug}`}
                    className="px-3 py-1.5 rounded-lg bg-[#F5F7F9] hover:bg-[#DCEFF7] hover:text-[#0067A5] text-xs font-medium text-[#252525] border border-[#E5E7EB] transition-colors"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const topicColor = TOPIC_COLORS[detail!.topic] || "#0067A5";
  const hasValidGrowth = detail!.overview.growth_pct !== null;
  const isRising = detail!.overview.momentum === "rising";
  const isDeclining = detail!.overview.momentum === "declining";

  return (
    <>
      <Topbar pageTitle={`Insights & Trends / ${detail!.topic}`} lastUpdated={`Updated ${detail!.overview.latest_date}`} />

      <main className="pt-18 px-4 sm:px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-7">
        {/* Navigation Breadcrumb & Back Link */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/trends"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0067A5] hover:underline cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Trends</span>
          </Link>

          <button
            type="button"
            onClick={() => router.push(`/studio?topic=${encodeURIComponent(detail!.topic)}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A5] hover:bg-[#005588] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Use this trend in Content Studio</span>
          </button>
        </div>

        {/* SECTION A: Topic Overview Header & KPI Summary */}
        <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-[#E5E7EB] pb-4">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: topicColor }} />
                <span className="text-[11px] font-bold text-[#0067A5] uppercase tracking-wider bg-[#DCEFF7] px-2 py-0.5 rounded">
                  {detail!.category}
                </span>
                <span className="text-xs text-[#666666]">·</span>
                <span className="text-xs font-medium text-[#666666] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {detail!.overview.data_freshness}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#252525]">
                {detail!.topic}
              </h1>
              <p className="text-xs text-[#666666] leading-relaxed">
                {detail!.description}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
              {isRising ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  Rising Momentum
                </span>
              ) : isDeclining ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200 inline-flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                  Declining Volume
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                  Stable Activity
                </span>
              )}
            </div>
          </div>

          {/* KPI Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#666666] block font-medium">7-Day Mentions</span>
              <span className="text-xl font-bold text-[#252525] tabular-nums">
                {detail!.overview.current_weekly_mentions}
              </span>
              <span className="text-[10px] text-[#666666] block mt-0.5">
                Prev 7d: {detail!.overview.prev_weekly_mentions}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#666666] block font-medium">7-Day Growth Rate</span>
              <span className="text-xl font-bold tabular-nums">
                {!hasValidGrowth ? (
                  <span className="text-xs text-[#666666] font-medium">Insufficient history</span>
                ) : isRising ? (
                  <span className="text-emerald-700">+{detail!.overview.growth_pct}%</span>
                ) : isDeclining ? (
                  <span className="text-red-700">{detail!.overview.growth_pct}%</span>
                ) : (
                  <span className="text-slate-700">
                    {detail!.overview.growth_pct! >= 0 ? `+${detail!.overview.growth_pct}%` : `${detail!.overview.growth_pct}%`}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-[#666666] block mt-0.5">
                Rule: &ge;15% Rising, &le;-15% Declining
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#666666] block font-medium">Total Engagement</span>
              <span className="text-xl font-bold text-[#0067A5] tabular-nums">
                {detail!.overview.total_engagement.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#666666] block mt-0.5">
                Views, likes &amp; candidate replies
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#666666] block font-medium">Historical Breadth</span>
              <span className="text-xl font-bold text-[#252525] tabular-nums">
                {detail!.overview.data_points_count} Days
              </span>
              <span className="text-[10px] text-[#666666] block mt-0.5">
                Verified daily chronological series
              </span>
            </div>
          </div>
        </section>

        {/* SECTION B: Historical Activity & Time Series Chart */}
        <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#252525] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#0067A5]" />
                Historical Activity &amp; Mention Volume
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Continuous daily observations recorded across configured sources.
              </p>
            </div>

            {/* Time Window Buttons */}
            <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-[#F5F7F9] p-0.5 text-xs">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setHistoryDays(d as any)}
                  className={`px-3 py-1 rounded font-semibold transition-all cursor-pointer ${
                    historyDays === d
                      ? "bg-[#0067A5] text-white shadow-2xs"
                      : "text-[#666666] hover:text-[#252525]"
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full pt-1">
            {detail!.historical_series.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#666666]">
                No historical observations available for this time window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detail!.historical_series} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#666666" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d: string) => {
                      const dt = new Date(d + "T00:00:00");
                      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                    minTickGap={25}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#666666" }}
                    axisLine={false}
                    tickLine={false}
                    unit="m"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const p = payload[0]?.payload;
                      if (!p) return null;

                      return (
                        <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EB] shadow-md text-xs space-y-1">
                          <div className="font-bold text-[#252525] border-b border-[#E5E7EB] pb-1">
                            {p.date}
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#0067A5]">
                            <span className="font-medium">Total Mentions:</span>
                            <span className="font-bold tabular-nums">{p.mentions}</span>
                          </div>
                          <div className="text-[10px] text-[#666666] pt-0.5 space-y-0.5 border-t border-[#E5E7EB]">
                            <div>YouTube: {p.youtube_count} · GDELT News: {p.gdelt_count}</div>
                            <div>Engagement: {p.engagement?.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mentions"
                    stroke={topicColor}
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    name="Daily Mentions"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[11px] text-[#666666] pt-1 border-t border-[#E5E7EB] flex items-center justify-between">
            <span>Metric: Daily unique verified mentions across YouTube and news publications.</span>
            <span>Window: Last {historyDays} calendar days</span>
          </div>
        </section>

        {/* SECTION C & D: Source Breakdown & Sentiment Analysis (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section C: Source Breakdown */}
          <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="border-b border-[#E5E7EB] pb-2.5">
              <h2 className="text-base font-bold text-[#252525] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0067A5]" />
                Source Distribution &amp; Coverage
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Proportionate distribution of signals across monitored data providers.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#252525] flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-red-600" />
                    YouTube Data API v3
                  </span>
                  <span className="font-bold tabular-nums text-[#252525]">
                    {detail!.source_breakdown.youtube.count} mentions ({detail!.source_breakdown.youtube.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    style={{ width: `${detail!.source_breakdown.youtube.percentage}%` }}
                    className="h-full bg-red-500 rounded-full"
                  />
                </div>
                <p className="text-[11px] text-[#666666] leading-tight">
                  {detail!.source_breakdown.youtube.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#252525] flex items-center gap-1.5">
                    <Newspaper className="w-3.5 h-3.5 text-amber-700" />
                    GDELT DOC 2.0 News
                  </span>
                  <span className="font-bold tabular-nums text-[#252525]">
                    {detail!.source_breakdown.gdelt.count} articles ({detail!.source_breakdown.gdelt.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    style={{ width: `${detail!.source_breakdown.gdelt.percentage}%` }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
                <p className="text-[11px] text-[#666666] leading-tight">
                  {detail!.source_breakdown.gdelt.description}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[11px] text-[#666666] space-y-1">
                <span className="font-bold text-[#252525] block">Counting Rule Definition:</span>
                <p>
                  YouTube counts represent video uploads and candidate comments. GDELT counts reflect distinct deduplicated online journalism publications matching topic taxonomy rules.
                </p>
              </div>
            </div>
          </section>

          {/* Section D: Sentiment Analysis */}
          <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="border-b border-[#E5E7EB] pb-2.5">
              <h2 className="text-base font-bold text-[#252525] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0067A5]" />
                Audience Sentiment &amp; Candidate Experience
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Sentiment classification across analyzed candidate feedback and public comments.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700">{detail!.sentiment.positive_pct}% Positive</span>
                  <span className="text-slate-600">{detail!.sentiment.neutral_pct}% Neutral</span>
                  <span className="text-red-700">{detail!.sentiment.negative_pct}% Negative</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
                  <div style={{ width: `${detail!.sentiment.positive_pct}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${detail!.sentiment.neutral_pct}%` }} className="bg-slate-400" />
                  <div style={{ width: `${detail!.sentiment.negative_pct}%` }} className="bg-red-500" />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[11px] text-[#666666] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#252525]">Model: {detail!.sentiment.model_name}</span>
                  <span className="font-semibold text-[#0067A5]">{detail!.sentiment.total_records_analyzed} records analyzed</span>
                </div>
                <p className="leading-relaxed">
                  {detail!.sentiment.model_limitations}
                </p>
              </div>

              {/* Sample Excerpts */}
              {detail!.sentiment.sample_excerpts.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-[#252525] block">Representative Excerpts:</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {detail!.sentiment.sample_excerpts.slice(0, 3).map((ex, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#252525]">{ex.author || "Learner"}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              ex.sentiment === "positive"
                                ? "bg-emerald-100 text-emerald-800"
                                : ex.sentiment === "negative"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {ex.sentiment}
                          </span>
                        </div>
                        <p className="text-[#666666] italic">&ldquo;{ex.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* SECTION E: Trend Forecast for this Topic */}
        <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#252525] flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#0067A5]" />
                Trend Forecast &amp; Statistical Projection
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Holt-Winters Exponential Smoothing fitted to historical observations with 80% prediction intervals.
              </p>
            </div>

            {/* Horizon Selector */}
            <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-[#F5F7F9] p-0.5 text-xs">
              {[30, 60, 90].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setForecastHorizon(h as any)}
                  className={`px-3 py-1 rounded font-semibold transition-all cursor-pointer ${
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

          {/* Forecast Chart */}
          <div className="h-68 w-full pt-1">
            {chartForecastData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#666666]">
                Forecast model training in progress...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartForecastData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 9, fill: "#666666" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#666666" }}
                    axisLine={false}
                    tickLine={false}
                    unit="m"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0]?.payload;
                      if (!item) return null;

                      return (
                        <div className="bg-white p-2.5 rounded-lg border border-[#E5E7EB] shadow-md text-xs space-y-1">
                          <div className="font-bold text-[#252525] border-b border-[#E5E7EB] pb-1">
                            {item.displayDate} ({item.date})
                          </div>
                          {item.historical !== null && (
                            <div className="flex items-center justify-between gap-4 text-[#0067A5]">
                              <span className="font-medium">Observed Ground Truth:</span>
                              <strong className="tabular-nums font-bold">{item.historical} mentions</strong>
                            </div>
                          )}
                          {item.forecast !== null && item.historical === null && (
                            <>
                              <div className="flex items-center justify-between gap-4 text-[#008FD3]">
                                <span className="font-medium">Statistical Forecast:</span>
                                <strong className="tabular-nums font-bold">{item.forecast} mentions</strong>
                              </div>
                              {item.lower_80 !== null && item.upper_80 !== null && (
                                <div className="text-[10px] text-[#666666] pt-0.5">
                                  80% Prediction Range: [{item.lower_80} – {item.upper_80}]
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} verticalAlign="bottom" />

                  <Area
                    type="monotone"
                    dataKey="upper_80"
                    stroke="none"
                    fill="#DCEFF7"
                    fillOpacity={0.6}
                    name="80% Prediction Interval Band"
                  />

                  {cutoffDisplayDate && (
                    <ReferenceLine
                      x={cutoffDisplayDate}
                      stroke="#94A3B8"
                      strokeDasharray="3 3"
                      label={{
                        value: "Forecast begins",
                        position: "insideTopLeft",
                        fill: "#475569",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke="#0067A5"
                    strokeWidth={2.5}
                    dot={false}
                    name="Observed History"
                  />

                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#008FD3"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 2 }}
                    name="Statistical Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Plain-English Explanation Box */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#252525]">{forecastExplanation.headline}</span>
                {forecastExplanation.direction === "rising" && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Projected Growth
                  </span>
                )}
                {forecastExplanation.direction === "declining" && (
                  <span className="text-[10px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Projected Decline
                  </span>
                )}
              </div>
              <p className="text-[#666666] text-[11px] leading-relaxed">{forecastExplanation.details}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/studio?topic=${encodeURIComponent(detail!.topic)}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0067A5] hover:bg-[#005588] text-white font-semibold text-xs transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Use in Content Studio</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Collapsible Model Details */}
          <details className="group border border-[#E5E7EB] rounded-xl bg-white overflow-hidden text-xs">
            <summary className="flex items-center justify-between p-3 cursor-pointer font-semibold text-[#252525] hover:bg-gray-50 transition-colors">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0067A5]" />
                Model details &amp; evaluation metrics
              </span>
              <ChevronDown className="w-4 h-4 text-[#666666] group-open:rotate-180 transition-transform" />
            </summary>

            <div className="p-3.5 pt-1 border-t border-[#E5E7EB] bg-[#F8FAFC]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#666666] block font-medium">Holdout MAE</span>
                  <span className="text-xs font-bold text-[#252525] tabular-nums">
                    {detail?.forecast?.evaluation?.mae !== undefined
                      ? `${detail.forecast.evaluation.mae} mentions/day`
                      : "Evaluation unavailable"}
                  </span>
                  <span className="text-[9px] text-[#666666] block mt-0.5">
                    Mean absolute error during out-of-sample holdout validation
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#666666] block font-medium">sMAPE Error</span>
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    {detail?.forecast?.evaluation?.smape_pct !== undefined
                      ? `${detail.forecast.evaluation.smape_pct}%`
                      : "Evaluation unavailable"}
                  </span>
                  <span className="text-[9px] text-[#666666] block mt-0.5">
                    Symmetric mean percentage error normalized between 0-100%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#666666] block font-medium">Baseline Benchmark</span>
                  <span className="text-xs font-bold text-[#0067A5]">
                    {detail?.forecast?.evaluation?.relative_improvement_pct !== undefined
                      ? `${detail.forecast.evaluation.relative_improvement_pct}% vs seasonal-naive`
                      : "Evaluation unavailable"}
                  </span>
                  <span className="text-[9px] text-[#666666] block mt-0.5">
                    Accuracy gain against naive persistence baseline
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
                  <span className="text-[10px] text-[#666666] block font-medium">Training Cutoff</span>
                  <span className="text-xs font-bold text-[#252525]">
                    {detail?.forecast?.training_cutoff_date || "Live"}
                  </span>
                  <span className="text-[9px] text-[#666666] block mt-0.5">
                    Model: {detail?.forecast?.model_name || "Holt-Winters"} ({detail?.forecast?.model_version || "v1.2"})
                  </span>
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* SECTION F: Supporting Records & Verified Evidence */}
        <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#252525] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0067A5]" />
                Supporting Records &amp; Verified Evidence
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Authentic articles, video streams, and student reviews associated with this topic.
              </p>
            </div>
            <Link
              href={`/feed?topic=${encodeURIComponent(detail!.topic)}`}
              className="text-xs font-semibold text-[#0067A5] hover:underline inline-flex items-center gap-1"
            >
              <span>View all in Social Listening Feed</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden">
            {detail!.supporting_records.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#666666]">
                No supporting records currently cataloged for this topic.
              </div>
            ) : (
              detail!.supporting_records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 sm:px-4 hover:bg-[#F8FAFC] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#0067A5] bg-[#DCEFF7] px-2 py-0.5 rounded">
                        {rec.source}
                      </span>
                      {rec.author && (
                        <span className="text-[11px] text-[#666666] flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-[#666666]" />
                          {rec.author}
                        </span>
                      )}
                      <span className="text-[#CBD5E1]">·</span>
                      <span className="text-[11px] text-[#666666]">{rec.published_at}</span>
                    </div>

                    <h3 className="font-semibold text-[#252525] text-xs sm:text-sm">
                      {rec.title}
                    </h3>

                    {rec.excerpt && (
                      <p className="text-[11px] text-[#666666] line-clamp-2 leading-relaxed">
                        {rec.excerpt}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                    <div className="text-right text-[11px] text-[#666666]">
                      <span className="font-semibold text-[#252525] block">
                        {rec.engagement.toLocaleString()}
                      </span>
                      <span>engagement</span>
                    </div>

                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F7F9] hover:bg-[#DCEFF7] hover:text-[#0067A5] border border-[#E5E7EB] text-[#252525] font-semibold text-xs transition-colors"
                        title="Open original record in new tab"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION G: Contextual AI Interpretation for Tata STRIVE */}
        <section className="bg-gradient-to-br from-white via-white to-[#DCEFF7]/20 rounded-xl p-5 border border-[#008FD3]/30 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#252525] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0067A5]" />
                Tata STRIVE Strategic Interpretation
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Actionable curriculum and communication intelligence based on topic telemetry.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/studio?topic=${encodeURIComponent(detail!.topic)}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0067A5] hover:bg-[#005588] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <span>Create Campaign for this Trend</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-1">
              <span className="font-bold text-[#0067A5] block">1. What the Available Evidence Indicates</span>
              <p className="text-[#666666] leading-relaxed text-[11px]">
                {detail!.strategic_context.evidence_summary}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-1">
              <span className="font-bold text-[#0067A5] block">2. Why It Matters to Tata STRIVE</span>
              <p className="text-[#666666] leading-relaxed text-[11px]">
                {detail!.strategic_context.strive_importance}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-1">
              <span className="font-bold text-[#0067A5] block">3. Key Uncertainties &amp; Caveats</span>
              <p className="text-[#666666] leading-relaxed text-[11px]">
                {detail!.strategic_context.uncertainties}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-1">
              <span className="font-bold text-[#0067A5] block">4. What to Investigate Next</span>
              <p className="text-[#666666] leading-relaxed text-[11px]">
                {detail!.strategic_context.recommended_next_steps}
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function TopicDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#666666]">Loading topic details...</div>}>
      <TopicDetailContent />
    </Suspense>
  );
}
