"use client";

import React, { useState, useEffect } from "react";
import { Post } from "@/types";
import {
  X,
  ExternalLink,
  Newspaper,
  Calendar,
  Tag,
  Smile,
  Building2,
  Sparkles,
  Loader2,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";

interface Props {
  post: Post | null;
  onClose: () => void;
}

interface NewsAnalysisResult {
  summary: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sentiment_score?: number;
  topics?: string[];
  keywords?: string[];
  relevance: "high" | "medium" | "low";
  relevance_reason: string;
  entities?: string[];
  opportunities?: string[];
  risks?: string[];
  is_limited_analysis?: boolean;
  model?: string;
  analyzed_at?: string;
}

export function ArticleDetailModal({ post, onClose }: Props) {
  const [analysis, setAnalysis] = useState<NewsAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
  }, [post]);

  if (!post) return null;

  const publisher = post.domain || post.author_handle || "News Source";
  const title = post.article_title || post.content;

  const handleRunAiAnalysis = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/news/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt: post.content,
          url: post.url || "",
          domain: publisher,
          source: post.platform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Analysis failed (HTTP ${res.status})`);
      }

      setAnalysis(data);
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to analyze article with AI.");
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F5F7F9]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Newspaper className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#252525]">{publisher}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded border border-amber-200">
                  {post.platform === "gdelt" ? "GDELT DOC 2.0" : "Google News Wire"}
                </span>
              </div>
              <p className="text-[11px] text-[#666666]">Original Press Dispatch &amp; Intelligence Analysis</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#666666] hover:text-[#252525] hover:bg-gray-200/60 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#252525]">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCEFF7] text-[#0067A5] font-semibold border border-[#008FD3]/30">
              <Tag className="w-3 h-3" />
              <span>{post.topic}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border ${
                post.sentiment === "positive"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : post.sentiment === "negative"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }`}
            >
              <Smile className="w-3 h-3" />
              <span className="capitalize">{post.sentiment} Tone</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[#666666]">
              <Calendar className="w-3 h-3" />
              <span>Published {formatDate(post.posted_at)}</span>
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-lg sm:text-xl font-bold text-[#252525] leading-snug">
            {title}
          </h2>

          {/* Media image if genuinely provided by source */}
          {post.media_url && (
            <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-100 border border-[#E5E7EB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.media_url}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Original Article Content / Accessible Excerpt */}
          <div className="space-y-2 bg-[#F5F7F9] p-4 rounded-xl border border-[#E5E7EB]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0067A5] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Original Article Excerpt</span>
            </h3>
            <p className="text-[13px] text-[#252525] leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Groq AI Analysis Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  AI News Intelligence (Groq / Llama 3.3)
                </h3>
              </div>

              {!analysis && (
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={analyzing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run AI Analysis</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {analysisError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Analysis Notice: </span>
                  <span>{analysisError}</span>
                </div>
              </div>
            )}

            {analysis && (
              <div className="space-y-3 p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 animate-in fade-in">
                {/* AI Summary */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block mb-1">
                    Executive Summary
                  </span>
                  <p className="text-xs text-[#252525] leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>

                {/* Relevance & Sentiment row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-100">
                  <div className="p-2.5 rounded-lg bg-white border border-purple-100">
                    <span className="text-[10px] font-semibold text-[#666666] uppercase block">
                      Relevance to Tata STRIVE
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-bold uppercase ${
                        analysis.relevance === "high"
                          ? "text-emerald-700"
                          : analysis.relevance === "medium"
                          ? "text-blue-700"
                          : "text-gray-600"
                      }`}>
                        {analysis.relevance} Relevance
                      </span>
                    </div>
                    <p className="text-[11px] text-[#666666] mt-1 leading-snug">
                      {analysis.relevance_reason}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-purple-100">
                    <span className="text-[10px] font-semibold text-[#666666] uppercase block">
                      AI Sentiment Assessment
                    </span>
                    <span className="text-xs font-bold capitalize text-[#252525] block mt-0.5">
                      {analysis.sentiment}
                      {analysis.sentiment_score ? ` (${Math.round(analysis.sentiment_score * 100)}% confidence)` : ""}
                    </span>
                    {analysis.keywords && analysis.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {analysis.keywords.slice(0, 4).map((kw, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-semibold">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Opportunities & Risks */}
                {(analysis.opportunities?.length || analysis.risks?.length) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-100">
                    {analysis.opportunities && analysis.opportunities.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-emerald-600" />
                          <span>Strategic Opportunities</span>
                        </span>
                        <ul className="list-disc list-inside text-[11px] text-[#252525] space-y-0.5">
                          {analysis.opportunities.map((op, i) => (
                            <li key={i}>{op}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.risks && analysis.risks.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Identified Risks / Barriers</span>
                        </span>
                        <ul className="list-disc list-inside text-[11px] text-[#252525] space-y-0.5">
                          {analysis.risks.map((rk, i) => (
                            <li key={i}>{rk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 text-[10px] text-purple-800/80 flex items-center justify-between border-t border-purple-100">
                  <span>AI Generated Analysis • Model: {analysis.model || "Groq Fast Inference"}</span>
                  {analysis.is_limited_analysis && (
                    <span className="italic">Based on accessible headline &amp; excerpt</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] bg-[#F5F7F9]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#666666] hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            Close Reader
          </button>

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0067A5] hover:bg-[#005588] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Read Full Article on {publisher}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
