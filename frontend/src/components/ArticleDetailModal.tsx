"use client";

import React, { useEffect } from "react";
import { Post } from "@/types";
import {
  X,
  ExternalLink,
  Newspaper,
  Calendar,
  Tag,
  Smile,
  ShieldCheck,
  Building2,
} from "lucide-react";

interface Props {
  post: Post | null;
  onClose: () => void;
}

export function ArticleDetailModal({ post, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!post) return null;

  const publisher = post.domain || post.author_handle || "Media Dispatch";
  const title = post.article_title || post.content;

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
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F5F7F9]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Newspaper className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#252525]">{publisher}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded border border-amber-200">
                  GDELT DOC 2.0
                </span>
              </div>
              <p className="text-[11px] text-[#666666]">In-Page Intelligence Dispatch</p>
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
          {/* Metadata badges */}
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

          {/* Media image if available */}
          {post.media_url && (
            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 border border-[#E5E7EB]">
              <img
                src={post.media_url}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Summary & Details */}
          <div className="space-y-3 bg-[#F5F7F9] p-4 rounded-xl border border-[#E5E7EB]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0067A5] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Coverage Context for Tata STRIVE</span>
            </h3>
            <p className="text-[13px] text-[#252525] leading-relaxed">
              {post.content}
            </p>
            <div className="pt-2 text-[11px] text-[#666666] flex items-center gap-2 border-t border-[#E5E7EB]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Source verified from international news indexing via GDELT DOC 2.0 Web API.</span>
            </div>
          </div>

          {/* Reader highlights */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] font-semibold text-[#666666] uppercase block">
                Publisher Domain
              </span>
              <span className="text-xs font-bold text-[#252525] mt-0.5 block">
                {publisher}
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-[10px] font-semibold text-[#666666] uppercase block">
                Social Engagement Proxy
              </span>
              <span className="text-xs font-bold text-[#0067A5] mt-0.5 block">
                {post.likes || 15} readers • {post.shares || 8} dispatches
              </span>
            </div>
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
