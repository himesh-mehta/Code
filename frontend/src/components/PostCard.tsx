"use client";

import React, { useState } from "react";
import { Post, Platform, Sentiment } from "@/types";
import {
  Heart,
  MessageCircle,
  HelpCircle,
  Globe,
  ExternalLink,
  Play,
  Newspaper,
  BookOpen,
  Star,
  Sparkles,
  Check,
  Copy,
  ThumbsUp,
  Share2,
} from "lucide-react";

interface Props {
  post: Post;
  highlightQuery?: string;
  onReadInPage?: (post: Post) => void;
  onViewComments?: (post: Post) => void;
  onShare?: (post: Post) => void;
  onAnalyzeWithAI?: (post: Post) => void;
}

export function PostCard({
  post,
  onReadInPage,
  onViewComments,
  onShare,
  onAnalyzeWithAI,
}: Props) {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    if (onShare) {
      onShare(post);
      return;
    }
    if (!post.url) return;
    navigator.clipboard.writeText(post.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case "youtube":
        return <span className="material-symbols-outlined text-[#FF0000] text-[18px]">smart_display</span>;
      case "bluesky":
        return <span className="material-symbols-outlined text-[#008FD3] text-[18px]">public</span>;
      case "gdelt":
        return <span className="material-symbols-outlined text-amber-600 text-[18px]">newspaper</span>;
      case "google_news":
        return <span className="material-symbols-outlined text-[#0099f2] text-[18px]">feed</span>;
      case "google_maps":
        return <span className="material-symbols-outlined text-emerald-600 text-[18px]">location_on</span>;
      default:
        return <span className="material-symbols-outlined text-[#00629e] text-[18px]">language</span>;
    }
  };

  const getPlatformLabel = (platform: Platform): string => {
    switch (platform) {
      case "youtube":
        return "YouTube Comment";
      case "gdelt":
        return "GDELT Wire";
      case "google_news":
        return "Google News";
      case "bluesky":
        return "Bluesky";
      case "google_maps":
        return "Center Review";
      default:
        return "Community Post";
    }
  };

  const getSentimentBadge = (sentiment: Sentiment) => {
    switch (sentiment) {
      case "positive":
        return (
          <span className="chip-growing">
            <span className="material-symbols-outlined text-[14px]">thumb_up</span>
            <span>Positive</span>
          </span>
        );
      case "neutral":
        return (
          <span className="chip-steady">
            <span className="material-symbols-outlined text-[14px]">horizontal_rule</span>
            <span>Neutral</span>
          </span>
        );
      case "negative":
        return (
          <span className="chip-cooling">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            <span>Needs Attention</span>
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

  const isNewsSource = post.platform === "gdelt" || post.platform === "google_news";
  const isPlacesSource = post.platform === "google_maps";
  const isYouTube = post.platform === "youtube";

  const authorInitials = (
    post.author_handle
      ? post.author_handle.replace("@", "").slice(0, 2).toUpperCase()
      : "TS"
  );

  return (
    <article className="stitch-card p-6 flex flex-col justify-between space-y-4 text-xs group">
      <div className="space-y-3.5">
        {/* Top Header: Platform indicator, Author/Domain, Timestamp & Sentiment */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#eaf5ff] text-[#00629e] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs ring-2 ring-[#cae6fb]">
              {authorInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#001e2d] truncate">
                  {isPlacesSource && post.place_name
                    ? post.place_name
                    : isNewsSource && post.domain
                    ? post.domain
                    : post.author_handle}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#3f4852] font-semibold">
                  {getPlatformIcon(post.platform)}
                  <span>{getPlatformLabel(post.platform)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#3f4852] mt-0.5">
                <span className="text-[#0099f2] font-semibold">{post.topic}</span>
                <span>•</span>
                <span>{formatDate(post.posted_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {post.is_question && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#def0ff] text-[#004c6e]">
                <HelpCircle className="w-3.5 h-3.5 text-[#0099f2]" />
                <span>Question</span>
              </span>
            )}
            {getSentimentBadge(post.sentiment)}
          </div>
        </div>

        {/* 1. YOUTUBE CARD: Inline Video Player or Media Preview */}
        {isYouTube && videoId && (
          <div className="space-y-2">
            {isPlayingVideo ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner border border-[#0099f2]/15">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
                  title={post.content.slice(0, 50)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  onClick={() => setIsPlayingVideo(false)}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full cursor-pointer transition-colors"
                >
                  Close Player
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsPlayingVideo(true)}
                className="group relative w-full h-44 rounded-2xl overflow-hidden bg-gray-900 border border-[#0099f2]/15 cursor-pointer shadow-azure-card"
                title="Click to play video inline"
              >
                {youtubeThumbnail && (
                  <img
                    src={youtubeThumbnail}
                    alt="YouTube Video Thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                  />
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 group-hover:bg-red-700 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                  Play Inline
                </span>
              </div>
            )}
          </div>
        )}

        {/* 2. NEWS CARD: Headline */}
        {isNewsSource && post.article_title && (
          <h4 className="text-base font-bold text-[#001e2d] leading-snug">
            {post.article_title}
          </h4>
        )}

        {/* Content Body */}
        <p className="text-sm text-[#001e2d] leading-relaxed line-clamp-3">
          &quot;{post.content}&quot;
        </p>

        {/* 3. GOOGLE PLACES: Review Rating Display */}
        {isPlacesSource && post.rating && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(post.rating || 5)
                      ? "fill-amber-400 text-amber-500"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] border border-amber-200">
              {post.rating}.0 / 5.0
            </span>
            <span className="text-[11px] text-[#3f4852] font-medium">Verified Student Review</span>
          </div>
        )}
      </div>

      {/* Footer: Metrics & Action Buttons */}
      <div className="pt-3.5 border-t border-[#0099f2]/10 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#3f4852]">
          <span className="px-3 py-1 rounded-full bg-[#eaf5ff] text-[#00629e] text-xs font-bold">
            {post.topic}
          </span>

          {/* Metrics */}
          {isYouTube ? (
            <div className="flex items-center gap-4 tabular-nums text-xs text-[#3f4852] font-semibold">
              {post.likes !== undefined && (
                <span className="inline-flex items-center gap-1.5" title="YouTube Like Count">
                  <Heart className="w-3.5 h-3.5 text-red-500" />
                  <span>{post.likes.toLocaleString()}</span>
                </span>
              )}
              {post.comments !== undefined && (
                <button
                  type="button"
                  onClick={() => onViewComments && onViewComments(post)}
                  className="inline-flex items-center gap-1.5 text-[#0099f2] hover:underline cursor-pointer font-bold"
                  title="View YouTube video comments"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{post.comments.toLocaleString()} comments</span>
                </button>
              )}
            </div>
          ) : post.platform === "bluesky" ? (
            <div className="flex items-center gap-4 tabular-nums text-xs text-[#3f4852] font-semibold">
              {post.likes !== undefined && post.likes > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-[#0099f2]" />
                  <span>{post.likes}</span>
                </span>
              )}
              {post.comments !== undefined && post.comments > 0 && (
                <button
                  type="button"
                  onClick={() => onViewComments && onViewComments(post)}
                  className="inline-flex items-center gap-1.5 text-[#0099f2] hover:underline cursor-pointer font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{post.comments} replies</span>
                </button>
              )}
            </div>
          ) : isNewsSource ? (
            <span className="text-xs text-[#3f4852] italic font-medium">
              Public Press Wire
            </span>
          ) : null}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-[#0099f2]/15">
          <div className="flex items-center gap-2 flex-wrap">
            {/* YouTube Actions */}
            {isYouTube && (
              <>
                <button
                  type="button"
                  onClick={() => onViewComments && onViewComments(post)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] font-bold text-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Comments</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#3f4852] font-semibold text-xs transition-colors"
                  title="Copy video URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy URL"}</span>
                </button>
              </>
            )}

            {/* News Actions */}
            {isNewsSource && (
              <>
                {onReadInPage && (
                  <button
                    type="button"
                    onClick={() => onReadInPage(post)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] font-bold text-xs transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Details</span>
                  </button>
                )}
                {onAnalyzeWithAI && (
                  <button
                    type="button"
                    onClick={() => onAnalyzeWithAI(post)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#def0ff] hover:bg-[#cae6fb] text-[#004c6e] font-bold text-xs transition-colors"
                    title="Run AI Analysis on this news article"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#0099f2]" />
                    <span>AI Analysis</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#3f4852] font-semibold text-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy URL"}</span>
                </button>
              </>
            )}

            {/* Bluesky Actions */}
            {post.platform === "bluesky" && (
              <>
                <button
                  type="button"
                  onClick={() => onViewComments && onViewComments(post)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] font-bold text-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Thread</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#3f4852] font-semibold text-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Link"}</span>
                </button>
              </>
            )}

            {/* Places Actions */}
            {isPlacesSource && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#3f4852] font-semibold text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Share"}</span>
              </button>
            )}
          </div>

          {/* Outbound Link */}
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#0099f2] hover:bg-[#007acc] text-white transition-all shadow-xs ml-auto"
              title={`Open authentic content on ${post.platform}`}
            >
              <span>
                {isYouTube
                  ? "Watch Video"
                  : isNewsSource
                  ? "Read Article"
                  : isPlacesSource
                  ? "Open Maps"
                  : "View Post"}
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
