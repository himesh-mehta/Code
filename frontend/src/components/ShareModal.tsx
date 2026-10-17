"use client";

import React, { useState, useEffect } from "react";
import { Post, Platform } from "@/types";
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Mail,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface Props {
  post: Post | null;
  onClose: () => void;
}

export function ShareModal({ post, onClose }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!post) return null;

  const directUrl =
    post.url || (typeof window !== "undefined" ? `${window.location.origin}/feed?id=${post.id}` : "");

  const summaryText = `📢 [Social Pulse - Tata STRIVE Social Listening]
Source: ${post.platform.toUpperCase()} | Author: ${post.author_handle}
Topic: ${post.topic} | Sentiment: ${post.sentiment}
Discussion: "${post.content}"
${directUrl ? `Reference Link: ${directUrl}` : ""}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Social Pulse Insight: ${post.topic}`,
          text: `"${post.content.slice(0, 140)}..." by ${post.author_handle}`,
          url: directUrl,
        });
      } catch {}
    }
  };

  const encodedUrl = encodeURIComponent(directUrl);
  const encodedText = encodeURIComponent(
    `Tata STRIVE Social Listening Signal (${post.topic}): "${post.content.slice(0, 120)}..."\n${directUrl}`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F5F7F9]">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#DCEFF7] text-[#0067A5]">
              <Share2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#252525]">Share Conversation Insight</h3>
              <p className="text-[11px] text-[#666666]">
                Broadcast this signal to team members or external channels
              </p>
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

        {/* Content Preview */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#252525]">{post.author_handle}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#DCEFF7] text-[#0067A5] border border-[#008FD3]/30">
                {post.topic}
              </span>
            </div>
            <p className="text-xs text-[#252525] leading-relaxed line-clamp-3 italic">
              &ldquo;{post.content}&rdquo;
            </p>
          </div>

          {/* Quick Copy Options */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666] block">
              1-Click Copy
            </label>

            {/* Direct Link */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directUrl}
                className="flex-1 h-9 px-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#666666] select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 shadow-2xs ${
                  copiedLink
                    ? "bg-emerald-600 text-white"
                    : "bg-[#0067A5] hover:bg-[#005588] text-white"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Copy Full Team Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                copiedSummary
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-white hover:bg-[#DCEFF7] text-[#0067A5] border-[#008FD3]/40"
              }`}
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Team Summary Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#0067A5]" />
                  <span>Copy Formatted Insight for Slack / Teams / WhatsApp</span>
                </>
              )}
            </button>
          </div>

          {/* Social Destination Buttons */}
          <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666] block">
              Share to Channels
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 p-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 p-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>LinkedIn</span>
              </a>

              {/* X / Twitter */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-gray-700" />
                <span>X / Twitter</span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`Social Pulse Insight: ${post.topic}`)}&body=${encodeURIComponent(summaryText)}`}
                className="inline-flex items-center justify-center gap-1.5 p-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email</span>
              </a>
            </div>

            {/* Native Mobile Share if available */}
            {typeof navigator !== "undefined" && typeof (navigator as any).share === "function" && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full mt-2 py-2 rounded-lg bg-[#F5F7F9] hover:bg-[#E5E7EB] text-[#252525] text-xs font-semibold border border-[#E5E7EB] transition-colors cursor-pointer"
              >
                Open System Share Menu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
