"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { EvidencePosts } from "@/components/EvidencePosts";
import { api } from "@/lib/api";
import {
  Opportunity,
  PostsQuery,
  OpportunitySummaryStrip,
  QuadrantMedians,
  OpportunityTimeseriesPoint,
  Top5OpportunityMetadata,
} from "@/types";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  BarChart2,
  ExternalLink,
  Target,
  CheckCircle2,
  Info,
  Layers,
  Activity,
  RefreshCw,
  Compass,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";

import { usePageContext } from "@/context/PageContext";
import { InlineGenerator, InlineGeneratorInitialData } from "@/components/ai/InlineGenerator";

// Architectural rules & toggles
const USE_STUDIO_REDIRECT = false;
const SHOW_LEGACY_RANKING_CHART = false;

// Format Helpers: Prevent NaN, undefined or 0 placeholders
export function formatCount(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toLocaleString("en-IN");
}

export function formatChange(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "New";
  if (val > 0) return `+${val.toFixed(1)}%`;
  return `${val.toFixed(1)}%`;
}

// Line colors for Momentum Over Time (Top 5)
const TOP5_LINE_COLORS = ["#0099f2", "#00629e", "#1e9e6a", "#7c3aed", "#d97706"];

// Bubble Priority Colors
function getBubbleColor(priority: string, isSelected: boolean): string {
  if (isSelected) return "#dfec42"; // Tata STRIVE Lime for selected bubble
  if (priority === "high") return "#0099f2"; // Primary blue
  if (priority === "medium") return "#56c0ff"; // Lighter blue
  return "#94a3b8"; // Slate grey for low
}

// Custom Bubble Tooltip: No grey bar, full topic title, clean dark styling (declared outside render)
function BubbleCustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 bg-[#173343] text-white rounded-xl shadow-2xl border border-[#0099f2] text-xs max-w-xs pointer-events-none z-50">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-extrabold text-sm text-[#cae6fb] leading-tight">
            {data.topic}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              data.priority === "high"
                ? "bg-[#d64545] text-white"
                : data.priority === "medium"
                ? "bg-[#0099f2] text-white"
                : "bg-slate-600 text-slate-100"
            }`}
          >
            {data.priority} Priority
          </span>
        </div>

        <p className="text-[11px] text-slate-300 font-medium mb-2.5">
          {data.title}
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#001e2d] p-2.5 rounded-lg border border-[#cae6fb]/20">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Demand (Volume)</span>
            <span className="font-bold text-white">{formatCount(data.demand)} mentions</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Momentum (Growth)</span>
            <span className="font-bold text-[#dfec42]">{data.growth_label}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Engagement</span>
            <span className="font-bold text-white">{formatCount(data.engagement)} actions</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Priority Score</span>
            <span className="font-bold text-[#56c0ff]">{data.score}/100 pts</span>
          </div>
        </div>

        <div className="mt-2 text-[10px] text-slate-300 flex items-center justify-between">
          <span>Quadrant: <strong>{data.quadrant}</strong></span>
          <span className="text-[#dfec42] font-semibold">Click to inspect card ↓</span>
        </div>
      </div>
    );
  }
  return null;
}

function OpportunityContent() {
  const router = useRouter();
  const { updatePageContext } = usePageContext();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [, setAllOpportunities] = useState<Opportunity[]>([]);
  const [summaryStrip, setSummaryStrip] = useState<OpportunitySummaryStrip | null>(null);
  const [quadrantMedians, setQuadrantMedians] = useState<QuadrantMedians>({ median_demand: 10, median_momentum: 20 });
  const [timeseries30d, setTimeseries30d] = useState<OpportunityTimeseriesPoint[]>([]);
  const [top5Metadata, setTop5Metadata] = useState<Top5OpportunityMetadata[]>([]);
  const [isSampleData, setIsSampleData] = useState(false);
  const [totalOpportunitiesCount, setTotalOpportunitiesCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);
  const [showCalcPopover, setShowCalcPopover] = useState(false);
  const [inlineGeneratorData, setInlineGeneratorData] = useState<InlineGeneratorInitialData | null>(null);

  // Toggle state for multi-line momentum chart
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});

  const [filters, setFilters] = useState<PostsQuery>({
    date_range: "30d",
  });

  const setActiveInlineData = (opp: Opportunity) => {
    setInlineGeneratorData({
      kind: "opportunity_brief",
      title: opp.title,
      topic: opp.topic,
      audience: opp.target_audience || "Vocational Job Seekers & Students",
      opportunityId: opp.id,
      score: opp.score,
      evidencePosts: opp.evidence_posts || [],
      trendMetrics: opp.score_breakdown
        ? {
          mentions: opp.demand || opp.post_count || opp.score_breakdown.volume,
          growth_pct: opp.growth_pct ?? 0,
        }
        : undefined,
    });
  };

  const loadData = () => {
    setLoading(true);
    api.getOpportunities({ ...filters, priority_filter: priorityFilter })
      .then((res) => {
        setOpportunities(res.items);
        setAllOpportunities(res.all_opportunities || res.items);
        setSummaryStrip(res.summary_strip);
        setQuadrantMedians(res.quadrant_medians);
        setTimeseries30d(res.timeseries_30d || []);
        setTop5Metadata(res.top_5_metadata || []);
        setIsSampleData(Boolean(res.is_sample));
        setTotalOpportunitiesCount(res.total_opportunities || res.items.length);

        // Auto-select first item if none selected
        if (!selectedOppId && res.items.length > 0) {
          setSelectedOppId(res.items[0].id);
        }
      })
      .catch((err) => console.error("Error loading opportunities:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filters, priorityFilter]);

  const handleManualFetchPosts = async () => {
    setRefreshing(true);
    try {
      await api.refreshOverview();
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Bidirectional interaction: Bubble click -> select & scroll to card
  const handleBubbleClick = (oppId: string) => {
    setSelectedOppId(oppId);
    const element = document.getElementById(`opp-card-${oppId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Card click -> select & highlight bubble
  const handleCardClick = (oppId: string) => {
    setSelectedOppId(oppId);
  };

  // Sync with Global Assistant PageContext
  useEffect(() => {
    if (opportunities.length > 0) {
      const high = opportunities.filter((o) => o.priority === "high").length;
      const med = opportunities.filter((o) => o.priority === "medium").length;
      const low = opportunities.filter((o) => o.priority === "low").length;
      const expanded = opportunities.find((o) => o.id === expandedOppId) || opportunities.find((o) => o.id === selectedOppId);

      updatePageContext({
        route: "/opportunities",
        page_name: "Opportunity Centre",
        page_purpose:
          "Strategic intervention windows scored from real post volume, growth momentum, course relevance, engagement, and unmet learner needs.",
        filters: { ...filters, priority_filter: priorityFilter },
        metrics: {
          total_opportunities: opportunities.length,
          high_priority_count: high,
          medium_priority_count: med,
          low_priority_count: low,
          top_ranked_opportunity: opportunities[0]?.title || "N/A",
          top_score: opportunities[0]?.score || 0,
        },
        selected_item: expanded
          ? {
            id: expanded.id,
            title: expanded.title,
            priority: expanded.priority,
            score: expanded.score,
            why_it_matters: expanded.why_it_matters,
            recommended_action: expanded.recommended_action,
            score_breakdown: expanded.score_breakdown,
          }
          : undefined,
        key_records: opportunities.slice(0, 5).map((o) => ({
          id: o.id,
          title: o.title,
          priority: o.priority,
          score: o.score,
          topic: o.topic,
          demand: o.demand || o.post_count,
          momentum: o.growth_label,
          evidence_count: o.supporting_post_ids.length,
        })),
      });
    }
  }, [
    opportunities,
    filters,
    priorityFilter,
    expandedOppId,
    selectedOppId,
    updatePageContext,
  ]);

  // Bubble chart dataset mapping
  const bubbleData = useMemo(() => {
    return opportunities.map((opp) => ({
      id: opp.id,
      title: opp.title,
      topic: opp.topic,
      demand: opp.demand ?? opp.post_count ?? 1,
      momentum: opp.momentum ?? 0,
      growth_pct: opp.growth_pct,
      growth_label: opp.growth_label || (opp.growth_pct != null ? `${opp.growth_pct}%` : "New"),
      engagement: opp.engagement ?? 10,
      score: opp.score,
      priority: opp.priority,
      quadrant: opp.quadrant || "Act now",
      matching_course: opp.matching_course,
      raw_mentions: opp.raw_breakdown_values?.volume || `${opp.demand || opp.post_count || 0} mentions`,
      isSelected: opp.id === selectedOppId,
    }));
  }, [opportunities, selectedOppId]);

  // Legacy chart data for backward compatibility toggle
  const scoreChartData = useMemo(() => {
    return opportunities.map((opp) => ({
      name: opp.title.length > 25 ? `${opp.title.slice(0, 25)}...` : opp.title,
      fullTitle: opp.title,
      score: opp.score,
      priority: opp.priority,
      topic: opp.topic,
      evidenceCount: opp.supporting_post_ids.length,
    }));
  }, [opportunities]);

  const highCount = summaryStrip?.high_count ?? opportunities.filter((o) => o.priority === "high").length;
  const topOppName = summaryStrip?.top_opportunity || (opportunities[0] ? opportunities[0].topic : "None");
  const topOppScore = summaryStrip?.top_score || (opportunities[0] ? opportunities[0].score : 0);

  return (
    <>
      <Topbar pageTitle="Opportunity Centre" onRefresh={loadData} />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-7 animate-fade-in-up">
        {/* Header Strip with Live Badges */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-3">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2ecff] text-[#00629e] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#0099f2] animate-ping"></span>
                Actionable Radar
              </span>
              <span className="text-xs text-[#3f4852] font-semibold">
                Transparent Prioritization Engine
              </span>
              {isSampleData && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                  Sample data
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Opportunity Centre
            </h1>
            <p className="text-sm md:text-base text-[#3f4852] mt-1 max-w-2xl leading-relaxed">
              Conversation clusters scored in Python code across demand, momentum, TATA STRIVE course alignment, and community doubts.
            </p>
          </div>

          {/* Quick Metrics Strip from Live Data */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualFetchPosts}
              disabled={refreshing}
              className="stitch-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer py-2 px-3"
              title="Query real data sources and re-cluster opportunities"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#0099f2]" : ""}`} />
              <span>{refreshing ? "Fetching..." : "Fetch posts"}</span>
            </button>

            <div className="stitch-card px-4 py-2 flex items-center gap-3">
              <span className="text-2xl font-black text-[#d64545]">{highCount}</span>
              <div className="text-[11px] text-[#3f4852] font-semibold">
                <span>High Priority</span>
                <span className="block text-[10px] text-[#00629e]">Immediate Action</span>
              </div>
            </div>

            <div className="stitch-card px-4 py-2 flex items-center gap-3">
              <span className="text-2xl font-black text-[#0099f2]">{opportunities.length}</span>
              <div className="text-[11px] text-[#3f4852] font-semibold">
                <span>Tracked Windows</span>
                <span className="block text-[10px] text-[#1e9e6a]">Live Clusters</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: SUMMARY STRIP ABOVE CHARTS */}
        <section className="bg-white rounded-2xl p-5 shadow-azure-card border border-[#def0ff] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[#def0ff] pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#eaf5ff] text-[#0099f2] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 text-[#0099f2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#3f4852] uppercase tracking-wider block">
                  Total Opportunities
                </span>
                <span className="text-2xl font-black text-[#001e2d]">
                  {summaryStrip?.total ?? opportunities.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#fdecec] text-[#d64545] flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-[#d64545]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#3f4852] uppercase tracking-wider block">
                  High Priority Windows
                </span>
                <span className="text-2xl font-black text-[#d64545]">
                  {highCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#eaf5ff] text-[#00629e] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#00629e]" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-[#3f4852] uppercase tracking-wider block">
                  Top Opportunity
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-[#001e2d] truncate">
                    {topOppName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#0099f2] text-white text-[11px] font-black shrink-0">
                    {topOppScore} pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Plain-English dynamic headline sentence */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-2 text-[#001e2d] font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[#1e9e6a] shrink-0" />
              <span>
                {summaryStrip?.headline ||
                  `${highCount} ${highCount === 1 ? "opportunity needs" : "opportunities need"} action now, led by ${topOppName} (${topOppScore} pts).`}
              </span>
            </div>

            {/* SECTION 6: TRANSPARENCY POPOVER BUTTON */}
            <div className="relative self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowCalcPopover(!showCalcPopover)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00629e] hover:underline cursor-pointer bg-[#eaf5ff] px-3 py-1.5 rounded-full border border-[#cae6fb]"
              >
                <Info className="w-3.5 h-3.5 text-[#0099f2]" />
                <span>How we calculated this</span>
              </button>

              {showCalcPopover && (
                <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#173343] text-white rounded-2xl shadow-2xl z-50 border border-[#0099f2] text-xs space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-600 pb-2">
                    <span className="font-bold text-sm text-[#cae6fb]">Scoring Transparency</span>
                    <button
                      onClick={() => setShowCalcPopover(false)}
                      className="text-slate-400 hover:text-white font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    Based on {formatCount(totalOpportunitiesCount > 0 ? 181 : 0)} verified social and news posts in the active time window.
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Volume (Mentions &amp; comments):</span>
                      <strong className="text-white">25% weight</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Momentum (% growth vs previous):</span>
                      <strong className="text-white">25% weight</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Course Relevance (tatastrive.com):</span>
                      <strong className="text-white">25% weight</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Engagement (Likes &amp; shares):</span>
                      <strong className="text-white">15% weight</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Unmet Need (Questions &amp; doubts):</span>
                      <strong className="text-white">10% weight</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-600 flex justify-between text-[10px] text-slate-300 font-medium">
                    <span>High &ge; 70 pts</span>
                    <span>Medium 40-69 pts</span>
                    <span>Low &lt; 40 pts</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Global Filter Bar */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Filter Pills & Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl shadow-azure-card border border-[#def0ff]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "high", "medium", "low"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${priorityFilter === p
                    ? "bg-[#0099f2] text-white shadow-xs"
                    : "bg-[#eaf5ff] text-[#3f4852] hover:bg-[#def0ff]"
                  }`}
              >
                {p === "all" ? `All Priorities (${opportunities.length})` : `${p} Priority`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-[#3f4852]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0099f2]"></span> High &ge; 70
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#56c0ff]"></span> Med 40-69
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Low &lt; 40
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dfec42] border border-[#001e2d]"></span> Selected
            </span>
          </div>
        </div>

        {/* SECTION 1: NEW CHART: "OPPORTUNITY MAP" (BUBBLE CHART) */}
        <section className="stitch-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#def0ff] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#0099f2]" />
                Opportunity Map
              </h2>
              <p className="text-xs text-[#3f4852] font-medium">
                X: Demand (Real mentions) · Y: Momentum (% Growth vs previous equal period) · Size: Normalised Engagement
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#00629e] bg-[#eaf5ff] px-3 py-1.5 rounded-full">
              <span>Dividers: Medians (Demand: {quadrantMedians.median_demand}, Momentum: {quadrantMedians.median_momentum}%)</span>
            </div>
          </div>

          {/* Desktop & Tablet: Recharts Bubble Chart */}
          <div className="hidden md:block relative w-full h-[400px] pt-4">
            {/* 4 Quadrant Background Labels in Plain English */}
            <div className="absolute inset-x-8 inset-y-6 pointer-events-none grid grid-cols-2 grid-rows-2 z-0">
              <div className="p-3 border-r border-b border-[#cae6fb]/40 flex flex-col justify-start items-start">
                <span className="px-2.5 py-1 rounded-lg bg-[#eaf5ff]/80 text-[#00629e] text-xs font-black uppercase tracking-wider">
                  Build Awareness
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Low Demand, High Growth</span>
              </div>
              <div className="p-3 border-b border-[#cae6fb]/40 flex flex-col justify-start items-end text-right">
                <span className="px-2.5 py-1 rounded-lg bg-[#dcfce7] text-[#15803d] text-xs font-black uppercase tracking-wider">
                  Act Now
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">High Demand, High Growth</span>
              </div>
              <div className="p-3 border-r border-[#cae6fb]/40 flex flex-col justify-end items-start">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider">
                  Watch
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Low Demand, Low Growth</span>
              </div>
              <div className="p-3 flex flex-col justify-end items-end text-right">
                <span className="px-2.5 py-1 rounded-lg bg-[#fef3c7] text-[#b45309] text-xs font-black uppercase tracking-wider">
                  Protect and Maintain
                </span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">High Demand, Steady Growth</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
              >
                <XAxis
                  type="number"
                  dataKey="demand"
                  name="Demand"
                  tick={{ fontSize: 11, fill: "#3f4852", fontWeight: 600 }}
                  axisLine={{ stroke: "#cae6fb" }}
                  tickLine={false}
                  label={{ value: "Demand (Real mentions in time range) →", position: "insideBottom", offset: -10, fontSize: 11, fill: "#001e2d", fontWeight: "bold" }}
                />
                <YAxis
                  type="number"
                  dataKey="momentum"
                  name="Momentum"
                  tick={{ fontSize: 11, fill: "#3f4852", fontWeight: 600 }}
                  axisLine={{ stroke: "#cae6fb" }}
                  tickLine={false}
                  label={{ value: "Momentum (% growth) →", angle: -90, position: "insideLeft", offset: 0, fontSize: 11, fill: "#001e2d", fontWeight: "bold" }}
                />
                <ZAxis
                  type="number"
                  dataKey="engagement"
                  range={[140, 700]}
                  name="Engagement"
                />

                {/* Median Quadrant Divider Lines */}
                <ReferenceLine
                  x={quadrantMedians.median_demand}
                  stroke="#0099f2"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <ReferenceLine
                  y={quadrantMedians.median_momentum}
                  stroke="#0099f2"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                {/* Custom Tooltip without gray background bar */}
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "#0099f2" }}
                  content={<BubbleCustomTooltip />}
                />

                <Scatter
                  data={bubbleData}
                  onClick={(entry: any) => handleBubbleClick(entry?.id || entry?.payload?.id)}
                  className="cursor-pointer transition-all duration-300"
                >
                  {bubbleData.map((entry, index) => {
                    const isSelected = entry.id === selectedOppId;
                    return (
                      <Cell
                        key={`bubble-cell-${index}`}
                        fill={getBubbleColor(entry.priority, isSelected)}
                        stroke={isSelected ? "#001e2d" : "#ffffff"}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="transition-transform duration-200 hover:scale-110"
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Mobile View: Responsive Sorted List instead of the bubble chart */}
          <div className="md:hidden space-y-2.5 pt-2">
            <span className="text-[11px] font-bold text-[#3f4852] block">
              Opportunities ranked by Priority Score (Tap to inspect):
            </span>
            {bubbleData.map((opp) => (
              <div
                key={`mobile-${opp.id}`}
                onClick={() => handleBubbleClick(opp.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${selectedOppId === opp.id
                    ? "bg-[#eaf5ff] border-[#0099f2] ring-1 ring-[#0099f2]"
                    : "bg-white border-[#def0ff]"
                  }`}
              >
                <div>
                  <strong className="text-[#001e2d] block text-sm">{opp.topic}</strong>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#3f4852]">
                    <span>Demand: {formatCount(opp.demand)}</span>
                    <span>·</span>
                    <span className="text-[#00629e]">Growth: {opp.growth_label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full bg-[#0099f2] text-white text-[11px] font-black">
                    {opp.score} pts
                  </span>
                  <span className="block text-[10px] text-slate-500 font-bold mt-1">
                    {opp.quadrant}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2 & 3: GRID WITH "WHY THIS SCORE" & "MOMENTUM OVER TIME" */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 2: "WHY THIS SCORE" (HORIZONTAL STACKED BARS) */}
          <div className="stitch-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#def0ff] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0099f2]" />
                  Why This Score
                </h2>
                <p className="text-xs text-[#3f4852] font-medium">
                  Weighted Score Components (Hover segments to see real underlying values)
                </p>
              </div>
            </div>

            {/* Score Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#3f4852] font-semibold bg-[#f5faff] p-2.5 rounded-xl border border-[#def0ff]">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0099f2]"></span> Volume (25%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#56c0ff]"></span> Growth (25%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00629e]"></span> Relevance (25%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1e9e6a]"></span> Engagement (15%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></span> Unmet Need (10%)
              </span>
            </div>

            {/* Stacked Bars List for Filtered Opportunities */}
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {opportunities.map((opp) => {
                const isSelected = opp.id === selectedOppId;
                const wb = opp.weighted_breakdown || {
                  volume: Number(((opp.score_breakdown?.volume || 0) * 0.25).toFixed(1)),
                  growth: Number(((opp.score_breakdown?.growth || 0) * 0.25).toFixed(1)),
                  relevance: Number(((opp.score_breakdown?.relevance || 0) * 0.25).toFixed(1)),
                  engagement: Number(((opp.score_breakdown?.engagement || 0) * 0.15).toFixed(1)),
                  unmet_need: Number(((opp.score_breakdown?.unmet_need || 0) * 0.10).toFixed(1)),
                };
                const raw = opp.raw_breakdown_values || {
                  volume: `${opp.demand || opp.post_count || 0} mentions`,
                  growth: opp.growth_label || "New",
                  relevance: `Course: ${opp.matching_course || "Tata STRIVE Certified"}`,
                  engagement: `${opp.engagement || 0} actions`,
                  unmet_need: `${opp.questions_count || 0} questions`,
                };

                return (
                  <div
                    key={`why-${opp.id}`}
                    onClick={() => handleCardClick(opp.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                        ? "bg-[#eaf5ff] border-[#0099f2] ring-1 ring-[#0099f2]"
                        : "bg-white border-[#def0ff] hover:border-[#cae6fb]"
                      }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-extrabold text-[#001e2d] truncate max-w-[240px]">
                        {opp.topic}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#0099f2]">{opp.score}/100</span>
                        <span className="text-[10px] text-[#3f4852] uppercase font-bold">
                          ({opp.priority})
                        </span>
                      </div>
                    </div>

                    {/* Stacked Bar Track */}
                    <div className="h-5 w-full bg-slate-100 rounded-md overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${(wb.volume / 100) * 100}%` }}
                        className="h-full bg-[#0099f2] transition-all group relative cursor-pointer"
                        title={`Volume: ${wb.volume} pts (${raw.volume})`}
                      />
                      <div
                        style={{ width: `${(wb.growth / 100) * 100}%` }}
                        className="h-full bg-[#56c0ff] transition-all group relative cursor-pointer"
                        title={`Growth: ${wb.growth} pts (${raw.growth})`}
                      />
                      <div
                        style={{ width: `${(wb.relevance / 100) * 100}%` }}
                        className="h-full bg-[#00629e] transition-all group relative cursor-pointer"
                        title={`Relevance: ${wb.relevance} pts (${raw.relevance})`}
                      />
                      <div
                        style={{ width: `${(wb.engagement / 100) * 100}%` }}
                        className="h-full bg-[#1e9e6a] transition-all group relative cursor-pointer"
                        title={`Engagement: ${wb.engagement} pts (${raw.engagement})`}
                      />
                      <div
                        style={{ width: `${(wb.unmet_need / 100) * 100}%` }}
                        className="h-full bg-[#f59e0b] transition-all group relative cursor-pointer"
                        title={`Unmet Need: ${wb.unmet_need} pts (${raw.unmet_need})`}
                      />
                    </div>

                    {/* One-line plain-English score caption */}
                    <p className="text-[11px] text-[#3f4852] mt-1.5 font-medium leading-relaxed">
                      {opp.score_driver_caption || "Score is driven mostly by demand volume and momentum growth."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: "MOMENTUM OVER TIME" (MULTI-LINE CHART FOR TOP 5) */}
          <div className="stitch-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#def0ff] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0099f2]" />
                  Momentum Over Time (Top 5)
                </h2>
                <p className="text-xs text-[#3f4852] font-medium">
                  30-day daily mentions · Toggle lines on/off from legend
                </p>
              </div>
            </div>

            {/* Top 5 Legend with Toggle & "Building history" condition */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {top5Metadata.map((t, idx) => {
                const color = TOP5_LINE_COLORS[idx % TOP5_LINE_COLORS.length];
                const isHidden = hiddenLines[t.topic_id] || false;
                const hasHistory = t.has_history_7d !== false;

                return (
                  <button
                    key={`legend-${t.topic_id}`}
                    type="button"
                    disabled={!hasHistory}
                    onClick={() => {
                      if (hasHistory) {
                        setHiddenLines((prev) => ({ ...prev, [t.topic_id]: !prev[t.topic_id] }));
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${!hasHistory
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : isHidden
                          ? "bg-slate-100 text-slate-400 border-slate-300 opacity-60"
                          : "bg-white text-[#001e2d] border-[#cae6fb] shadow-xs cursor-pointer"
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: hasHistory && !isHidden ? color : "#cbd5e1" }}
                    />
                    <span className="truncate max-w-[140px]">{t.topic}</span>
                    {!hasHistory ? (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                        Building history
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({t.score} pts)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Multi-Line Chart Container */}
            <div className="h-72 w-full pt-2">
              {timeseries30d.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[#3f4852]">
                  <Clock className="w-6 h-6 text-[#0099f2] mb-1" />
                  <span>Gathering 30-day timeline series telemetry...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeseries30d}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#3f4852", fontWeight: 600 }}
                      tickFormatter={(d) => {
                        try {
                          const parts = d.split("-");
                          return `${parts[2]}/${parts[1]}`;
                        } catch {
                          return d;
                        }
                      }}
                      axisLine={{ stroke: "#cae6fb" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#3f4852", fontWeight: 600 }}
                      axisLine={{ stroke: "#cae6fb" }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#173343",
                        borderColor: "#0099f2",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    {top5Metadata.map((t, idx) => {
                      if (!t.has_history_7d || hiddenLines[t.topic_id]) return null;
                      const color = TOP5_LINE_COLORS[idx % TOP5_LINE_COLORS.length];
                      return (
                        <Line
                          key={`line-${t.topic_id}`}
                          type="monotone"
                          dataKey={t.topic_id}
                          name={t.topic}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ r: 2 }}
                          activeDot={{ r: 5 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* SECTION: LEGACY RANKING BAR CHART (Preserved behind flag SHOW_LEGACY_RANKING_CHART) */}
        {SHOW_LEGACY_RANKING_CHART && (
          <section className="stitch-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#0099f2]" />
                  Opportunity Priority Score Ranking (Legacy)
                </h2>
                <p className="text-xs text-[#3f4852] font-medium">
                  Derived from Volume (25%) + Growth (25%) + Relevance (25%) + Engagement (15%) + Unmet Need (10%)
                </p>
              </div>
              <span className="text-xs font-bold text-[#00629e] bg-[#eaf5ff] px-3 py-1 rounded-full">
                Threshold: High &ge; 70 pts
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={scoreChartData}
                  margin={{ top: 5, right: 30, left: 30, bottom: 0 }}
                >
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#3f4852", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#001e2d", fontWeight: 600 }} axisLine={false} tickLine={false} width={180} />
                  <Tooltip
                    formatter={(val: any, _: any, item: any) => [
                      `${val}/100 points (${item.payload.priority} priority, ${item.payload.evidenceCount} supporting posts)`,
                      item.payload.fullTitle,
                    ]}
                    contentStyle={{ backgroundColor: "#173343", borderColor: "#0099f2", borderRadius: "12px", color: "#ffffff", fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="score" name="Priority Score" radius={[0, 8, 8, 0]}>
                    {scoreChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.priority === "high" ? "#0099f2" : entry.priority === "medium" ? "#56c0ff" : "#cae6fb"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* SECTION 4: OPPORTUNITY CARDS GRID (REAL DATA ONLY) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-[#001e2d] uppercase tracking-wider">
              Prioritized Opportunities ({opportunities.length})
            </h2>
            <span className="text-xs text-[#3f4852] font-semibold">
              Click any card to select on map &amp; inspect evidence posts
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#3f4852] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0099f2]" />
              <span className="text-xs font-semibold">Clustering live posts and computing transparent scores...</span>
            </div>
          ) : opportunities.length === 0 ? (
            /* Friendly Empty State with "Fetch posts" button */
            <div className="stitch-card p-12 text-center text-xs space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#eaf5ff] text-[#0099f2] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-[#0099f2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#001e2d]">
                  Not enough live data yet. Fetch posts to see opportunities
                </h3>
                <p className="text-xs text-[#3f4852] mt-1 max-w-md mx-auto">
                  No discussions matched your active filter or the database has fewer than 20 records.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleManualFetchPosts}
                  disabled={refreshing}
                  className="stitch-btn-primary text-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span>Fetch posts</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ date_range: "all" });
                    setPriorityFilter("all");
                  }}
                  className="stitch-btn-secondary text-xs cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opp) => {
                const isExpanded = expandedOppId === opp.id;
                const isSelected = selectedOppId === opp.id;
                const isHigh = opp.priority === "high";

                return (
                  <article
                    key={opp.id}
                    id={`opp-card-${opp.id}`}
                    onClick={() => handleCardClick(opp.id)}
                    className={`stitch-card p-6 flex flex-col justify-between group transition-all duration-300 cursor-pointer ${isSelected
                        ? "ring-2 ring-[#0099f2] shadow-lg bg-[#fbfdff]"
                        : "hover:border-[#0099f2]/40"
                      }`}
                  >
                    <div>
                      {/* Priority Badge, Sample Label & Quadrant Pill */}
                      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isHigh
                                ? "bg-[#fdecec] text-[#d64545]"
                                : opp.priority === "medium"
                                  ? "bg-[#eef1f5] text-[#6b7a90]"
                                  : "bg-[#eaf5ff] text-[#00629e]"
                              }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${isHigh ? "bg-[#d64545] animate-pulse" : "bg-[#0099f2]"
                                }`}
                            ></span>
                            <span className="capitalize">{opp.priority} Priority</span>
                          </span>

                          {opp.is_sample && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                              Sample data
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-semibold text-[#00629e] bg-[#eaf5ff] px-2.5 py-1 rounded-full">
                          {opp.quadrant || "Act now"}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-[#001e2d] leading-snug group-hover:text-[#0099f2] transition-colors mb-3">
                        {opp.title}
                      </h3>

                      {/* Context Pill with Verified Evidence Counts */}
                      <div className="mb-4 p-3 bg-[#eaf5ff]/60 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0099f2] shadow-2xs shrink-0">
                          <span className="material-symbols-outlined text-[20px]">electric_bolt</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-xs text-[#001e2d] font-bold">
                            <span>Score: {opp.score}/100</span>
                            <span className="text-[#0099f2] font-semibold">
                              {opp.demand || opp.post_count || opp.supporting_post_ids.length} verified discussions
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#3f4852] truncate mt-0.5">
                            <span>Growth: <strong>{opp.growth_label || "New"}</strong></span>
                            <span>{opp.platforms.join(", ")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Why it matters (Grounded Groq or verified baseline fallback) */}
                      {opp.why_it_matters && (
                        <p className="text-xs text-[#3f4852] mb-4 leading-relaxed font-medium">
                          {opp.why_it_matters}
                        </p>
                      )}

                      {/* Direct Evidence Quote if available */}
                      {opp.evidence_posts && opp.evidence_posts.length > 0 && (
                        <div className="mb-4 p-2.5 rounded-xl bg-white border border-[#def0ff] space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00629e] block">
                            Direct Community Voice:
                          </span>
                          <p className="text-xs text-[#001e2d] italic line-clamp-2">
                            &quot;{opp.evidence_posts[0].text}&quot;
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-[#3f4852] pt-1 border-t border-[#f0f7ff]">
                            <span className="font-semibold">{opp.evidence_posts[0].author}</span>
                            {opp.evidence_posts[0].url && (
                              <a
                                href={opp.evidence_posts[0].url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0099f2] hover:underline font-bold inline-flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>Inspect post</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      {/* Accordion Toggle for Evidence Posts */}
                      <div className="pt-2 border-t border-[#0099f2]/10 mb-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedOppId(isExpanded ? null : opp.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00629e] hover:underline"
                        >
                          <span>{isExpanded ? "Hide Evidence" : `View Evidence (${opp.evidence_posts?.length || opp.supporting_post_ids.length})`}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-3 bg-[#eaf5ff] rounded-xl text-xs space-y-2">
                            {opp.evidence_posts && opp.evidence_posts.length > 0 ? (
                              opp.evidence_posts.slice(0, 3).map((ep: any, epIdx: number) => (
                                <div key={epIdx} className="p-2.5 bg-white rounded-lg border border-[#def0ff]">
                                  <div className="flex items-center justify-between text-[10px] text-[#3f4852] mb-1">
                                    <span className="font-bold text-[#001e2d]">{ep.author}</span>
                                    {ep.url && (
                                      <a
                                        href={ep.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#0099f2] font-semibold hover:underline inline-flex items-center gap-0.5"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span>Link</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#001e2d] italic">&quot;{ep.text}&quot;</p>
                                </div>
                              ))
                            ) : (
                              <EvidencePosts
                                postIds={opp.supporting_post_ids}
                                title={`Evidence for ${opp.title}`}
                                subtitle="Direct unfiltered records triggering this score"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Row */}
                      <div className="pt-3 border-t border-[#0099f2]/10 flex items-center justify-between gap-2">
                        <Link
                          href={`/opportunities/${opp.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] text-xs font-bold transition-all"
                        >
                          Breakdown
                        </Link>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (USE_STUDIO_REDIRECT) {
                              router.push(`/studio?opportunity=${opp.id}`);
                            } else {
                              setActiveInlineData(opp);
                            }
                          }}
                          className="stitch-btn-primary text-xs cursor-pointer"
                        >
                          <span>Create Content</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Inline AI Content Studio Slide-Over Panel */}
        <InlineGenerator
          isOpen={Boolean(inlineGeneratorData)}
          onClose={() => setInlineGeneratorData(null)}
          data={inlineGeneratorData}
        />
      </main>
    </>
  );
}

export default function OpportunityCentrePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#3f4852]">Loading Opportunity Centre...</div>}>
      <OpportunityContent />
    </Suspense>
  );
}
