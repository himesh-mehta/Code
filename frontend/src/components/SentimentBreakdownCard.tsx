"use client";

import React, { useState } from "react";
import { Post, Platform } from "@/types";
import {
  computeInDepthSentiment,
  InDepthSentimentAnalysis,
  SentimentRowData,
} from "@/lib/feed-analytics";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Sparkles,
  BarChart2,
} from "lucide-react";

interface Props {
  posts: Post[];
  loading?: boolean;
  searchQuery?: string;
  dateRange?: string;
}

export function SentimentBreakdownCard({
  posts,
  loading = false,
  searchQuery,
  dateRange = "30d",
}: Props) {
  const [expandedSection, setExpandedSection] = useState<"positive" | "neutral" | "negative" | null>(null);

  if (loading) {
    return (
      <div className="stitch-card p-5 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-10 bg-gray-100 rounded-xl"></div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-100 rounded-xl"></div>
          <div className="h-12 bg-gray-100 rounded-xl"></div>
          <div className="h-12 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (posts.length < 5) {
    return (
      <div className="stitch-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#001e2d]">Sentiment Breakdown</h3>
          <span className="text-[11px] text-[#3f4852] font-semibold">N={posts.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center space-y-1.5">
          <Info className="w-5 h-5 text-gray-400 mx-auto" />
          <p className="text-xs font-semibold text-[#001e2d]">Not enough posts to analyse yet</p>
          <p className="text-[11px] text-[#6f7883]">
            Collect at least 5 matching conversation records to unlock in-depth sentiment themes.
          </p>
        </div>
      </div>
    );
  }

  const analysis: InDepthSentimentAnalysis = computeInDepthSentiment(posts, searchQuery, dateRange);

  const toggleExpand = (section: "positive" | "neutral" | "negative") => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const getSourceIcon = (plat: Platform) => {
    switch (plat) {
      case "youtube":
        return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-200">YT</span>;
      case "bluesky":
        return <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">BSky</span>;
      case "google_news":
        return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">News</span>;
      case "gdelt":
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">GDELT</span>;
      case "google_maps":
        return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">Places</span>;
      default:
        return <span className="text-[10px] font-bold text-gray-600 bg-gray-50 px-1 py-0.2 rounded border border-gray-200">{plat}</span>;
    }
  };

  const renderSentimentRow = (
    key: "positive" | "neutral" | "negative",
    label: string,
    data: SentimentRowData,
    colorClasses: {
      text: string;
      bar: string;
      bg: string;
      badge: string;
    }
  ) => {
    const isExpanded = expandedSection === key;

    return (
      <div className={`p-3 rounded-xl border transition-all ${isExpanded ? `${colorClasses.bg} border-transparent` : "bg-white border-[#E5E7EB]"}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${colorClasses.bar}`}></span>
            <span className="text-xs font-bold text-[#001e2d]">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#6f7883]">{data.count} posts</span>
            <span className={`text-xs font-black ${colorClasses.text}`}>{data.percentage}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClasses.bar}`}
            style={{ width: `${data.percentage}%` }}
          ></div>
        </div>

        {/* Themes reason */}
        {data.themes.length > 0 && (
          <p className="text-[11px] text-[#3f4852] leading-snug">
            <span className="font-semibold text-[#001e2d]">Key themes: </span>
            <span>{data.themes.join(", ")}</span>
          </p>
        )}

        {/* See examples toggle */}
        {data.examples.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            <button
              type="button"
              onClick={() => toggleExpand(key)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00629e] hover:underline cursor-pointer"
            >
              <span>{isExpanded ? "Hide examples" : `See ${data.examples.length} examples`}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-2 animate-fade-in-up">
                {data.examples.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-2.5 rounded-lg bg-white border border-[#E5E7EB] shadow-2xs text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {getSourceIcon(ex.platform)}
                        <span className="font-bold text-[#001e2d] truncate max-w-[130px]">{ex.author}</span>
                      </div>
                      {ex.url && (
                        <a
                          href={ex.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0099f2] hover:underline inline-flex items-center gap-0.5 text-[10px]"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-[#3f4852] italic text-[11px] leading-relaxed line-clamp-2">
                      &quot;{ex.snippet}&quot;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="stitch-card p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#001e2d]">Sentiment Breakdown</h3>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#d2ecff] text-[#00629e]">
            {analysis.totalAnalyzed} Total
          </span>
        </div>
        <p className="text-[11px] text-[#6f7883] mt-0.5 leading-snug">
          {analysis.headerTitle}
        </p>
      </div>

      {/* Summary sentence */}
      <div className="p-3 rounded-xl bg-[#f5faff] border border-[#0099f2]/15 text-xs text-[#001e2d] flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed font-medium">
          {analysis.summarySentence}
        </p>
      </div>

      {/* 3 Sentiment Rows */}
      <div className="space-y-2.5">
        {renderSentimentRow("positive", "Positive", analysis.positive, {
          text: "text-emerald-700",
          bar: "bg-emerald-500",
          bg: "bg-emerald-50/50",
          badge: "bg-emerald-100 text-emerald-800",
        })}

        {renderSentimentRow("neutral", "Neutral", analysis.neutral, {
          text: "text-slate-600",
          bar: "bg-slate-400",
          bg: "bg-slate-50/50",
          badge: "bg-slate-100 text-slate-800",
        })}

        {renderSentimentRow("negative", "Negative", analysis.negative, {
          text: "text-rose-600",
          bar: "bg-rose-500",
          bg: "bg-rose-50/50",
          badge: "bg-rose-100 text-rose-800",
        })}
      </div>

      {/* Sentiment by Source Mini Strip */}
      {analysis.sourceMoods.length > 0 && (
        <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#001e2d]">
            <span className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3 text-[#0099f2]" />
              <span>Sentiment by source</span>
            </span>
            <span className="text-[10px] text-[#6f7883] font-normal">Pos / Neu / Neg</span>
          </div>

          <div className="space-y-1.5">
            {analysis.sourceMoods.map((sm) => (
              <div key={sm.platform} className="flex items-center gap-2 text-[10px]">
                <span className="w-20 truncate font-semibold text-[#3f4852]">{sm.source}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden flex bg-gray-100">
                  <div
                    style={{ width: `${sm.posPct}%` }}
                    className="h-full bg-emerald-500"
                    title={`Positive: ${sm.posPct}%`}
                  ></div>
                  <div
                    style={{ width: `${sm.neuPct}%` }}
                    className="h-full bg-slate-400"
                    title={`Neutral: ${sm.neuPct}%`}
                  ></div>
                  <div
                    style={{ width: `${sm.negPct}%` }}
                    className="h-full bg-rose-500"
                    title={`Negative: ${sm.negPct}%`}
                  ></div>
                </div>
                <span className="text-[10px] font-mono text-[#6f7883] w-12 text-right">
                  {sm.total} ({sm.posPct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
