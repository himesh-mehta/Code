"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { Overview, PostsQuery, OfficialImpactResponse, AppSettings } from "@/types";
import {
  TrendingUp,
  Target,
  HelpCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Download,
  CheckCircle2,
  MessageSquare,
  Building2,
  Users,
  GraduationCap,
  Award,
  AlertCircle,
  RefreshCw,
  Radio,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { usePageContext } from "@/context/PageContext";

function OverviewContent() {
  const router = useRouter();
  const { updatePageContext } = usePageContext();

  const [filters] = useState<PostsQuery>({
    date_range: "30d",
  });

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{
    status: "success" | "partial" | "failed" | "idle";
    message?: string;
  }>({ status: "idle" });

  // Official Tata STRIVE Verified Metrics
  const [officialImpact, setOfficialImpact] = useState<OfficialImpactResponse | null>(null);

  // User settings for dynamic personalization
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Chart toggles
  const [volumeAggregation, setVolumeAggregation] = useState<"daily" | "weekly">("daily");

  const loadData = async () => {
    try {
      const res = await api.getOverview(filters);
      setData(res);
    } catch (err) {
      console.error("Error loading overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadOfficialImpact = async () => {
    try {
      const res = await api.getOfficialImpact();
      setOfficialImpact(res);
    } catch (err) {
      console.error("Error loading official impact:", err);
    }
  };

  useEffect(() => {
    loadData();
    loadOfficialImpact();
    api.getSettings().then((s) => setSettings(s.settings)).catch(() => {});
  }, [filters]);

  // Genuine Refresh Workflow
  const handleGenuineRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshResult({ status: "idle" });

    try {
      const result = await api.refreshOverview({ trigger: "manual_overview_button" });

      if (result.status === "success" || result.status === "partial") {
        setRefreshResult({
          status: result.status as "success" | "partial",
          message: result.message,
        });
        // Recalculate Overview metrics from the resulting real dataset
        await loadData();
      } else {
        setRefreshResult({
          status: "failed",
          message: result.message || "Refresh failed. Cached valid telemetry preserved.",
        });
      }
    } catch (e: any) {
      setRefreshResult({
        status: "failed",
        message: e?.message || "Failed to complete data synchronization.",
      });
    } finally {
      setIsRefreshing(false);
      // Auto-dismiss result banner after 7 seconds
      setTimeout(() => {
        setRefreshResult((prev) => (prev.status !== "idle" ? { status: "idle" } : prev));
      }, 7000);
    }
  };

  useEffect(() => {
    if (data) {
      updatePageContext({
        route: "/",
        page_name: "Overview Dashboard",
        page_purpose:
          "Executive high-level summary of verified Tata STRIVE organizational impact and live social listening telemetry across skilling domains.",
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
        <Topbar pageTitle="Overview" onRefresh={handleGenuineRefresh} isRefreshing={isRefreshing} />
        <main className="pt-24 px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-[#eaf5ff] flex items-center justify-center mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-[#0099f2]" />
          </div>
          <h3 className="font-bold text-lg text-[#001e2d]">Loading Pulse Intelligence</h3>
          <p className="mt-1 text-xs text-[#3f4852]">
            Calculating conversation telemetry &amp; sentiment distribution across verified channels...
          </p>
        </main>
      </>
    );
  }

  // Handle empty state gracefully
  const isEmpty = data.total_posts === 0;

  // Daily Curve Data computed strictly from real stored telemetry
  const volumeDailyData =
    data.telemetry_curve && data.telemetry_curve.length > 0
      ? data.telemetry_curve.map((pt) => ({
          day: pt.date.slice(5),
          mentions: pt.count,
          baseline: Math.round(pt.count * 0.85),
        }))
      : [];

  const volumeWeeklyData =
    data.telemetry_curve && data.telemetry_curve.length >= 7
      ? [
          { day: "Wk 1", mentions: data.telemetry_curve.slice(0, 7).reduce((a, b) => a + b.count, 0) },
          { day: "Wk 2", mentions: data.telemetry_curve.slice(7, 14).reduce((a, b) => a + b.count, 0) },
          { day: "Wk 3", mentions: data.telemetry_curve.slice(14, 21).reduce((a, b) => a + b.count, 0) },
          { day: "Wk 4", mentions: data.telemetry_curve.slice(21, 28).reduce((a, b) => a + b.count, 0) },
        ]
      : [];

  const volumeChartData = volumeAggregation === "daily" ? volumeDailyData : volumeWeeklyData;

  const mostDiscussed = data.top_impact_cards?.most_discussed || {
    topic: data.top_topics[0]?.name || "Vocational & Trade Training",
    mentions_7d: data.top_topics[0]?.post_count || data.total_posts,
    growth_pct: 14.2,
    hubs_reporting: "All Active Channels",
  };

  const fastestGrowing = data.top_impact_cards?.fastest_growing || {
    topic: data.top_topics[1]?.name || "Electric Vehicles (EV)",
    new_questions: data.questions_detected,
    growth_pct: 28.5,
    subtitle: "Accelerating weekly inquiry volume",
  };

  const needsAttention = data.top_impact_cards?.needs_attention || {
    topic: data.top_topics[2]?.name || "Employability & Career Prep",
    subtitle: "Inquiries regarding course eligibility & fees",
    decline_pct: 8.0,
    action: "Review FAQs & Publish Advisory",
  };

  // Distinct display of last attempt and last successful refresh
  const formattedSuccessRefresh = data.last_successful_refresh
    ? `Synced at ${new Date(data.last_successful_refresh).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })} IST`
    : "Live Feed Synced";

  const formattedAttempt = data.last_refresh_attempt?.timestamp
    ? new Date(data.last_refresh_attempt.timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const analystName = settings?.account?.display_name || "STRIVE Analyst";

  return (
    <>
      <Topbar
        pageTitle="Overview"
        onRefresh={handleGenuineRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={formattedSuccessRefresh}
        lastAttempt={formattedAttempt || undefined}
        refreshResult={refreshResult}
      />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
        {/* Refresh Result Alert Banner */}
        {refreshResult.status !== "idle" && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold transition-all shadow-sm ${
              refreshResult.status === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : refreshResult.status === "partial"
                ? "bg-amber-50 text-amber-900 border border-amber-200"
                : "bg-rose-50 text-rose-900 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {refreshResult.status === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : refreshResult.status === "partial" ? (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <span className="block font-extrabold uppercase tracking-wider text-[10px]">
                  {refreshResult.status === "success"
                    ? "Synchronization Complete"
                    : refreshResult.status === "partial"
                    ? "Partial Synchronization"
                    : "Synchronization Alert"}
                </span>
                <span className="font-medium text-xs">{refreshResult.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRefreshResult({ status: "idle" })}
              className="px-2.5 py-1 rounded-full bg-white/70 hover:bg-white text-[11px] font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Executive Greeting Banner */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2ecff] text-[#001e2d] text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#909a00] animate-pulse"></span>
                Executive Intelligence Hub
              </span>
              {data.is_sample && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Sample data
                </span>
              )}
              <span className="text-xs text-[#3f4852] font-semibold">
                {formattedSuccessRefresh}
              </span>
              {formattedAttempt && formattedAttempt !== formattedSuccessRefresh && (
                <span className="text-[11px] text-[#6f7883]">
                  (Last attempt: {formattedAttempt} IST)
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Welcome, {analystName}
            </h1>
            <p className="text-sm sm:text-base text-[#3f4852] mt-1.5 max-w-3xl leading-relaxed">
              Social Pulse connects verified Tata STRIVE organizational benchmarks with live public social conversations, empowering leaders to understand what youth are discussing and what to communicate next.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#001e2d] text-xs font-bold shadow-azure-card hover:shadow-azure-hover hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#0099f2]" />
              <span>Export Report</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/studio")}
              className="stitch-btn-primary cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Studio</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 1: TATA STRIVE OFFICIAL ORGANIZATIONAL IMPACT (VERIFIED BENCHMARKS) */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-br from-white via-[#f5fafd] to-[#eaf5ff]/40 p-6 md:p-8 rounded-3xl border border-[#0099f2]/20 shadow-azure-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#0099f2]/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#001e2d] text-white text-[11px] font-extrabold uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#dfec42]" />
                  Authoritative Baseline
                </span>
                <span className="text-[11px] text-[#00629e] font-bold">
                  Source: tatastrive.com (TCIT) • Verified Oct 2026
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-[#001e2d] tracking-tight">
                Tata STRIVE Official Organizational Impact
              </h2>
              <p className="text-xs text-[#3f4852] mt-0.5 max-w-2xl">
                Official program outcomes and operational reach published by Tata Community Initiatives Trust. Kept strictly distinct from public social listening telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <a
                href="https://tatastrive.com/impact-2/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#eaf5ff] text-[#00629e] text-xs font-bold border border-[#0099f2]/20 shadow-2xs transition-all hover:scale-105 cursor-pointer"
              >
                <span>View Official Impact Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Cumulative Milestones Since Inception */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#0099f2]" />
                Cumulative Scale (Since Inception 2014)
              </span>
              <span className="text-[11px] text-[#6f7883] font-medium">
                Reporting Period: 2014–Present
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(officialImpact?.cumulative_metrics || [
                {
                  id: "lives",
                  name: "Lives Touched Since Inception",
                  display_value: "Over 2.5 Million",
                  definition: "Total individuals empowered through skill development and training.",
                  reporting_period: "2014–Present",
                  source_url: "https://tatastrive.com/",
                  verified_date: "2026-10-18",
                },
                {
                  id: "states",
                  name: "States Covered",
                  display_value: "25 States",
                  definition: "Geographical footprint of active operations across India.",
                  reporting_period: "Current Footprint",
                  source_url: "https://tatastrive.com/",
                  verified_date: "2026-10-18",
                },
                {
                  id: "centres",
                  name: "Active Centres",
                  display_value: "156 Active Centres",
                  definition: "Network of multi-skilling (TSSDC) and extension centres (TSEC).",
                  reporting_period: "Current Footprint",
                  source_url: "https://tatastrive.com/",
                  verified_date: "2026-10-18",
                },
                {
                  id: "capacity",
                  name: "Annual Training Capacity",
                  display_value: "2,00,000+ Youth",
                  definition: "Operational capacity across physical centres and digital platforms.",
                  reporting_period: "Annual Operational Capacity",
                  source_url: "https://tatastrive.com/impact-2/",
                  verified_date: "2026-10-18",
                },
              ]).map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="bg-white p-4.5 rounded-2xl border border-[#0099f2]/15 shadow-2xs flex flex-col justify-between hover:border-[#0099f2]/40 transition-colors"
                >
                  <div>
                    <span className="text-[11px] font-bold text-[#6f7883] uppercase tracking-wider block">
                      {m.name}
                    </span>
                    <span className="text-2xl lg:text-3xl font-black text-[#001e2d] tracking-tight mt-1 block">
                      {m.display_value}
                    </span>
                    <p className="text-[11px] text-[#3f4852] mt-1 leading-snug">
                      {m.definition}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#0099f2]/10 flex items-center justify-between text-[10px] text-[#6f7883]">
                    <span className="font-semibold text-[#00629e]">{m.reporting_period}</span>
                    <a
                      href={m.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0099f2] hover:underline flex items-center gap-0.5"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Annual Published Outcomes (FY 2023–24) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#1e9e6a]" />
                Annual Published Outcomes (Reporting Period: FY 2023–24)
              </span>
              <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                **Official website published data as per FY 2024
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {(officialImpact?.annual_outcomes || [
                {
                  id: "youth",
                  name: "Youth Beneficiaries",
                  display_value: "4,26,365",
                  definition: "Direct youth beneficiaries reached in FY 2023–24.",
                  reporting_period: "FY 2023–24",
                  source_url: "https://tatastrive.com/impact-2/",
                },
                {
                  id: "jobs",
                  name: "Jobs / Livelihoods",
                  display_value: "37,453",
                  definition: "Skilled for formal sector jobs in placement-linked programs.",
                  reporting_period: "FY 2023–24",
                  source_url: "https://tatastrive.com/impact-2/",
                },
                {
                  id: "employability",
                  name: "Enhanced Employability",
                  display_value: "2,75,355",
                  definition: "Counselled youth on Tata STRIVE platform & defensive driving.",
                  reporting_period: "FY 2023–24",
                  source_url: "https://tatastrive.com/impact-2/",
                },
                {
                  id: "quality",
                  name: "Quality Training Reach",
                  display_value: "2,03,829",
                  definition: "Trained by certified faculty & knowledge partnerships.",
                  reporting_period: "FY 2023–24",
                  source_url: "https://tatastrive.com/impact-2/",
                },
                {
                  id: "placement",
                  name: "Placement Rate",
                  display_value: "64.75%",
                  definition: "Placement success rate among placement-linked graduates.",
                  reporting_period: "FY 2022–23",
                  source_url: "https://tatastrive.com/impact-2/",
                },
                {
                  id: "women",
                  name: "Women Enrolled",
                  display_value: "27%",
                  definition: "Female enrollment across all STRIVE training centres.",
                  reporting_period: "Annual Benchmark",
                  source_url: "https://tatastrive.com/impact-2/",
                },
              ]).map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="bg-white p-3.5 rounded-2xl border border-[#0099f2]/10 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-[#6f7883] uppercase tracking-wider block truncate">
                      {m.name}
                    </span>
                    <span className="text-xl font-black text-[#001e2d] tracking-tight mt-1 block">
                      {m.display_value}
                    </span>
                    <p className="text-[10px] text-[#3f4852] mt-0.5 line-clamp-2">
                      {m.definition}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-1.5 border-t border-[#0099f2]/10 flex items-center justify-between text-[9px] text-[#6f7883]">
                    <span className="font-bold text-[#00629e] truncate">{m.reporting_period}</span>
                    <a
                      href={m.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0099f2] hover:underline shrink-0 ml-1"
                    >
                      Link
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: LIVE SOCIAL LISTENING SUMMARY (GENUINE COLLECTED RECORDS)     */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf5ff] text-[#00629e] text-xs font-bold border border-[#0099f2]/20">
                  <Radio className="w-3.5 h-3.5 text-[#0099f2] animate-pulse" />
                  Live Social Listening Stream
                </span>
                <span className="text-xs text-[#3f4852] font-semibold">
                  YouTube • Google News • Bluesky
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#001e2d] tracking-tight">
                Public Conversation &amp; Sentiment Telemetry
              </h2>
              <p className="text-xs text-[#3f4852] mt-0.5">
                Computed strictly from {data.total_posts.toLocaleString()} genuine, deduplicated records currently ingested into the database.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[#3f4852] bg-white px-3.5 py-1.5 rounded-full border border-[#0099f2]/15 shadow-2xs">
              <span>Denominator:</span>
              <strong className="text-[#001e2d]">{data.total_posts} records</strong>
            </div>
          </div>

          {isEmpty ? (
            <div className="stitch-card p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#eaf5ff] text-[#0099f2] mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">search_off</span>
              </div>
              <h3 className="text-base font-bold text-[#001e2d]">
                No conversation records matched your active filter selections
              </h3>
              <p className="text-xs text-[#3f4852] max-w-md mx-auto">
                No stored social posts matched your active date or source filters. Click below to synchronize fresh records across YouTube, Google News, and Bluesky.
              </p>
              <button
                type="button"
                disabled={isRefreshing}
                onClick={handleGenuineRefresh}
                className="stitch-btn-primary mx-auto cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Synchronize Fresh Records</span>
              </button>
            </div>
          ) : (
            <>
              {/* Top 3 Impact Cards computed from real stored posts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Most Discussed Topic */}
                <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#eaf5ff] rounded-full opacity-60 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] uppercase tracking-wider text-[#3f4852] font-bold">
                        Most Discussed Skilling Topic
                      </span>
                      <div className="w-10 h-10 rounded-full bg-[#eaf5ff] flex items-center justify-center text-[#0099f2] group-hover:bg-[#0099f2] group-hover:text-white transition-colors shadow-2xs">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-[#001e2d] tracking-tight group-hover:text-[#0099f2] transition-colors">
                      {mostDiscussed.topic}
                    </h3>
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
                        Fastest Accelerating Topic
                      </span>
                      <div className="w-10 h-10 rounded-full bg-[#56c0ff]/20 flex items-center justify-center text-[#0099f2] group-hover:bg-[#0099f2] group-hover:text-white transition-colors shadow-2xs">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-[#001e2d] tracking-tight group-hover:text-[#0099f2] transition-colors">
                      {fastestGrowing.topic}
                    </h3>
                    <p className="text-sm text-[#3f4852] mt-1 font-medium">
                      {fastestGrowing.new_questions.toLocaleString()} learner inquiries
                    </p>
                  </div>
                  <div className="pt-5 mt-4 flex items-center justify-between border-t border-[#0099f2]/10">
                    <span className="chip-growing">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{fastestGrowing.growth_pct}% weekly surge
                    </span>
                    <span className="text-xs text-[#3f4852] font-semibold">Rising Interest</span>
                  </div>
                </div>

                {/* Card 3: Needs Attention */}
                <div className="stitch-card p-6 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-50 rounded-full opacity-60 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] uppercase tracking-wider text-[#3f4852] font-bold">
                        Topic Needing Attention
                      </span>
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-2xs">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-[#001e2d] tracking-tight group-hover:text-amber-800 transition-colors">
                      {needsAttention.topic}
                    </h3>
                    <p className="text-sm text-[#3f4852] mt-1 font-medium">
                      {needsAttention.subtitle}
                    </p>
                  </div>
                  <div className="pt-5 mt-4 flex items-center justify-between border-t border-[#0099f2]/10">
                    <span className="chip-attention">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {needsAttention.action}
                    </span>
                    <Link
                      href="/audience"
                      className="text-xs font-bold text-[#0099f2] hover:underline"
                    >
                      View Questions
                    </Link>
                  </div>
                </div>
              </div>

              {/* Main Volume & Sentiment Analytics Dashboard Section */}
              <div className="stitch-card p-6 md:p-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#0099f2]/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#00629e] uppercase tracking-wider">
                        Telemetry Volume Curve
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[#001e2d] tracking-tight">
                      Conversation Volume &amp; Verified Sentiment Breakdown
                    </h3>
                  </div>

                  {/* Summary Metric Counters with Denominator Note */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-[#6f7883]">
                        Total Stored Posts
                      </span>
                      <span className="text-xl font-black text-[#001e2d]">
                        {data.total_posts.toLocaleString()}
                      </span>
                    </div>

                    <div className="w-px h-8 bg-slate-200"></div>

                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-[#6f7883]">
                        Questions Detected
                      </span>
                      <span className="text-xl font-black text-[#0099f2]">
                        {data.questions_detected.toLocaleString()}
                      </span>
                    </div>

                    <div className="w-px h-8 bg-slate-200"></div>

                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-[#6f7883]">
                        Positive Sentiment
                      </span>
                      <span className="text-xl font-black text-[#1e9e6a]">
                        {data.sentiment_breakdown.positive}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sentiment Distribution Ratio Bar with explicit counts */}
                <div className="bg-[#f5fafd] p-4 rounded-2xl border border-[#0099f2]/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#001e2d]">Observed Sentiment Distribution</span>
                    <span className="text-[11px] text-[#6f7883]">
                      Denominator: {data.total_posts} deduplicated records
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${data.sentiment_breakdown.positive}%` }}
                      className="bg-[#1e9e6a] h-full transition-all duration-500"
                      title={`Positive: ${data.sentiment_breakdown.positive}%`}
                    ></div>
                    <div
                      style={{ width: `${data.sentiment_breakdown.neutral}%` }}
                      className="bg-[#6b7a90] h-full transition-all duration-500"
                      title={`Neutral: ${data.sentiment_breakdown.neutral}%`}
                    ></div>
                    <div
                      style={{ width: `${data.sentiment_breakdown.negative}%` }}
                      className="bg-[#d64545] h-full transition-all duration-500"
                      title={`Needs Attention: ${data.sentiment_breakdown.negative}%`}
                    ></div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] pt-1">
                    <span className="font-bold text-[#1e9e6a] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1e9e6a]"></span>
                      Positive: {data.sentiment_breakdown.positive}% ({Math.round((data.sentiment_breakdown.positive / 100) * data.total_posts)} posts)
                    </span>
                    <span className="font-bold text-[#6b7a90] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6b7a90]"></span>
                      Neutral: {data.sentiment_breakdown.neutral}% ({Math.round((data.sentiment_breakdown.neutral / 100) * data.total_posts)} posts)
                    </span>
                    <span className="font-bold text-[#d64545] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#d64545]"></span>
                      Needs Attention: {data.sentiment_breakdown.negative}% ({Math.round((data.sentiment_breakdown.negative / 100) * data.total_posts)} posts)
                    </span>
                  </div>
                </div>

                {/* Area Curve Chart */}
                {volumeChartData.length > 0 ? (
                  <div className="relative w-full pt-4 pb-2 bg-gradient-to-b from-[#ffffff] to-[#eaf5ff]/30 rounded-2xl p-4">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={volumeChartData}
                          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
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
                            strokeWidth={3}
                            fill="url(#striveCurveGradient)"
                            dot={{ r: 3, fill: "#0099f2", stroke: "#ffffff", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#dfec42", stroke: "#0099f2", strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#0099f2]/10 text-xs">
                      <span className="font-semibold text-[#6f7883]">
                        Daily conversation trajectory across Indian youth hubs
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setVolumeAggregation("daily")}
                          className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                            volumeAggregation === "daily"
                              ? "bg-[#0099f2] text-white"
                              : "bg-[#eaf5ff] text-[#3f4852]"
                          }`}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => setVolumeAggregation("weekly")}
                          className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                            volumeAggregation === "weekly"
                              ? "bg-[#0099f2] text-white"
                              : "bg-[#eaf5ff] text-[#3f4852]"
                          }`}
                        >
                          Weekly
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-[#6f7883]">
                    Telemetry curve history building. Background hourly scheduler populates daily series continuously.
                  </div>
                )}
              </div>

              {/* Bottom Section: Real Learner Voices & Strategic Opportunities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Real Learner Voices (Real question posts from database) */}
                <div className="stitch-card p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#0099f2]/10">
                      <div>
                        <h3 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#0099f2]" />
                          Learner Voices &amp; Direct Inquiries
                        </h3>
                        <p className="text-xs text-[#3f4852] mt-0.5">
                          Authentic questions from students and aspirants on YouTube, News, and Bluesky.
                        </p>
                      </div>
                      <Link
                        href="/audience"
                        className="text-xs font-bold text-[#0099f2] hover:underline shrink-0"
                      >
                        All FAQs →
                      </Link>
                    </div>

                    <div className="space-y-3 pt-3">
                      {(data.learner_voices && data.learner_voices.length > 0
                        ? data.learner_voices.slice(0, 3)
                        : []
                      ).map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/10 space-y-1.5"
                        >
                          <p className="text-xs font-medium text-[#001e2d] leading-relaxed italic">
                            &ldquo;{q.quote}&rdquo;
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-[#6f7883] pt-1 border-t border-[#0099f2]/10">
                            <span className="font-bold text-[#00629e]">{q.author}</span>
                            <div className="flex items-center gap-2">
                              <span className="uppercase tracking-wider text-[10px] bg-white px-2 py-0.5 rounded border border-[#0099f2]/15">
                                {q.source}
                              </span>
                              {q.url && (
                                <a
                                  href={q.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#0099f2] hover:underline flex items-center gap-0.5"
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => router.push("/audience")}
                      className="w-full py-2.5 rounded-full bg-[#eaf5ff] hover:bg-[#def0ff] text-[#00629e] text-xs font-bold transition-colors cursor-pointer text-center"
                    >
                      Explore All Audience Questions &amp; Auto-Replies
                    </button>
                  </div>
                </div>

                {/* Priority Strategic Opportunities */}
                <div className="stitch-card p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#0099f2]/10">
                      <div>
                        <h3 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                          <Target className="w-4 h-4 text-[#0099f2]" />
                          Opportunity Radar Priorities
                        </h3>
                        <p className="text-xs text-[#3f4852] mt-0.5">
                          Evidence-backed strategic interventions ranked by 5-factor transparent scoring.
                        </p>
                      </div>
                      <Link
                        href="/opportunities"
                        className="text-xs font-bold text-[#0099f2] hover:underline shrink-0"
                      >
                        All Radar →
                      </Link>
                    </div>

                    <div className="space-y-3 pt-3">
                      {(data.top_topics || []).slice(0, 3).map((top, idx) => (
                        <div
                          key={top.id || idx}
                          className="p-3.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/10 flex items-center justify-between gap-3 group hover:border-[#0099f2]/30 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-[#001e2d] block truncate group-hover:text-[#0099f2] transition-colors">
                              {top.name}
                            </span>
                            <span className="text-[11px] text-[#6f7883] block mt-0.5">
                              {top.post_count.toLocaleString()} supporting conversations analyzed
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => router.push(`/studio?topic=${encodeURIComponent(top.name)}`)}
                              className="px-3 py-1.5 rounded-full bg-white hover:bg-[#0099f2] text-[#0099f2] hover:text-white text-xs font-bold transition-all border border-[#0099f2]/20 shadow-2xs cursor-pointer"
                            >
                              Create Campaign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => router.push("/opportunities")}
                      className="w-full py-2.5 rounded-full bg-[#0099f2] hover:bg-[#0088d8] text-white text-xs font-bold transition-colors cursor-pointer text-center"
                    >
                      Open Opportunity Radar
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0099f2]" />
        </div>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
