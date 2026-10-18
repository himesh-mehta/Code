"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Sparkles,
  HelpCircle,
  TrendingUp,
  ThumbsUp,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
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
  const [showAllQuotes, setShowAllQuotes] = useState(false);

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
      <div className="stitch-card p-6 border-l-4 border-l-red-500 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-[18px]">smart_display</span>
            </div>
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-12 w-full bg-gray-100 rounded-xl"></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-gray-100 rounded-xl"></div>
          <div className="h-16 bg-gray-100 rounded-xl"></div>
          <div className="h-16 bg-gray-100 rounded-xl"></div>
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
    <section className="stitch-card p-6 border-l-4 border-l-red-500 space-y-5 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 shadow-2xs border border-red-200">
            <span className="material-symbols-outlined text-[20px]">smart_display</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#001e2d]">
                YouTube Community Comment Analysis
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[11px] font-bold">
                Topic: {analysis.topic}
              </span>
            </div>
            <p className="text-xs text-[#3f4852] mt-0.5">
              Synthesized from {analysis.totalCommentsAnalyzed} viewer comments across {analysis.videosAnalyzed} top YouTube videos
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchAnalysis(topic)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0f9ff] text-[#00629e] hover:bg-[#def0ff] text-xs font-semibold border border-[#cae6fb] self-start sm:self-auto cursor-pointer transition-colors"
          title="Refresh live comment analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0099f2]" : ""}`} />
          <span>{loading ? "Analyzing..." : "Re-Analyze"}</span>
        </button>
      </div>

      {/* Executive Takeaway */}
      <div className="p-3.5 rounded-xl bg-[#f5faff] border border-[#0099f2]/15 text-xs text-[#001e2d] leading-relaxed flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-[#0099f2] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#00629e]">AI Community Takeaway: </span>
          <span>{analysis.executiveSummary}</span>
        </div>
      </div>

      {/* 3 Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Positive Sentiment */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
              Positive Sentiment
            </span>
            <div className="text-2xl font-extrabold text-emerald-900 mt-0.5">
              {analysis.sentimentBreakdown.positive}%
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">Receptive community tone</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Questions Detected */}
        <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wide">
              Inquiry Ratio
            </span>
            <div className="text-2xl font-extrabold text-sky-900 mt-0.5">
              {analysis.sentimentBreakdown.questionRatio}%
            </div>
            <span className="text-[10px] text-sky-700 font-medium">Direct learner questions</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700">
            <HelpCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Critical/Constructive */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
              Clarification Needs
            </span>
            <div className="text-2xl font-extrabold text-amber-900 mt-0.5">
              {analysis.sentimentBreakdown.negative + analysis.sentimentBreakdown.neutral}%
            </div>
            <span className="text-[10px] text-amber-700 font-medium">Fees, eligibility &amp; doubts</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Themes & Common Questions Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Left: Top Recurring Themes */}
        <div className="space-y-2.5">
          <span className="font-bold text-[#001e2d] flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#0099f2]"></span>
            <span>Recurring Comment Themes</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {analysis.topThemes.map((theme, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eaf5ff] border border-[#0099f2]/20 text-[#00629e] font-semibold text-xs"
              >
                <span>{theme.theme}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#0099f2]/10 text-[#0099f2] text-[10px] font-bold">
                  {theme.count} mentions
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: Top Learner Inquiries */}
        <div className="space-y-2.5">
          <span className="font-bold text-[#001e2d] flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Common Viewer Questions</span>
          </span>
          <div className="space-y-2">
            {analysis.commonQuestions.slice(0, 3).map((q, idx) => (
              <div
                key={idx}
                onClick={() => onSelectQuestion && onSelectQuestion(q)}
                className="p-2.5 rounded-lg bg-gray-50 hover:bg-[#def0ff] border border-gray-200/70 hover:border-[#0099f2]/30 text-[#001e2d] text-xs transition-colors cursor-pointer flex items-start gap-2 group"
                title="Click to focus on this inquiry"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#0099f2] flex-shrink-0 mt-0.5" />
                <span className="group-hover:text-[#00629e] leading-snug line-clamp-2">
                  &quot;{q}&quot;
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Comment Quotes */}
      {analysis.topComments.length > 0 && (
        <div className="pt-2 border-t border-[#0099f2]/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#001e2d] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-red-500" />
              <span>Verbatim Comment Highlights from Live YouTube Videos</span>
            </span>
            <button
              onClick={() => setShowAllQuotes(!showAllQuotes)}
              className="text-[11px] font-semibold text-[#0099f2] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllQuotes ? "Show Less" : `View ${analysis.topComments.length} Comments`}</span>
              {showAllQuotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="space-y-2">
            {(showAllQuotes ? analysis.topComments : analysis.topComments.slice(0, 2)).map((c, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-[#0099f2]/15 shadow-2xs space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#001e2d]">{c.author}</span>
                  <div className="flex items-center gap-2">
                    {c.likes > 0 && (
                      <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                        <ThumbsUp className="w-3 h-3 text-red-500" />
                        <span>{c.likes}</span>
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                <p className="text-[#3f4852] italic leading-relaxed">
                  &quot;{c.content}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
