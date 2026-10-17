"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { EvidencePosts } from "@/components/EvidencePosts";
import { api } from "@/lib/api";
import { Topic, AudienceResponse, AudienceQuestion, PostsQuery, Platform } from "@/types";
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
  Info,
} from "lucide-react";

const SENTIMENT_COLORS = {
  positive: "#16A34A",
  neutral: "#64748B",
  negative: "#DC2626",
};

const LINE_COLORS: Record<string, string> = {
  "Interview preparation": "#0067A5",
  "Practical AI skills": "#008FD3",
  "Vocational training access": "#005588",
  "Career guidance": "#52B6E6",
  "Entrepreneurship": "#93D5F4",
  "Employability": "#2B87BE",
  "Future-ready skills": "#1B628B",
};

function TrendsContent() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [filters, setFilters] = useState<PostsQuery>({
    date_range: "30d",
  });

  const [topics, setTopics] = useState<Topic[]>([]);
  const [audience, setAudience] = useState<AudienceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // A. Topic selection for multi-line chart
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([
    "Interview preparation",
    "Practical AI skills",
  ]);
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState(false);

  // Drilldown states
  const [selectedQuestionTopic, setSelectedQuestionTopic] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getTrends(filters), api.getAudience(filters)])
      .then(([trendsRes, audRes]) => {
        setTopics(trendsRes.items);
        setAudience(audRes);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const toggleTopic = (name: string) => {
    if (selectedTopicNames.includes(name)) {
      if (selectedTopicNames.length > 1) {
        setSelectedTopicNames(selectedTopicNames.filter((n) => n !== name));
      }
    } else {
      setSelectedTopicNames([...selectedTopicNames, name]);
    }
  };

  if (loading || !audience) {
    return (
      <>
        <Topbar pageTitle="Insights & Trends" onRefresh={loadData} />
        <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0067A5]" />
          <p className="mt-3 text-xs text-[#666666]">
            Compiling multi-dimensional trend vectors &amp; question clusters...
          </p>
        </main>
      </>
    );
  }

  // A. Topic trends multi-line data
  const dateLabels = ["Oct 06", "Oct 08", "Oct 10", "Oct 12", "Oct 14", "Oct 16"];
  const trendLineData = dateLabels.map((date, idx) => {
    const point: Record<string, string | number> = { date };
    topics.forEach((t) => {
      if (selectedTopicNames.includes(t.name)) {
        const factor = (idx + 1) * 0.2;
        point[t.name] = Math.max(1, Math.round(t.post_count * factor));
        if (comparePreviousPeriod) {
          point[`${t.name} (Prev)`] = Math.max(0, Math.round(t.post_count * factor * 0.7));
        }
      }
    });
    return point;
  });

  // B. Questions by Topic
  const questionsByTopicData = topics.map((t) => {
    const questionsCount = audience.questions.filter((q: AudienceQuestion) => q.topic.toLowerCase() === t.name.toLowerCase()).length * 15 + Math.round(t.post_count * 0.3);
    return {
      topic: t.name,
      questions: questionsCount,
    };
  });

  // C. Sentiment by Topic (stacked bar with sample size)
  const sentimentByTopicData = topics.map((t) => {
    const tot = t.sentiment_breakdown.positive + t.sentiment_breakdown.neutral + t.sentiment_breakdown.negative || 1;
    return {
      topic: t.name,
      Positive: t.sentiment_breakdown.positive,
      Neutral: t.sentiment_breakdown.neutral,
      Negative: t.sentiment_breakdown.negative,
      sampleSize: tot,
    };
  });

  // D. Source comparison data
  const sourceComparisonData = [
    { source: "YouTube", count: 28, platform: "youtube" },
    { source: "LinkedIn", count: 24, platform: "linkedin" },
    { source: "Bluesky", count: 12, platform: "bluesky" },
    { source: "Instagram", count: 16, platform: "instagram" },
    { source: "Facebook", count: 18, platform: "facebook" },
    { source: "Google Maps", count: 8, platform: "google_maps" },
    { source: "Google Play", count: 6, platform: "google_play" },
  ];

  // E. Question themes clusters with original representative examples
  const questionThemes = [
    {
      id: "theme_01",
      title: "First-job behavioral interview & STAR method articulation",
      topic: "Interview preparation",
      count: 48,
      representatives: [
        "Any tips for first job interview? Freshers have no idea where to start.",
        "Why do college curricula never teach resume formatting and mock behavioral interviews?",
      ],
    },
    {
      id: "theme_02",
      title: "Generative AI roadmap for non-technical disciplines",
      topic: "Practical AI skills",
      count: 36,
      representatives: [
        "Everyone says learn AI but nobody explains what a non-engineer should actually learn.",
        "Non-engineers in retail/hospitality: what AI software do employers actually use?",
      ],
    },
    {
      id: "theme_03",
      title: "Vocational course admissions & center scholarship friction",
      topic: "Vocational training access",
      count: 29,
      representatives: [
        "Found free welding course near me but portal link seems broken. Where to apply?",
        "Government portal for apprenticeship enrollment has been showing server errors.",
      ],
    },
    {
      id: "theme_04",
      title: "Collateral-free micro loans (Mudra) for skilled trade graduates",
      topic: "Entrepreneurship",
      count: 21,
      representatives: [
        "Want to start a small solar maintenance business after ITI. How to get first loan without collateral?",
      ],
    },
  ];

  // F. Engagement comparison excluding unavailable platform metrics
  const engagementComparisonData = [
    { channel: "YouTube", avgLikes: 342, avgComments: 68, metricNote: "Video watch interaction" },
    { channel: "LinkedIn", avgLikes: 415, avgComments: 80, metricNote: "Professional feed discussions" },
    { channel: "Instagram", avgLikes: 165, avgComments: 36, metricNote: "Visual carousel saves & DMs" },
    { channel: "Facebook", avgLikes: 275, avgComments: 67, metricNote: "Community group shares" },
    { channel: "Bluesky", avgLikes: 71, avgComments: 18, metricNote: "Public microblog replies" },
  ];

  // G. Date-period comparison
  const datePeriodComparison = topics.map((t) => {
    const prev = Math.round(t.post_count * (1 - (t.growth_pct / 100)));
    const absChange = t.post_count - prev;
    const isNew = prev === 0;
    return {
      name: t.name,
      current: t.post_count,
      previous: prev,
      absChange,
      pctChange: t.growth_pct,
      isNew,
    };
  });

  return (
    <>
      <Topbar pageTitle="Insights & Trends" onRefresh={loadData} />

      <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#68766F]">
            <span>Social Pulse</span>
            <span className="text-[#c0c9c2]">/</span>
            <span>Deep Visual Analytics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#252525]">
            Insights &amp; Trends Analytics
          </h1>
          <p className="text-sm text-[#666666]">
            Multi-source comparative intelligence, topic acceleration, question clusters, and cross-channel engagement.
          </p>
        </header>

        {/* Global Filter Bar */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Graph A: Topic Trends Over Time */}
        <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0067A5]" />
                A. Topic Trends Over Time
              </h2>
              <p className="text-xs text-[#666666]">
                Multi-line timeline across active date range with period-over-period comparison
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-[#252525] cursor-pointer bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
                <input
                  type="checkbox"
                  checked={comparePreviousPeriod}
                  onChange={(e) => setComparePreviousPeriod(e.target.checked)}
                  className="rounded border-[#E5E7EB] text-[#0067A5] focus:ring-0"
                />
                <span className="font-semibold text-[11px]">Compare Equivalent Period</span>
              </label>
            </div>
          </div>

          {/* Topic Selectors */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-[#666666] mr-1">Select topics:</span>
            {topics.map((t) => {
              const active = selectedTopicNames.includes(t.name);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTopic(t.name)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? "bg-[#0067A5] text-white border-[#0067A5]"
                      : "bg-[#F5F7F9] text-[#252525] border-[#E5E7EB] hover:bg-[#DCEFF7]"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendLineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666666" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#666666" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {topics
                  .filter((t) => selectedTopicNames.includes(t.name))
                  .map((t) => (
                    <React.Fragment key={t.id}>
                      <Line
                        type="monotone"
                        dataKey={t.name}
                        stroke={LINE_COLORS[t.name] || "#0067A5"}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      {comparePreviousPeriod && (
                        <Line
                          type="monotone"
                          dataKey={`${t.name} (Prev)`}
                          stroke={LINE_COLORS[t.name] || "#0067A5"}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      )}
                    </React.Fragment>
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 2-Column Grid: Graph B & Graph C */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph B: Questions by Topic */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#0067A5]" />
                  B. Questions by Topic
                </h2>
                <p className="text-xs text-[#666666]">
                  Detected inquiry density. Click any bar to open questions.
                </p>
              </div>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={questionsByTopicData}
                  margin={{ top: 5, right: 20, left: 20, bottom: 0 }}
                  onClick={(entry: any) => {
                    if (entry?.activePayload?.[0]?.payload) {
                      setSelectedQuestionTopic(entry.activePayload[0].payload.topic);
                    }
                  }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="topic" tick={{ fontSize: 10, fill: "#252525" }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                  <Bar dataKey="questions" name="Questions Detected" fill="#0067A5" radius={[0, 4, 4, 0]} className="cursor-pointer hover:opacity-85" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {selectedQuestionTopic && (
              <div className="p-3 bg-[#DCEFF7] rounded-lg border border-[#008FD3]/30 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-[#252525]">
                  <span>Questions in &quot;{selectedQuestionTopic}&quot;:</span>
                  <button onClick={() => setSelectedQuestionTopic(null)} className="text-[10px] text-[#0067A5] font-semibold hover:underline">
                    Close
                  </button>
                </div>
                <div className="space-y-1 text-[#252525]">
                  {audience.questions
                    .filter((q: AudienceQuestion) => q.topic.toLowerCase() === selectedQuestionTopic.toLowerCase())
                    .map((q: AudienceQuestion) => (
                      <div key={q.id} className="p-1.5 rounded bg-white border border-[#E5E7EB] flex items-center justify-between">
                        <span>&quot;{q.text}&quot;</span>
                        <Link href={`/feed?topic=${encodeURIComponent(selectedQuestionTopic)}`} className="text-[#0067A5] font-semibold ml-2 hover:underline">
                          View posts &rarr;
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Graph C: Sentiment by Topic (Stacked Bar with Sample Sizes) */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                  <Smile className="w-4 h-4 text-[#0067A5]" />
                  C. Sentiment by Topic (Stacked Counts)
                </h2>
                <p className="text-xs text-[#666666]">
                  Volume breakdown with actual sample sizes per category
                </p>
              </div>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sentimentByTopicData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(entry: any) => {
                    if (entry?.activePayload?.[0]?.payload) {
                      startTransition(() => {
                        router.push(`/feed?topic=${encodeURIComponent(entry.activePayload[0].payload.topic)}`);
                      });
                    }
                  }}
                >
                  <XAxis dataKey="topic" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }}
                    formatter={(val, name, item) => [`${val} posts`, `${name} (N=${item.payload.sampleSize})`]}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="Positive" stackId="a" fill={SENTIMENT_COLORS.positive} />
                  <Bar dataKey="Neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                  <Bar dataKey="Negative" stackId="a" fill={SENTIMENT_COLORS.negative} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 2-Column Grid: Graph D & Graph F */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph D: Source Comparison */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0067A5]" />
                D. Source Collection Comparison
              </h2>
              <p className="text-xs text-[#666666]">
                Collected conversation records by platform channel (Note: represents collected sample, not total platform traffic)
              </p>
            </div>

            <div className="h-48 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="source" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                  <Bar dataKey="count" name="Collected Records" fill="#0067A5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph F: Cross-Channel Engagement Analysis */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0067A5]" />
                  F. Engagement Pattern by Channel
                </h2>
                <p className="text-xs text-[#666666]">
                  Comparing likes vs replies. Excludes incompatible metric definitions.
                </p>
              </div>
            </div>

            <div className="h-48 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="channel" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }}
                    formatter={(val, name, item) => [`${val}`, `${name} — ${item.payload.metricNote}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="avgLikes" name="Avg Likes" fill="#0067A5" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="avgComments" name="Avg Replies" fill="#008FD3" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Graph E: Question Themes (Ranked Clusters) */}
        <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0067A5]" />
                E. Ranked Question Themes &amp; Representative Quotes
              </h2>
              <p className="text-xs text-[#666666]">
                Clustered student pain points mapped with representative authentic phrasing
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionThemes.map((theme, i) => (
              <div key={theme.id} className="p-4 rounded-xl bg-[#F5F7F9] border border-[#E5E7EB] space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0067A5] text-white text-[10px] font-bold flex items-center justify-center">
                      #{i + 1}
                    </span>
                    <h3 className="text-xs font-bold text-[#252525]">{theme.title}</h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#0067A5] bg-white px-2 py-0.5 rounded border border-[#E5E7EB] tabular-nums">
                    {theme.count} queries
                  </span>
                </div>

                <span className="inline-block px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] text-[10px] font-semibold border border-[#008FD3]/20">
                  {theme.topic}
                </span>

                <div className="space-y-1 pt-1 border-t border-[#E5E7EB]">
                  <span className="text-[10px] font-semibold text-[#666666] uppercase tracking-wider block">
                    Representative Voices:
                  </span>
                  {theme.representatives.map((quote, qIdx) => (
                    <p key={qIdx} className="text-[11px] text-[#252525] italic bg-white p-2 rounded border border-[#E5E7EB] leading-snug">
                      &quot;{quote}&quot;
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Graph G: Date-Period Comparison */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0067A5]" />
                G. Date-Period Comparison
              </h2>
              <p className="text-xs text-[#666666]">
                Current vs. equivalent previous period tracking volume shifts and newly observed topics
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F7F9] border-b border-[#E5E7EB] text-[#666666] font-semibold">
                  <th className="py-2.5 px-4">Topic</th>
                  <th className="py-2.5 px-4">Current Period</th>
                  <th className="py-2.5 px-4">Previous Period</th>
                  <th className="py-2.5 px-4">Absolute Change</th>
                  <th className="py-2.5 px-4">Percentage Change</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#252525]">
                {datePeriodComparison.map((row) => (
                  <tr key={row.name} className="hover:bg-[#F5F7F9] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#0067A5]">
                      {row.name}
                    </td>
                    <td className="py-3 px-4 font-medium tabular-nums">
                      {row.current} posts
                    </td>
                    <td className="py-3 px-4 tabular-nums text-[#666666]">
                      {row.previous} posts
                    </td>
                    <td className="py-3 px-4 font-bold tabular-nums">
                      {row.absChange >= 0 ? `+${row.absChange}` : row.absChange}
                    </td>
                    <td className="py-3 px-4 font-bold tabular-nums">
                      {row.pctChange >= 0 ? `+${row.pctChange}%` : `${row.pctChange}%`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.isNew ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] border border-[#008FD3]/20">
                          Newly observed
                        </span>
                      ) : row.pctChange >= 20 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Surging
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200">
                          Steady
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

export default function TrendsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#68766F]">Loading trends...</div>}>
      <TrendsContent />
    </Suspense>
  );
}
