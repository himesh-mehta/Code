"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Sparkles,
  HelpCircle,
  ThumbsUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CommentAnalysisData {
  topic: string;
  totalCommentsAnalyzed: number;
  videosAnalyzed: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
    questionRatio: number;
  };
  topThemes: { theme: string; count: number; sentiment: "positive" | "neutral" | "negative" }[];
  commonQuestions: string[];
  topComments: {
    author: string;
    content: string;
    likes: number;
    postedAt: string;
    sentiment: "positive" | "neutral" | "negative";
    isQuestion: boolean;
  }[];
  executiveSummary: string;
  source: string;
  cached: boolean;
  generatedAt: string;
}

interface Props {
  topic: string;
  onSelectQuestion?: (question: string) => void;
}

export function YoutubeCommentAnalysisCard({ topic, onSelectQuestion }: Props) {
  const [data, setData] = useState<CommentAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);

  const fetchAnalysis = async (searchTopic: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/connectors/youtube/comments-analysis?q=${encodeURIComponent(searchTopic || "Tata STRIVE")}`
      );
      if (!res.ok) throw new Error("Failed to fetch comment analysis");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to analyze YouTube comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(topic);
  }, [topic]);

  if (loading && !data) {
    return (
      <div className="stitch-card p-5 border-l-4 border-l-red-500 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-[16px]">smart_display</span>
            </div>
            <div className="h-4 w-36 bg-gray-200 rounded"></div>
          </div>
          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-10 w-full bg-gray-100 rounded-xl"></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 bg-gray-100 rounded-lg"></div>
          <div className="h-12 bg-gray-100 rounded-lg"></div>
          <div className="h-12 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return null;
  }

  const analysis = data;
  if (!analysis) return null;

  return (
    <section className="stitch-card p-5 border-l-4 border-l-red-500 space-y-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
            <span className="material-symbols-outlined text-[18px]">smart_display</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#001e2d] truncate">
              YouTube Comment Analysis
            </h3>
            <p className="text-[11px] text-[#3f4852] truncate">
              {analysis.totalCommentsAnalyzed} comments ({analysis.videosAnalyzed} videos)
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchAnalysis(topic)}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0f9ff] text-[#00629e] hover:bg-[#def0ff] text-[11px] font-semibold border border-[#cae6fb] shrink-0 cursor-pointer transition-colors"
          title="Refresh live comment analysis"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-[#0099f2]" : ""}`} />
          <span>{loading ? "..." : "Re-Analyze"}</span>
        </button>
      </div>

      {/* AI Community Takeaway */}
      <div className="p-3 rounded-xl bg-[#f5faff] border border-[#0099f2]/15 text-xs text-[#001e2d] leading-relaxed flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
        <div className="text-[11px]">
          <span className="font-bold text-[#00629e]">AI Community Takeaway: </span>
          <span>{analysis.executiveSummary}</span>
        </div>
      </div>

      {/* 3 Metric Stats Tiles (compact row / grid) */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Positive Sentiment */}
        <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
          <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wide block truncate">
            Positive
          </span>
          <div className="text-lg font-black text-emerald-900 leading-tight">
            {analysis.sentimentBreakdown.positive}%
          </div>
          <span className="text-[9px] text-emerald-700 font-medium block truncate">Receptive</span>
        </div>

        {/* Inquiries */}
        <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-200/60">
          <span className="text-[9px] font-bold text-sky-800 uppercase tracking-wide block truncate">
            Inquiries
          </span>
          <div className="text-lg font-black text-sky-900 leading-tight">
            {analysis.sentimentBreakdown.questionRatio}%
          </div>
          <span className="text-[9px] text-sky-700 font-medium block truncate">Questions</span>
        </div>

        {/* Doubts / Clarification */}
        <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/60">
          <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wide block truncate">
            Doubts
          </span>
          <div className="text-lg font-black text-amber-900 leading-tight">
            {analysis.sentimentBreakdown.negative + analysis.sentimentBreakdown.neutral}%
          </div>
          <span className="text-[9px] text-amber-700 font-medium block truncate">Fees / Eligibility</span>
        </div>
      </div>

      {/* Themes & Questions */}
      <div className="space-y-3 text-xs">
        {/* Recurring Themes */}
        <div>
          <span className="font-bold text-[#001e2d] flex items-center gap-1.5 text-[11px] mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0099f2]"></span>
            <span>Recurring Themes</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.topThemes.slice(0, 4).map((theme, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eaf5ff] border border-[#0099f2]/20 text-[#00629e] font-semibold text-[10px]"
              >
                <span>{theme.theme}</span>
                <span className="text-[9px] opacity-75 font-normal">({theme.count})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Common Viewer Questions */}
        {analysis.commonQuestions.length > 0 && (
          <div>
            <span className="font-bold text-[#001e2d] flex items-center gap-1.5 text-[11px] mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              <span>Common Viewer Questions</span>
            </span>
            <div className="space-y-1.5">
              {analysis.commonQuestions.slice(0, 2).map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectQuestion && onSelectQuestion(q)}
                  className="p-2 rounded-lg bg-gray-50 hover:bg-[#def0ff] border border-gray-200/70 hover:border-[#0099f2]/30 text-[#001e2d] text-[11px] transition-colors cursor-pointer flex items-start gap-1.5 group"
                  title="Click to search this question"
                >
                  <HelpCircle className="w-3 h-3 text-[#0099f2] shrink-0 mt-0.5" />
                  <span className="group-hover:text-[#00629e] leading-snug line-clamp-2">
                    &quot;{q}&quot;
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Verbatim Comments */}
      {analysis.topComments.length > 0 && (
        <div className="pt-2 border-t border-[#0099f2]/10 space-y-2">
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-[#00629e] hover:text-[#001e2d] cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-red-500" />
              <span>Verbatim Highlights ({analysis.topComments.length})</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#0099f2]">
              {showComments ? "Collapse" : "View comments"}
              {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </button>

          {showComments && (
            <div className="space-y-2 animate-fade-in-up pt-1">
              {analysis.topComments.slice(0, 3).map((c, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-white border border-[#0099f2]/15 shadow-2xs space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[#001e2d] truncate max-w-[150px]">{c.author}</span>
                    <div className="flex items-center gap-1.5">
                      {c.likes > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-gray-500 font-medium">
                          <ThumbsUp className="w-2.5 h-2.5 text-red-500" />
                          <span>{c.likes}</span>
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          c.sentiment === "positive"
                            ? "bg-emerald-50 text-emerald-700"
                            : c.sentiment === "negative"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.sentiment}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#3f4852] italic text-[11px] leading-relaxed line-clamp-3">
                    &quot;{c.content}&quot;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
