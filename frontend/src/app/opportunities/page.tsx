"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { EvidencePosts } from "@/components/EvidencePosts";
import { api } from "@/lib/api";
import { Opportunity, Priority, PostsQuery } from "@/types";
import {
  Radar,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  BarChart2,
  ExternalLink,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { usePageContext } from "@/context/PageContext";
import { InlineGenerator, InlineGeneratorInitialData } from "@/components/ai/InlineGenerator";

// Architectural rule: When false, opens slide-over panel on the same page.
const USE_STUDIO_REDIRECT = false;

function OpportunityContent() {
  const router = useRouter();
  const { updatePageContext } = usePageContext();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);
  const [inlineGeneratorData, setInlineGeneratorData] = useState<InlineGeneratorInitialData | null>(null);

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
            mentions: opp.score_breakdown.volume,
            growth_pct: opp.score_breakdown.growth,
          }
        : undefined,
    });
  };

  const [filters, setFilters] = useState<PostsQuery>({
    date_range: "30d",
  });

  const loadData = () => {
    setLoading(true);
    api.getOpportunities(filters)
      .then((res) => setOpportunities(res.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    if (opportunities.length > 0) {
      const high = opportunities.filter((o) => o.priority === "high").length;
      const med = opportunities.filter((o) => o.priority === "medium").length;
      const low = opportunities.filter((o) => o.priority === "low").length;
      const expanded = opportunities.find((o) => o.id === expandedOppId);

      updatePageContext({
        route: "/opportunities",
        page_name: "Opportunity Centre",
        page_purpose:
          "Prioritized conversation-to-campaign opportunities with transparent scoring breakdown (volume, growth, relevance, engagement, and unmet need).",
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
          evidence_count: o.supporting_post_ids.length,
        })),
      });
    }
  }, [
    opportunities,
    filters,
    priorityFilter,
    expandedOppId,
    updatePageContext,
  ]);

  const filteredOpportunities = opportunities.filter((opp) => {
    if (priorityFilter === "all") return true;
    return opp.priority === priorityFilter;
  });

  const scoreChartData = opportunities.map((opp) => ({
    name: opp.title.length > 25 ? `${opp.title.slice(0, 25)}...` : opp.title,
    fullTitle: opp.title,
    score: opp.score,
    priority: opp.priority,
    topic: opp.topic,
    evidenceCount: opp.supporting_post_ids.length,
  }));

  const highCount = opportunities.filter((o) => o.priority === "high").length;

  return (
    <>
      <Topbar pageTitle="Opportunity Centre" onRefresh={loadData} />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-7 animate-fade-in-up">
        {/* Header from Stitch */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2ecff] text-[#00629e] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#0099f2] animate-ping"></span>
                Actionable Radar
              </span>
              <span className="text-xs text-[#3f4852] font-semibold">
                Prioritized intervention windows
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Opportunity Centre
            </h1>
            <p className="text-sm md:text-base text-[#3f4852] mt-1 max-w-2xl leading-relaxed">
              Communication intervention windows ranked with transparent criteria, verified evidence, and suggested CTAs.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-3">
            <div className="stitch-card px-4 py-2 flex items-center gap-3">
              <span className="text-2xl font-black text-[#d64545]">{highCount}</span>
              <div className="text-[11px] text-[#3f4852] font-semibold">
                <span>High Priority</span>
                <span className="block text-[10px] text-[#00629e]">Immediate Action</span>
              </div>
            </div>
            <div className="stitch-card px-4 py-2 flex items-center gap-3">
              <span className="text-2xl font-black text-[#0099f2]">84%</span>
              <div className="text-[11px] text-[#3f4852] font-semibold">
                <span>Cohort Match</span>
                <span className="block text-[10px] text-[#1e9e6a]">Optimal Window</span>
              </div>
            </div>
          </div>
        </section>

        {/* Global Filter Bar */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Filter Pills & Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl shadow-azure-card">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "high", "medium", "low"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                  priorityFilter === p
                    ? "bg-[#0099f2] text-white shadow-xs"
                    : "bg-[#eaf5ff] text-[#3f4852] hover:bg-[#def0ff]"
                }`}
              >
                {p === "all" ? `All (${opportunities.length})` : `${p} Priority`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#3f4852] font-semibold">
              Transparent Priority Scoring Algorithm
            </span>
          </div>
        </div>

        {/* Chart: Horizontal Bar Chart of Opportunity Priority Scores */}
        <section className="stitch-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#0099f2]" />
                Opportunity Priority Score Ranking
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

        {/* Opportunity Cards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-[#001e2d] uppercase tracking-wider">
              Prioritized Opportunities ({filteredOpportunities.length})
            </h2>
            <span className="text-xs text-[#3f4852] font-semibold">
              Click any card to inspect evidence posts
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#3f4852] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0099f2]" />
              <span className="text-xs font-semibold">Evaluating opportunities and evidence links...</span>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="stitch-card p-12 text-center text-xs text-[#3f4852] font-semibold">
              No opportunities matching this priority filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpportunities.map((opp, index) => {
                const isExpanded = expandedOppId === opp.id;
                const isHigh = opp.priority === "high";

                return (
                  <article
                    key={opp.id}
                    className="stitch-card p-6 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Priority Badge, Sample Label & Category Pill */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              isHigh
                                ? "bg-[#fdecec] text-[#d64545]"
                                : opp.priority === "medium"
                                ? "bg-[#eef1f5] text-[#6b7a90]"
                                : "bg-[#eaf5ff] text-[#00629e]"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isHigh ? "bg-[#d64545] animate-pulse" : "bg-[#0099f2]"
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

                        <span className="text-xs font-semibold text-[#3f4852] bg-[#eaf5ff] px-2.5 py-1 rounded-full">
                          {opp.topic}
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
                              {opp.post_count || opp.supporting_post_ids.length} verified discussions
                            </span>
                          </div>
                          <p className="text-[11px] text-[#3f4852] truncate mt-0.5">
                            {opp.platforms.join(", ")}
                          </p>
                        </div>
                      </div>

                      {/* Why it matters */}
                      <p className="text-xs text-[#3f4852] mb-4 leading-relaxed font-medium">
                        {opp.why_it_matters}
                      </p>

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
                          onClick={() => setExpandedOppId(isExpanded ? null : opp.id)}
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
                          className="px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] text-xs font-bold transition-all"
                        >
                          Breakdown
                        </Link>

                        <button
                          onClick={() => {
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
