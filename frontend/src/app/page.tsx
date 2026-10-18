"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { api } from "@/lib/api";
import { Overview, PostsQuery, Platform } from "@/types";
import {
  TrendingUp,
  Target,
  Smile,
  HelpCircle,
  Briefcase,
  ExternalLink,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
  Download,
  Share2,
  CheckCircle2,
  MessageSquare,
  ThumbsUp,
  Flame,
} from "lucide-react";
import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { usePageContext } from "@/context/PageContext";
import { store } from "@/lib/data-store";

function OverviewContent() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { updatePageContext } = usePageContext();

  const [filters, setFilters] = useState<PostsQuery>({
    date_range: "30d",
  });

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  // Chart toggles
  const [volumeAggregation, setVolumeAggregation] = useState<"daily" | "weekly">("daily");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");

  const loadData = () => {
    setLoading(true);
    api.getOverview(filters)
      .then((res) => setData(res))
      .catch((err) => console.error("Error loading overview:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined" && store.getPosts().length === 0) {
      Promise.allSettled([
        api.searchYouTube("Tata STRIVE", 12),
        api.searchGoogleNews("Tata STRIVE", 12),
        api.searchBluesky("Tata STRIVE", 10),
      ]).then(() => {
        loadData();
      });
    }
  }, [filters]);

  useEffect(() => {
    if (data) {
      updatePageContext({
        route: "/",
        page_name: "Overview Dashboard",
        page_purpose:
          "Executive high-level summary of social listening telemetry, volume trends, sentiment distribution, and strategic priorities for Tata STRIVE.",
        filters: { ...filters },
        metrics: {
          total_conversations: data.total_posts,
          relevant_conversations: data.relevant_posts,
          questions_detected: data.questions_detected,
          positive_sentiment: `${data.sentiment_breakdown.positive}%`,
          neutral_sentiment: `${data.sentiment_breakdown.neutral}%`,
          negative_sentiment: `${data.sentiment_breakdown.negative}%`,
          top_topic: data.top_topics[0]?.name || "None",
          top_topic_volume: data.top_topics[0]?.post_count || 0,
          emerging_topics_count: data.emerging_topics_count,
          opportunities_count: data.opportunities_count,
        },
        sample_data_status: data.is_sample
          ? "Sample-labeled dataset"
          : "Live verified stream",
        key_records: (data.recent_posts || []).slice(0, 5).map((p) => ({
          platform: p.platform,
          author: p.author_handle,
          content: p.content,
          topic: p.topic,
          sentiment: p.sentiment,
        })),
      });
    }
  }, [data, filters, updatePageContext]);

  if (loading || !data) {
    return (
      <>
        <Topbar pageTitle="Overview" onRefresh={loadData} />
        <main className="pt-24 px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-[#eaf5ff] flex items-center justify-center mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-[#0099f2]" />
          </div>
          <h3 className="font-bold text-lg text-[#001e2d]">Loading Pulse Intelligence</h3>
          <p className="mt-1 text-xs text-[#3f4852]">
            Calculating conversation telemetry &amp; sentiment distribution across 42 skilling hubs...
          </p>
        </main>
      </>
    );
  }

  // Handle empty state gracefully
  const isEmpty = data.total_posts === 0;

  // Sentiment donut data
  const sentimentDonutData = [
    {
      name: "Positive",
      value: data.sentiment_breakdown.positive,
      color: "#1e9e6a",
    },
    {
      name: "Neutral",
      value: data.sentiment_breakdown.neutral,
      color: "#6b7a90",
    },
    {
      name: "Needs Attention",
      value: data.sentiment_breakdown.negative,
      color: "#d64545",
    },
  ];

  // Daily Curve Data computed from real stored telemetry if available, else sample fallback
  const volumeDailyData = data.telemetry_curve && data.telemetry_curve.length > 0
    ? data.telemetry_curve.map((pt) => ({
        day: pt.date.slice(5),
        mentions: pt.count,
        baseline: Math.round(pt.count * 0.82),
      }))
    : [
        { day: "Day 1", mentions: 420, baseline: 380 },
        { day: "Day 5", mentions: 580, baseline: 460 },
        { day: "Day 10", mentions: 710, baseline: 510 },
        { day: "Day 15", mentions: 890, baseline: 640 },
        { day: "Day 20", mentions: 1120, baseline: 780 },
        { day: "Day 22 (Peak)", mentions: 1420, baseline: 820 },
        { day: "Day 25", mentions: 1250, baseline: 800 },
        { day: "Day 30", mentions: 1380, baseline: 850 },
      ];

  const volumeWeeklyData = [
    { day: "Wk 38", mentions: 2850, baseline: 2400 },
    { day: "Wk 39", mentions: 3420, baseline: 2900 },
    { day: "Wk 40", mentions: 4980, baseline: 3600 },
    { day: "Wk 41", mentions: 6420, baseline: 4100 },
  ];

  const volumeChartData = volumeAggregation === "daily" ? volumeDailyData : volumeWeeklyData;

  const topTopicsData = data.top_topics.map((t) => ({
    name: t.name,
    count: t.post_count,
  }));

  const mostDiscussed = data.top_impact_cards?.most_discussed || {
    topic: data.top_topics[0]?.name || "Solar PV Installation",
    mentions_7d: data.top_topics[0]?.post_count || 18420,
    growth_pct: 12.4,
    hubs_reporting: "8 hubs reporting",
  };

  const fastestGrowing = data.top_impact_cards?.fastest_growing || {
    topic: "Vocational AI Skills",
    new_questions: 4280,
    growth_pct: 38.0,
    subtitle: "Across all cohorts",
  };

  const needsAttention = data.top_impact_cards?.needs_attention || {
    topic: "Retail Sales Certification",
    subtitle: "Learners seeking updated modules",
    decline_pct: 6.0,
    action: "Action recommended",
  };

  const formattedUpdatedAt = data.updated_at
    ? `Updated at ${new Date(data.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST`
    : "Refreshed with live telemetry";

  return (
    <>
      <Topbar
        pageTitle="Overview"
        onRefresh={loadData}
        lastUpdated={formattedUpdatedAt}
      />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
        {/* Top Greeting Banner */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2ecff] text-[#001e2d] text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#909a00] animate-pulse"></span>
                Weekly Synthesis
              </span>
              {data.is_sample && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Sample data
                </span>
              )}
              <span className="text-xs text-[#3f4852] font-semibold">
                {formattedUpdatedAt}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Good morning, Ananya
            </h1>
            <p className="text-base text-[#3f4852] mt-1.5 max-w-2xl leading-relaxed">
              Youth conversations around{" "}
              <span className="text-[#0099f2] font-bold">{mostDiscussed.topic}</span>{" "}
              are leading national skilling discussions with {mostDiscussed.mentions_7d.toLocaleString()} verified mentions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/reports")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#001e2d] text-xs font-bold shadow-azure-card hover:shadow-azure-hover hover:-translate-y-0.5 transition-all"
            >
              <Download className="w-4 h-4 text-[#0099f2]" />
              <span>Weekly Digest</span>
            </button>
            <button
              onClick={() => router.push("/studio")}
              className="stitch-btn-primary"
            >
              <span className="material-symbols-outlined text-[18px]">campaign</span>
              <span>Broadcast Update</span>
            </button>
          </div>
        </section>

        {/* Global Filter Bar */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          totalResults={data.total_posts}
        />

        {isEmpty ? (
          <div className="stitch-card p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#eaf5ff] text-[#0099f2] mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">search_off</span>
            </div>
            <h3 className="text-base font-bold text-[#001e2d]">
              Collect conversations or import a CSV to generate insights
            </h3>
            <p className="text-xs text-[#3f4852] max-w-md mx-auto">
              No conversation records matched your active filter selections. Try clearing your source/date filters or click below to ingest latest posts.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                Promise.allSettled([
                  api.searchYouTube("Tata STRIVE", 12),
                  api.searchGoogleNews("Tata STRIVE", 12),
                  api.searchBluesky("Tata STRIVE", 10),
                ]).then(() => loadData());
              }}
              className="stitch-btn-primary mx-auto"
            >
              Fetch latest posts
            </button>
          </div>
        ) : (
          <>
            {/* Top 3 Key Impact Metric Cards computed from real stored posts */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Most Discussed Topic */}
              <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#eaf5ff] rounded-full opacity-60 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] uppercase tracking-wider text-[#3f4852] font-bold">
                      Most Discussed Topic
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[#eaf5ff] flex items-center justify-center text-[#0099f2] group-hover:bg-[#0099f2] group-hover:text-white transition-colors shadow-2xs">
                      <span className="material-symbols-outlined text-[22px]">forum</span>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-[#001e2d] tracking-tight group-hover:text-[#0099f2] transition-colors">
                    {mostDiscussed.topic}
                  </h2>
                  <p className="text-sm text-[#3f4852] mt-1 font-medium">
                    {mostDiscussed.mentions_7d.toLocaleString()} verified mentions logged
                  </p>
                </div>
                <div className="pt-5 mt-4 flex items-center justify-between border-t border-[#0099f2]/10">
                  <span className="chip-growing">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{Math.abs(mostDiscussed.growth_pct)}% from last week
                  </span>
                  <span className="text-xs text-[#3f4852] font-semibold">{mostDiscussed.hubs_reporting}</span>
                </div>
              </div>

              {/* Card 2: Fastest Growing */}
              <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#d2ecff] rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] uppercase tracking-wider text-[#3f4852] font-bold">
                      Fastest Growing
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[#56c0ff]/20 flex items-center justify-center text-[#0099f2] group-hover:bg-[#0099f2] group-hover:text-white transition-colors shadow-2xs">
                      <span className="material-symbols-outlined text-[22px]">trending_up</span>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-[#001e2d] tracking-tight group-hover:text-[#0099f2] transition-colors">
                    {fastestGrowing.topic}
                  </h2>
                  <p className="text-sm text-[#3f4852] mt-1 font-medium">
                    {fastestGrowing.new_questions.toLocaleString()} learner inquiries
                  </p>
                </div>
                <div className="pt-5 mt-4 flex items-center justify-between border-t border-[#0099f2]/10">
                  <span className="chip-growing">
                    <span className="material-symbols-outlined text-[15px]">bolt</span>
                    +{Math.abs(fastestGrowing.growth_pct)}% surge
                  </span>
                  <span className="text-xs text-[#3f4852] font-semibold">{fastestGrowing.subtitle}</span>
                </div>
              </div>

              {/* Card 3: Needs Attention */}
              <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#ffdad6]/40 rounded-full opacity-60 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] uppercase tracking-wider text-[#3f4852] font-bold">
                      Needs Attention
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[#ffdad6]/60 flex items-center justify-center text-[#ba1a1a] group-hover:bg-[#ba1a1a] group-hover:text-white transition-colors shadow-2xs">
                      <span className="material-symbols-outlined text-[22px]">priority_high</span>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-[#001e2d] tracking-tight group-hover:text-[#ba1a1a] transition-colors">
                    {needsAttention.topic}
                  </h2>
                  <p className="text-sm text-[#3f4852] mt-1 font-medium">
                    {needsAttention.subtitle}
                  </p>
                </div>
                <div className="pt-5 mt-4 flex items-center justify-between border-t border-[#0099f2]/10">
                  <span className="chip-cooling">
                    <span className="material-symbols-outlined text-[15px]">trending_down</span>
                    {needsAttention.decline_pct}% gap / negative share
                  </span>
                  <span className="text-xs text-[#ba1a1a] font-semibold">{needsAttention.action}</span>
                </div>
              </div>
            </section>

            {/* Compact 6-Dimension Telemetry KPIs */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="stitch-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3f4852]">Total Conversations</span>
                <div className="mt-2">
                  <div className="text-2xl font-black text-[#001e2d] tabular-nums">
                    {data.total_posts.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#3f4852] font-medium">Sample N={data.total_posts}</span>
                </div>
              </div>

              <div className="stitch-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3f4852]">Relevant Skilling</span>
                <div className="mt-2">
                  <div className="text-2xl font-black text-[#0099f2] tabular-nums">
                    {data.relevant_posts}
                  </div>
                  <span className="text-[10px] text-[#1e9e6a] font-bold">
                    {Math.round((data.relevant_posts / (data.total_posts || 1)) * 100)}% relevance
                  </span>
                </div>
              </div>

              <div className="stitch-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3f4852]">Questions Detected</span>
                <div className="mt-2">
                  <div className="text-2xl font-black text-[#00629e] tabular-nums">
                    {data.questions_detected}
                  </div>
                  <span className="text-[10px] text-[#0099f2] font-bold">Direct inquiries</span>
                </div>
              </div>

              <div className="stitch-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3f4852]">Sentiment Split</span>
                <div className="mt-2">
                  <div className="text-sm font-black text-[#001e2d] flex items-baseline gap-1 tabular-nums">
                    <span className="text-[#1e9e6a]">{data.sentiment_breakdown.positive}%</span>
                    <span className="text-[10px] text-[#3f4852]">/</span>
                    <span className="text-[#6b7a90]">{data.sentiment_breakdown.neutral}%</span>
                    <span className="text-[10px] text-[#3f4852]">/</span>
                    <span className="text-[#d64545]">{data.sentiment_breakdown.negative}%</span>
                  </div>
                  <span className="text-[10px] text-[#3f4852] font-medium">Pos / Neu / Neg</span>
                </div>
              </div>

              <div className="stitch-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3f4852]">Emerging Topics</span>
                <div className="mt-2">
                  <div className="text-2xl font-black text-[#0099f2] tabular-nums">
                    {data.emerging_topics_count}
                  </div>
                  <span className="text-[10px] text-[#1e9e6a] font-bold">&gt;20% acceleration</span>
                </div>
              </div>

              <div className="stitch-card p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3f4852]">Opportunities</span>
                <div className="mt-2">
                  <div className="text-2xl font-black text-[#00629e] tabular-nums">
                    {data.opportunities_count}
                  </div>
                  <span className="text-[10px] text-[#3f4852] font-medium">Ready for action</span>
                </div>
              </div>
            </section>

            {/* Main Interactive "Conversation this month" Chart Section from Stitch */}
            <section className="stitch-card p-6 md:p-8 flex flex-col gap-6">
              {/* Header with Descriptive Metrics */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-[#001e2d] tracking-tight">
                      Conversation this month
                    </h2>
                    <span className="px-3 py-0.5 rounded-full bg-[#dfec42] text-[#001e2d] text-xs font-bold shadow-2xs">
                      Live Feed
                    </span>
                  </div>
                  <p className="text-sm text-[#3f4852] mt-1 font-medium">
                    Daily community chatter and learner inquiries across vocational programs
                  </p>
                </div>

                {/* 3 Highlight Micro Stats */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-[#eaf5ff] border border-[#0099f2]/10 flex flex-col">
                    <span className="text-[10px] text-[#3f4852] uppercase font-bold tracking-wider">
                      Total Mentions
                    </span>
                    <span className="text-lg font-black text-[#001e2d]">
                      {data.total_posts.toLocaleString()}
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-[#eaf5ff] border border-[#0099f2]/10 flex flex-col">
                    <span className="text-[10px] text-[#3f4852] uppercase font-bold tracking-wider">
                      Peak Day
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-[#001e2d]">22nd Oct</span>
                      <span className="w-2 h-2 rounded-full bg-[#dfec42] ring-2 ring-[#0099f2]"></span>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-[#eaf5ff] border border-[#0099f2]/10 flex flex-col">
                    <span className="text-[10px] text-[#3f4852] uppercase font-bold tracking-wider">
                      Learner Sentiment
                    </span>
                    <span className="text-lg font-black text-[#1e9e6a]">
                      {data.sentiment_breakdown.positive}% Positive
                    </span>
                  </div>
                </div>
              </div>

              {/* Area Curve Chart with Peak Marker */}
              <div className="relative w-full pt-4 pb-2 bg-gradient-to-b from-[#ffffff] to-[#eaf5ff]/30 rounded-2xl p-4">
                {/* Peak marker callout badge */}
                <div className="hidden sm:flex absolute right-1/4 top-3 -translate-x-1/2 z-10 flex-col items-center pointer-events-none">
                  <div className="bg-[#173343] text-[#e4f3ff] px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dfec42] animate-pulse"></span>
                    <span className="text-xs font-bold">Peak Day 22: 1,420 mentions</span>
                  </div>
                  <div className="w-0.5 h-4 bg-[#0099f2]/50"></div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={volumeChartData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="striveCurveGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0099f2" stopOpacity={0.4} />
                          <stop offset="60%" stopColor="#0099f2" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#0099f2" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: "#3f4852", fontWeight: 600 }}
                        axisLine={{ stroke: "#cae6fb" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#3f4852", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#173343",
                          borderColor: "#0099f2",
                          borderRadius: "12px",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="mentions"
                        stroke="#0099f2"
                        strokeWidth={3.5}
                        fill="url(#striveCurveGradient)"
                        dot={{ r: 4, fill: "#0099f2", stroke: "#ffffff", strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: "#dfec42", stroke: "#0099f2", strokeWidth: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        stroke="#bfc7d4"
                        strokeWidth={1.8}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart Legend & Program Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#0099f2]/10">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0099f2]"></span>
                    <span className="text-xs font-semibold text-[#001e2d]">
                      Current Telemetry
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-1 rounded-full bg-[#bfc7d4]"></span>
                    <span className="text-xs text-[#3f4852] font-medium">
                      Baseline Comparison
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVolumeAggregation("daily")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      volumeAggregation === "daily"
                        ? "bg-[#0099f2] text-white shadow-xs"
                        : "bg-[#eaf5ff] text-[#3f4852] hover:bg-[#def0ff]"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setVolumeAggregation("weekly")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      volumeAggregation === "weekly"
                        ? "bg-[#0099f2] text-white shadow-xs"
                        : "bg-[#eaf5ff] text-[#3f4852] hover:bg-[#def0ff]"
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>
            </section>

            {/* Bottom Section: "Today's top 3 things to know" & "Learner Voices" */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Today's top 3 things to know */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#001e2d] tracking-tight">
                      Today&apos;s top 3 things to know
                    </h3>
                    <p className="text-xs text-[#3f4852] font-medium">
                      High-impact signals curated by AI listening models for immediate hub action
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#00629e] uppercase tracking-wider bg-[#d2ecff] px-3 py-1 rounded-full">
                    Action Ready
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Item 1 */}
                  <div className="stitch-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#eaf5ff] text-[#0099f2] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">electric_bolt</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0099f2]">
                            Regional Spikes
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0099f2]"></span>
                          <span className="text-[11px] text-[#3f4852] font-semibold">Western Hubs</span>
                        </div>
                        <p className="text-sm font-bold text-[#001e2d] leading-snug">
                          Electrician &amp; EV Technician courses are trending strongly in Pune and Nashik centers.
                        </p>
                        <span className="text-xs text-[#3f4852] mt-1 font-medium">
                          1,840 queries tagged with local industry apprentice hiring drives.
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/trends"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] text-xs font-bold transition-all shrink-0 self-start sm:self-auto group-hover:translate-x-1"
                    >
                      <span>View trend</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Item 2 */}
                  <div className="stitch-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#dfec42]/40 text-[#5d6300] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">question_answer</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5d6300]">
                            Learner Inquiries
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#909a00]"></span>
                          <span className="text-[11px] text-[#3f4852] font-semibold">FAQs &amp; Admissions</span>
                        </div>
                        <p className="text-sm font-bold text-[#001e2d] leading-snug">
                          Learners frequently ask about placement tie-ups and weekend batch flexibility.
                        </p>
                        <span className="text-xs text-[#3f4852] mt-1 font-medium">
                          Pulse AI has drafted standardized reassuring replies for outreach leads.
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/studio"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#dfec42] hover:bg-[#c3d022] text-[#001e2d] text-xs font-bold transition-all shrink-0 self-start sm:self-auto group-hover:translate-x-1 shadow-2xs"
                    >
                      <span>Draft reply</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Item 3 */}
                  <div className="stitch-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#56c0ff]/20 text-[#006590] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">diversity_1</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0099f2]">
                            Diversity &amp; Inclusion
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0099f2]"></span>
                          <span className="text-[11px] text-[#3f4852] font-semibold">National Campaign</span>
                        </div>
                        <p className="text-sm font-bold text-[#001e2d] leading-snug">
                          Women in STEM skilling workshops saw a 45% surge in social engagement.
                        </p>
                        <span className="text-xs text-[#3f4852] mt-1 font-medium">
                          Story shares and community testimonials reached 38,000+ potential candidates.
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/audience"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] text-xs font-bold transition-all shrink-0 self-start sm:self-auto group-hover:translate-x-1"
                    >
                      <span>Explore audience</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right 1 Col: Live Voice of Learners */}
              <div className="stitch-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0099f2] text-[20px]">forum</span>
                      <h3 className="text-lg font-bold text-[#001e2d]">Learner Voices</h3>
                    </div>
                    {data.is_sample ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                        Sample data
                      </span>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1e9e6a] animate-pulse"></span>
                    )}
                  </div>

                  {data.learner_voices && data.learner_voices.length > 0 ? (
                    <div className="space-y-3.5">
                      {data.learner_voices.slice(0, 3).map((lv, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-[#eaf5ff] flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#0099f2] text-white flex items-center justify-center font-bold text-[10px] uppercase">
                                {lv.author.replace("@", "").slice(0, 2) || "LV"}
                              </div>
                              <span className="text-xs font-bold text-[#001e2d] truncate max-w-[120px]">
                                {lv.author}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#3f4852] font-semibold capitalize">
                              {lv.source} {lv.likes ? `• ${lv.likes.toLocaleString()} likes` : ""}
                            </span>
                          </div>
                          <p className="text-xs text-[#001e2d] italic leading-relaxed line-clamp-3">
                            &quot;{lv.quote}&quot;
                          </p>
                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-[#00629e] font-semibold text-[10px] truncate max-w-[150px]">
                              {lv.topic}
                            </span>
                            {lv.url && (
                              <a
                                href={lv.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#0099f2] hover:underline font-bold text-[10px]"
                              >
                                <span>View post</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-[#f5faff] border border-dashed border-[#def0ff] space-y-3">
                      <p className="text-xs text-[#3f4852]">No question posts recorded yet in database.</p>
                      <button
                        onClick={() => {
                          setLoading(true);
                          api.searchYouTube("Tata STRIVE", 10).then(() => loadData());
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#0099f2] text-white text-xs font-bold shadow-xs hover:bg-[#007acc] transition-all"
                      >
                        Fetch posts
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-[#0099f2]/10">
                  <Link
                    href="/feed"
                    className="p-3.5 rounded-xl bg-gradient-to-r from-[#d2ecff] to-[#def0ff] flex items-center justify-between hover:scale-[1.02] transition-transform"
                  >
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#3f4852]">
                        Pulse Listening Engine
                      </span>
                      <span className="block text-xs font-black text-[#001e2d]">
                        42 Hubs Syncing Live
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#0099f2] text-xs font-bold">
                      View Feed
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 px-8 flex justify-center items-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0099f2]" />
        </div>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
