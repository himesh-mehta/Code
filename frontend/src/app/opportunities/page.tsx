"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
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

function OpportunityContent() {
  const { updatePageContext } = usePageContext();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);

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

  // Chart data: Horizontal bar chart of priority scores
  const scoreChartData = opportunities.map((opp) => ({
    name: opp.title.length > 25 ? `${opp.title.slice(0, 25)}...` : opp.title,
    fullTitle: opp.title,
    score: opp.score,
    priority: opp.priority,
    topic: opp.topic,
    evidenceCount: opp.supporting_post_ids.length,
  }));

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case "high":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            High Priority
          </span>
        );
      case "medium":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Medium Priority
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCEFF7] text-[#0067A5] border border-[#008FD3]/30">
            Low Priority
          </span>
        );
    }
  };

  return (
    <>
      <Topbar pageTitle="Opportunity Centre" onRefresh={loadData} />

      <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
              <span>Social Pulse</span>
              <span className="text-[#CBD5E1]">/</span>
              <span>Actionable Prioritization Engine</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#252525] mt-1">
              Opportunity Centre
            </h1>
            <p className="text-sm text-[#666666]">
              Communication intervention windows ranked with transparent criteria, verified evidence, and suggested CTAs.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#E5E7EB] text-xs">
            {["all", "high", "medium"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-md font-semibold transition-all capitalize ${
                  priorityFilter === p
                    ? "bg-[#0067A5] text-white"
                    : "text-[#666666] hover:text-[#252525]"
                }`}
              >
                {p === "all" ? "All Priorities" : `${p} Priority`}
              </button>
            ))}
          </div>
        </header>

        {/* Global Filter Bar */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* Chart 1: Horizontal Bar Chart of Opportunity Priority Scores */}
        <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#0067A5]" />
                Opportunity Priority Score Ranking
              </h2>
              <p className="text-xs text-[#666666]">
                Derived from Volume (25%) + Growth (25%) + Relevance (25%) + Engagement (15%) + Unmet Need (10%)
              </p>
            </div>
            <span className="text-xs font-semibold text-[#0067A5]">
              Threshold: High &ge; 70 pts
            </span>
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={scoreChartData}
                margin={{ top: 5, right: 30, left: 30, bottom: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#666666" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#252525" }} axisLine={false} tickLine={false} width={180} />
                <Tooltip
                  formatter={(val: any, _: any, item: any) => [
                    `${val}/100 points (${item.payload.priority} priority, ${item.payload.evidenceCount} supporting posts)`,
                    item.payload.fullTitle,
                  ]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }}
                />
                <Bar dataKey="score" name="Priority Score" radius={[0, 4, 4, 0]}>
                  {scoreChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.priority === "high" ? "#0067A5" : entry.priority === "medium" ? "#008FD3" : "#93D5F4"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Topic-versus-Opportunity Summary Matrix */}
        <section className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB]">
            <h2 className="text-sm font-bold text-[#252525]">
              Topic versus Opportunity Matrix
            </h2>
            <p className="text-xs text-[#666666]">
              Strategic coverage mapping each focus topic to validated outreach windows
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F7F9] border-b border-[#E5E7EB] text-[#666666] font-semibold">
                  <th className="py-2.5 px-4">Focus Topic</th>
                  <th className="py-2.5 px-4">Identified Opportunity</th>
                  <th className="py-2.5 px-4">Priority Score</th>
                  <th className="py-2.5 px-4">Verified Evidence</th>
                  <th className="py-2.5 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#252525]">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-[#F5F7F9] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#0067A5]">
                      {opp.topic}
                    </td>
                    <td className="py-3 px-4 font-medium max-w-sm">
                      {opp.title}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span className="font-bold text-[#252525]">{opp.score}/100</span>
                        {getPriorityBadge(opp.priority)}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums text-[#666666]">
                      <span className="font-semibold text-[#0067A5]">{opp.supporting_post_ids.length}</span> original posts
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/studio?opportunity=${opp.id}`}
                        className="text-[#0067A5] font-semibold hover:text-[#005588] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Campaign Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Opportunity Cards List with Supporting Posts Detail Panels */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider">
            Detailed Opportunity Cards ({filteredOpportunities.length})
          </h2>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-[#666666] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#0067A5]" />
              <span className="text-xs">Evaluating opportunities and evidence links...</span>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-[#E5E7EB] text-center text-xs text-[#666666]">
              Collect conversations or import a CSV to generate insights
            </div>
          ) : (
            filteredOpportunities.map((opp, index) => {
              const isExpanded = expandedOppId === opp.id;
              return (
                <article
                  key={opp.id}
                  className="bg-white rounded-xl p-6 border border-[#E5E7EB] shadow-xs hover:border-[#0067A5]/50 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs font-bold text-[#0067A5] flex items-center justify-center flex-shrink-0 tabular-nums">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getPriorityBadge(opp.priority)}
                          <span className="text-xs font-semibold text-[#0067A5] bg-[#DCEFF7] px-2 py-0.5 rounded-md border border-[#008FD3]/20">
                            {opp.topic}
                          </span>
                          <span className="text-[11px] text-[#666666] font-semibold">
                            • {opp.supporting_post_ids.length} verified supporting posts
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#252525] mt-1.5">
                          {opp.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-baseline sm:items-end justify-between gap-1 flex-shrink-0">
                      <div className="text-2xl font-extrabold text-[#0067A5] tabular-nums">
                        {opp.score}
                        <span className="text-xs font-normal text-[#666666]">
                          /100
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-[#666666] tracking-wider">
                        Priority Score
                      </span>
                    </div>
                  </div>

                  {/* Why it matters callout */}
                  <div className="p-3.5 rounded-lg bg-[#DCEFF7] border border-[#008FD3]/30 space-y-1">
                    <div className="text-[11px] font-bold text-[#0067A5] uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0067A5]" />
                      <span>Why it matters to Tata STRIVE</span>
                    </div>
                    <p className="text-xs text-[#252525] leading-relaxed">
                      {opp.why_it_matters}
                    </p>
                  </div>

                  {/* Summary & Recommended Action */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-[#666666] block mb-1">
                        Conversation Context:
                      </span>
                      <p className="text-[#252525] leading-relaxed">
                        {opp.summary}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-[#0067A5] block mb-1">
                        Suggested Strategic Action:
                      </span>
                      <p className="text-[#252525] leading-relaxed">
                        {opp.recommended_action}
                      </p>
                    </div>
                  </div>

                  {/* Detail Panel: Supporting Original Posts & Comments */}
                  <div className="pt-2 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => setExpandedOppId(isExpanded ? null : opp.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0067A5] hover:text-[#005588] hover:underline"
                    >
                      <span>{isExpanded ? "Hide original evidence posts" : "View supporting original posts and comments"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-4 bg-[#F5F7F9] rounded-xl border border-[#E5E7EB]">
                        <EvidencePosts
                          postIds={opp.supporting_post_ids}
                          title={`Evidence for ${opp.title}`}
                          subtitle="Direct unfiltered records triggering this score"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#666666]">
                      <span className="font-medium">Channels:</span>
                      <div className="flex items-center gap-1">
                        {opp.platforms.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded bg-[#F5F7F9] text-[10px] font-semibold uppercase text-[#0067A5] border border-[#E5E7EB]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/opportunities/${opp.id}`}
                        className="px-3 py-1.5 rounded-lg border border-[#0067A5] bg-white text-xs font-semibold text-[#0067A5] hover:bg-[#DCEFF7] transition-colors"
                      >
                        Score Breakdown Deep Dive
                      </Link>

                      <Link
                        href={`/studio?opportunity=${opp.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Launch in Content Studio</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </>
  );
}

export default function OpportunityCentrePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#68766F]">Loading opportunity centre...</div>}>
      <OpportunityContent />
    </Suspense>
  );
}
