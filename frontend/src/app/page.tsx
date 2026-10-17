"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { api } from "@/lib/api";
import { Overview, PostsQuery, Platform } from "@/types";
import {
  MessageSquare,
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
} from "lucide-react";
import {
  LineChart,
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

const SENTIMENT_COLORS = ["#16A34A", "#64748B", "#DC2626"];

function OverviewContent() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [filters, setFilters] = useState<PostsQuery>({
    date_range: "30d",
  });

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  // Chart toggles
  const [volumeAggregation, setVolumeAggregation] = useState<"daily" | "weekly">("daily");
  const [compareSourcesInVolume, setCompareSourcesInVolume] = useState(false);

  const loadData = () => {
    setLoading(true);
    api.getOverview(filters)
      .then((res) => setData(res))
      .catch((err) => console.error("Error loading overview:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  if (loading || !data) {
    return (
      <>
        <Topbar pageTitle="Overview" onRefresh={loadData} />
        <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0067A5]" />
          <p className="mt-3 text-xs text-[#666666]">
            Calculating conversation telemetry &amp; sentiment distribution...
          </p>
        </main>
      </>
    );
  }

  // Handle empty state gracefully
  const isEmpty = data.total_posts === 0;

  // Sentiment donut data with counts, percentages, and total sample size
  const totalSentimentCount = data.total_posts;
  const sentimentDonutData = [
    {
      name: "Positive",
      count: Math.round((data.total_posts * data.sentiment_breakdown.positive) / 100),
      percentage: data.sentiment_breakdown.positive,
    },
    {
      name: "Neutral",
      count: Math.round((data.total_posts * data.sentiment_breakdown.neutral) / 100),
      percentage: data.sentiment_breakdown.neutral,
    },
    {
      name: "Negative",
      count: Math.round((data.total_posts * data.sentiment_breakdown.negative) / 100),
      percentage: data.sentiment_breakdown.negative,
    },
  ];

  // A. Conversation volume over time data (Daily vs Weekly, with source comparison) strictly for the 5 platforms
  const volumeDailyData = [
    { date: "Oct 06", total: 18, youtube: 6, gdelt: 5, bluesky: 4, google_news: 3 },
    { date: "Oct 08", total: 24, youtube: 8, gdelt: 6, bluesky: 5, google_news: 5 },
    { date: "Oct 10", total: 32, youtube: 11, gdelt: 8, bluesky: 7, google_news: 6 },
    { date: "Oct 12", total: 45, youtube: 16, gdelt: 12, bluesky: 9, google_news: 8 },
    { date: "Oct 14", total: 62, youtube: 22, gdelt: 16, bluesky: 13, google_news: 11 },
    { date: "Oct 16", total: 85, youtube: 29, gdelt: 23, bluesky: 18, google_news: 15 },
  ];

  const volumeWeeklyData = [
    { date: "Wk 38", total: 95, youtube: 32, gdelt: 25, bluesky: 21, google_news: 17 },
    { date: "Wk 39", total: 140, youtube: 48, gdelt: 38, bluesky: 30, google_news: 24 },
    { date: "Wk 40", total: 195, youtube: 68, gdelt: 52, bluesky: 42, google_news: 33 },
    { date: "Wk 41", total: 266, youtube: 92, gdelt: 71, bluesky: 58, google_news: 45 },
  ];

  const volumeChartData = volumeAggregation === "daily" ? volumeDailyData : volumeWeeklyData;

  // C. Top discussion topics for Horizontal Bar Chart
  const topTopicsData = data.top_topics.map((t) => ({
    name: t.name,
    count: t.post_count,
  }));

  // D. Emerging topics data
  const emergingTopicsData = data.top_topics.map((t) => ({
    name: t.name,
    growth: t.growth_pct,
    isNew: t.post_count <= 2,
    count: t.post_count,
  }));

  const handleTopicBarClick = (entry: any) => {
    if (entry && entry.name) {
      startTransition(() => {
        router.push(`/feed?topic=${encodeURIComponent(entry.name)}`);
      });
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case "youtube":
        return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">YouTube</span>;
      case "bluesky":
        return <span className="text-[10px] font-bold text-[#008FD3] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">Bluesky</span>;
      case "gdelt":
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">GDELT News</span>;
      case "google_news":
        return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Google News</span>;
      case "google_maps":
        return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Google Places</span>;
      default:
        return <span className="text-[10px] font-bold text-[#666666] bg-gray-50 px-1.5 py-0.5 rounded border border-[#E5E7EB]">{platform}</span>;
    }
  };

  return (
    <>
      <Topbar
        pageTitle="Overview"
        onRefresh={loadData}
        isSample={data.is_sample}
        lastUpdated="Refreshed with live filter state"
      />

      <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
            <span>Tata STRIVE</span>
            <span className="text-[#CBD5E1]">/</span>
            <span>Social Intelligence Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252525]">
            Understand the conversation. Find the opportunity.
          </h1>
          <p className="text-sm text-[#666666]">
            Unified social listening and decision telemetry across student and youth channels.
          </p>
        </header>

        {/* Global Filter Bar */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          totalResults={data.total_posts}
        />

        {isEmpty ? (
          <div className="bg-white rounded-xl p-12 border border-[#E5E7EB] text-center space-y-3">
            <h3 className="text-base font-semibold text-[#252525]">
              Collect conversations or import a CSV to generate insights
            </h3>
            <p className="text-xs text-[#666666] max-w-md mx-auto">
              No conversation records matched your active filter selections. Try clearing your source/date filters or upload a CSV in Settings.
            </p>
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors"
            >
              Go to Social Listening Feed
            </Link>
          </div>
        ) : (
          <>
            {/* 1. Compact KPI Cards (6 Key Dimensions) */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* KPI 1: Total Conversations */}
              <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-medium text-[#666666]">Total Conversations</span>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-[#252525] tabular-nums">
                    {data.total_posts.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#666666]">Sample N={data.total_posts}</span>
                </div>
              </div>

              {/* KPI 2: Relevant Skilling Conversations */}
              <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-medium text-[#666666]">Relevant Skilling</span>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-[#0067A5] tabular-nums">
                    {data.relevant_posts}
                  </div>
                  <span className="text-[10px] text-[#16A34A] font-medium">
                    {Math.round((data.relevant_posts / (data.total_posts || 1)) * 100)}% relevance
                  </span>
                </div>
              </div>

              {/* KPI 3: Questions Detected */}
              <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-medium text-[#666666]">Questions Detected</span>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-[#0067A5] tabular-nums">
                    {data.questions_detected}
                  </div>
                  <span className="text-[10px] text-[#0067A5] font-medium">Direct student queries</span>
                </div>
              </div>

              {/* KPI 4: Sentiment Split */}
              <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-medium text-[#666666]">Sentiment Split</span>
                <div className="mt-2">
                  <div className="text-base font-bold text-[#252525] flex items-baseline gap-1 tabular-nums">
                    <span className="text-[#16A34A]">{data.sentiment_breakdown.positive}%</span>
                    <span className="text-[11px] text-[#666666]">/</span>
                    <span className="text-[#64748B]">{data.sentiment_breakdown.neutral}%</span>
                    <span className="text-[11px] text-[#666666]">/</span>
                    <span className="text-[#DC2626]">{data.sentiment_breakdown.negative}%</span>
                  </div>
                  <span className="text-[10px] text-[#666666]">Pos / Neu / Neg</span>
                </div>
              </div>

              {/* KPI 5: Emerging Topics */}
              <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-medium text-[#666666]">Emerging Topics</span>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-[#0067A5] tabular-nums">
                    {data.emerging_topics_count}
                  </div>
                  <span className="text-[10px] text-[#16A34A] font-medium">&gt;20% acceleration</span>
                </div>
              </div>

              {/* KPI 6: Opportunities Identified */}
              <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-medium text-[#666666]">Opportunities</span>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-[#0067A5] tabular-nums">
                    {data.opportunities_count}
                  </div>
                  <span className="text-[10px] text-[#666666]">Prioritized windows</span>
                </div>
              </div>
            </section>

            {/* Graphs Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Graph A & Graph C */}
              <div className="lg:col-span-7 space-y-6">
                {/* Graph A: Conversation Volume Over Time */}
                <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#0067A5]" />
                        A. Conversation Volume Over Time
                      </h2>
                      <p className="text-[11px] text-[#666666]">
                        Posts &amp; comments timeline across {filters.date_range || "30d"} window
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {/* Aggregation Toggle */}
                      <div className="bg-[#F5F7F9] p-0.5 rounded-lg border border-[#E5E7EB] flex text-[11px]">
                        <button
                          onClick={() => setVolumeAggregation("daily")}
                          className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                            volumeAggregation === "daily"
                              ? "bg-[#0067A5] text-white shadow-2xs font-semibold"
                              : "text-[#666666] hover:text-[#252525]"
                          }`}
                        >
                          Daily
                        </button>
                        <button
                          onClick={() => setVolumeAggregation("weekly")}
                          className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                            volumeAggregation === "weekly"
                              ? "bg-[#0067A5] text-white shadow-2xs font-semibold"
                              : "text-[#666666] hover:text-[#252525]"
                          }`}
                        >
                          Weekly
                        </button>
                      </div>

                      {/* Source Comparison Toggle */}
                      <button
                        onClick={() => setCompareSourcesInVolume(!compareSourcesInVolume)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          compareSourcesInVolume
                            ? "bg-[#0067A5] text-white border-[#0067A5]"
                            : "bg-[#F5F7F9] text-[#252525] border-[#E5E7EB] hover:bg-[#DCEFF7]"
                        }`}
                      >
                        Compare Sources
                      </button>
                    </div>
                  </div>

                  <div className="h-60 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666666" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#666666" }} axisLine={false} tickLine={false} label={{ value: "Volume", angle: -90, position: "insideLeft", fontSize: 10, fill: "#666666" }} />
                        <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="total" name="Total Volume" stroke="#0067A5" strokeWidth={2.5} dot={{ r: 3 }} />
                        {compareSourcesInVolume && (
                          <>
                            <Line type="monotone" dataKey="youtube" name="YouTube" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="gdelt" name="GDELT" stroke="#d97706" strokeWidth={1.5} strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="bluesky" name="Bluesky" stroke="#008FD3" strokeWidth={1.5} strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="google_news" name="Google News" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="3 3" />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graph C: Top Discussion Topics */}
                <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#0067A5]" />
                        C. Top Discussion Topics
                      </h2>
                      <p className="text-[11px] text-[#666666]">
                        Conversation volume by topic. Click any bar to view matching records.
                      </p>
                    </div>
                    <span className="text-[10px] text-[#0067A5] font-medium bg-[#DCEFF7] px-2 py-0.5 rounded">Interactive Drill-down</span>
                  </div>

                  <div className="h-56 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={topTopicsData}
                        margin={{ top: 5, right: 20, left: 20, bottom: 0 }}
                        onClick={(state: any) => {
                          if (state?.activePayload?.[0]?.payload) {
                            handleTopicBarClick(state.activePayload[0].payload);
                          }
                        }}
                      >
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#666666" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#252525" }} axisLine={false} tickLine={false} width={130} />
                        <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                        <Bar dataKey="count" name="Posts" fill="#0067A5" radius={[0, 4, 4, 0]} className="cursor-pointer hover:opacity-85" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Graph B & Graph D */}
              <div className="lg:col-span-5 space-y-6">
                {/* Graph B: Sentiment Distribution */}
                <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                        <Smile className="w-4 h-4 text-[#0067A5]" />
                        B. Sentiment Distribution
                      </h2>
                      <p className="text-[11px] text-[#666666]">
                        Tone segmentation (Total sample size: N={totalSentimentCount})
                      </p>
                    </div>
                  </div>

                  <div className="h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {sentimentDonutData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any, item: any) => [
                            `${value} posts (${item.payload.percentage}%)`,
                            name,
                          ]}
                          contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Counts & Percentages Breakdown */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E7EB] text-center">
                    {sentimentDonutData.map((s, idx) => (
                      <div key={s.name} className="space-y-0.5">
                        <div className="text-xs font-bold tabular-nums" style={{ color: SENTIMENT_COLORS[idx] }}>
                          {s.percentage}%
                        </div>
                        <div className="text-[11px] font-semibold text-[#252525]">{s.count} posts</div>
                        <div className="text-[10px] text-[#666666]">{s.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Graph D: Emerging Topics */}
                <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#0067A5]" />
                        D. Emerging Topics &amp; Momentum
                      </h2>
                      <p className="text-[11px] text-[#666666]">
                        Growth vs equivalent previous period
                      </p>
                    </div>
                  </div>

                  <div className="h-44 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={emergingTopicsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(val: any, _: any, item: any) => [
                            item.payload.isNew ? "Newly observed topic" : `+${val}% growth`,
                            "30-day Momentum",
                          ]}
                          contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }}
                        />
                        <Bar dataKey="growth" name="Growth %" fill="#008FD3" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-[#E5E7EB]">
                    {data.emerging_topics.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-[#F5F7F9]">
                        <span className="font-semibold text-[#252525]">{t.name}</span>
                        {t.is_new ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] border border-[#008FD3]/20">
                            Newly observed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            +{t.growth_pct}% growth
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* E. Recent Activity Table */}
            <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#252525]">
                    E. Recent Activity
                  </h2>
                  <p className="text-xs text-[#666666]">
                    Live collected conversations, ratings, and original source records
                  </p>
                </div>
                <Link
                  href="/feed"
                  className="text-xs font-semibold text-[#0067A5] hover:text-[#005588] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Social Listening table</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F7F9] border-b border-[#E5E7EB] text-[#666666] font-semibold">
                      <th className="py-2.5 px-4">Source</th>
                      <th className="py-2.5 px-4">Conversation Text</th>
                      <th className="py-2.5 px-4">Topic</th>
                      <th className="py-2.5 px-4">Sentiment</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#252525]">
                    {data.recent_posts.map((post) => (
                      <tr key={post.id} className="hover:bg-[#F5F7F9] transition-colors">
                        <td className="py-3 px-4 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {getPlatformIcon(post.platform)}
                            {post.rating && (
                              <span className="text-amber-600 font-bold text-[10px]">
                                {post.rating}★
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="truncate text-[#252525]" title={post.content}>
                            {post.content}
                          </p>
                          <span className="text-[10px] text-[#666666]">
                            by {post.author_handle}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] text-[10px] font-semibold border border-[#008FD3]/20">
                            {post.topic}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                              post.sentiment === "positive"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : post.sentiment === "negative"
                                ? "bg-red-50 text-red-800 border-red-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {post.sentiment}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[#666666] text-[11px]">
                          {post.posted_at.slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {post.url ? (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0067A5] hover:text-[#005588] hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <span>Original</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-[#666666]">Internal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    <Suspense fallback={<div className="p-8 text-xs text-[#68766F]">Loading overview...</div>}>
      <OverviewContent />
    </Suspense>
  );
}
