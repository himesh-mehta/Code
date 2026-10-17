"use client";

import React, { useState } from "react";
import { Post, Platform, Sentiment } from "@/types";
import {
  Heart,
  MessageCircle,
  Share2,
  HelpCircle,
  Globe,
  ExternalLink,
  Play,
  RotateCcw,
  Newspaper,
  BookOpen,
  Star,
} from "lucide-react";

interface Props {
  post: Post;
  highlightQuery?: string;
  onReadInPage?: (post: Post) => void;
  onViewComments?: (post: Post) => void;
  onShare?: (post: Post) => void;
}

export function PostCard({
  post,
  onReadInPage,
  onViewComments,
  onShare,
}: Props) {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Extract YouTube videoId safely
  const getYouTubeVideoId = (p: Post): string | null => {
    if (p.video_id) return p.video_id;
    if (!p.url) return null;
    const match = p.url.match(/(?:watch\?v=|youtu\.be\/|embed\/)([^&?#/]+)/);
    return match ? match[1] : null;
  };

  const videoId = post.platform === "youtube" ? getYouTubeVideoId(post) : null;
  const youtubeThumbnail =
    post.media_url ||
    (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case "youtube":
        return (
          <svg className="w-3.5 h-3.5 text-red-600 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case "bluesky":
        return <Globe className="w-3.5 h-3.5 text-[#008FD3]" />;
      case "gdelt":
        return <Newspaper className="w-3.5 h-3.5 text-amber-600" />;
      case "google_news":
        return <Newspaper className="w-3.5 h-3.5 text-blue-600" />;
      case "google_maps":
        return (
          <svg className="w-3.5 h-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        );
      default:
        return <Globe className="w-3.5 h-3.5 text-[#0067A5]" />;
    }
  };

  const getSentimentBadge = (sentiment: Sentiment) => {
    switch (sentiment) {
      case "positive":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Positive
          </span>
        );
      case "neutral":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            Neutral
          </span>
        );
      case "negative":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-800 border border-red-200">
            Negative
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const getExternalLinkText = (platform: Platform): string => {
    switch (platform) {
      case "youtube":
        return "Watch on YouTube";
      case "gdelt":
        return "Read Full Article";
      case "bluesky":
        return "View on Bluesky";
      case "google_news":
        return "Read on Google News";
      case "google_maps":
        return "View on Google Maps";
      default:
        return "View Source";
    }
  };

  return (
    <article className="bg-white rounded-xl p-4 border border-[#E5E7EB] hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top row: Platform, Handle / Source Domain, Date, Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-[#F5F7F9] border border-[#E5E7EB] flex-shrink-0">
              {getPlatformIcon(post.platform)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#252525] truncate block">
                {post.platform === "gdelt" && post.domain
                  ? post.domain
                  : post.platform === "google_maps" && post.place_name
                  ? post.place_name
                  : post.author_handle}
              </span>
              <span className="text-[10px] text-[#666666] block">
                {formatDate(post.posted_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {post.is_question && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCEFF7] text-[#0067A5] border border-[#008FD3]/30">
                <HelpCircle className="w-3 h-3 text-[#0067A5]" />
                <span>Question</span>
              </span>
            )}
            {getSentimentBadge(post.sentiment)}
          </div>
        </div>

        {/* Inline YouTube Player or Thumbnail Preview */}
        {post.platform === "youtube" && videoId && (
          <div className="space-y-2">
            {isPlayingVideo ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-[#E5E7EB]">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
                  title={post.content.slice(0, 50)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  onClick={() => setIsPlayingVideo(false)}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-[10px] font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors"
                >
                  Close Player
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsPlayingVideo(true)}
                className="group relative w-full h-44 rounded-xl overflow-hidden bg-gray-900 border border-[#E5E7EB] cursor-pointer shadow-xs"
                title="Click to play video inline"
              >
                {youtubeThumbnail && (
                  <img
                    src={youtubeThumbnail}
                    alt="YouTube Video Thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                  />
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 group-hover:bg-red-700 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Play Inline
                </span>
              </div>
            )}
          </div>
        )}



        {/* Content Headline / Body */}
        <div>
          {post.platform === "gdelt" && post.article_title && (
            <h4 className="text-sm font-bold text-[#252525] mb-1.5 leading-snug">
              {post.article_title}
            </h4>
          )}
          <p className="text-[13px] text-[#252525] leading-relaxed line-clamp-4">
            {post.content}
          </p>
        </div>
      </div>

      {/* Footer: Topic, Metrics & External Actions */}
      <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
        <div className="flex items-center justify-between text-xs text-[#666666]">
          <span className="px-2 py-0.5 rounded-md bg-[#DCEFF7] text-[#0067A5] text-[11px] font-semibold border border-[#008FD3]/20">
            {post.topic}
          </span>

          <div className="flex items-center gap-2 tabular-nums text-[11px]">
            {post.rating !== undefined && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-[11px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                <span>{post.rating}.0</span>
              </span>
            )}
            {post.likes !== undefined && (
              <span className="inline-flex items-center gap-1 text-[#666666]">
                <Heart className="w-3.5 h-3.5 text-red-500/70" />
                <span>{post.likes.toLocaleString()}</span>
              </span>
            )}
            {post.comments !== undefined && (
              <button
                type="button"
                onClick={() => onViewComments && onViewComments(post)}
                className="inline-flex items-center gap-1 text-[#0067A5] hover:text-[#005588] hover:bg-[#DCEFF7] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                title="View comments & replies"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">{post.comments.toLocaleString()}</span>
              </button>
            )}
            {post.shares !== undefined && (
              <button
                type="button"
                onClick={() => onShare && onShare(post)}
                className="inline-flex items-center gap-1 text-[#666666] hover:text-[#252525] hover:bg-gray-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                title="Share insight"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{post.shares.toLocaleString()}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Platform Action Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-[#E5E7EB]">
          <div className="flex items-center gap-1.5">
            {/* View Comments Button */}
            <button
              type="button"
              onClick={() => onViewComments && onViewComments(post)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0067A5] hover:text-[#005588] bg-[#DCEFF7] hover:bg-[#cbe6f3] px-2 py-1 rounded-md transition-colors cursor-pointer"
              title="See discussion comments"
            >
              <MessageCircle className="w-3 h-3" />
              <span>Comments {post.comments !== undefined ? `(${post.comments.toLocaleString()})` : ""}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={() => onShare && onShare(post)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#666666] hover:text-[#252525] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
              title="Share this signal"
            >
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>

            {/* In-Page Reader trigger for GDELT or full read */}
            {post.platform === "gdelt" && onReadInPage && (
              <button
                onClick={() => onReadInPage(post)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0067A5] hover:text-[#005588] bg-[#DCEFF7]/60 hover:bg-[#DCEFF7] px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                <span>Read In-Page</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!post.is_sample ? (
              <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Verified Signal
              </span>
            ) : (
              <span className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold px-1 py-0.5 rounded bg-amber-50 border border-amber-200">
                Sample
              </span>
            )}

            {/* Validated External Link with explicit platform label */}
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0067A5] hover:bg-[#005588] text-white transition-colors shadow-2xs cursor-pointer"
                title={`Open authentic content on ${post.platform}`}
              >
                <span>{getExternalLinkText(post.platform)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
