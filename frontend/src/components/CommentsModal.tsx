"use client";

import React, { useState, useEffect } from "react";
import { Post, CommentItem, Platform } from "@/types";
import { api } from "@/lib/api";
import {
  X,
  MessageCircle,
  Heart,
  Send,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CornerDownRight,
  User,
  Clock,
  Loader2,
} from "lucide-react";

interface Props {
  post: Post | null;
  onClose: () => void;
  onCommentAdded?: (post: Post, newCount: number) => void;
}

export function CommentsModal({ post, onClose, onCommentAdded }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [authorName, setAuthorName] = useState("@TataSTRIVE_Team");
  const [isOfficial, setIsOfficial] = useState(true);
  const [loading, setLoading] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (post) {
      const localComments = api.getComments(post.id);

      if (post.platform === "youtube" || post.platform === "bluesky") {
        setLoading(true);
        const params = new URLSearchParams({
          platform: post.platform,
          videoId: post.video_id || "",
          url: post.url || "",
        });

        fetch(`/api/connectors/comments?${params.toString()}`)
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .then((data) => {
            const liveItems: CommentItem[] = data.items || [];
            const liveIds = new Set(liveItems.map((c) => c.id));
            const merged = [
              ...localComments.filter((c) => !liveIds.has(c.id)),
              ...liveItems,
            ];
            setComments(merged);
          })
          .catch(() => setComments(localComments))
          .finally(() => setLoading(false));
      } else {
        setComments(localComments);
      }
    }
  }, [post]);

  if (!post) return null;

  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    const added = api.addComment(post.id, {
      author_handle: authorName.trim() || "@TataSTRIVE_Team",
      content: trimmed,
      is_official: isOfficial,
    });

    setComments((prev) => [added, ...prev]);
    setNewCommentText("");

    if (onCommentAdded) {
      onCommentAdded(post, comments.length + 1);
    }
  };

  const handleToggleLike = (commentId: string) => {
    setLikedMap((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const getPlatformLabel = (platform: Platform) => {
    switch (platform) {
      case "youtube":
        return { label: "YouTube Comments", color: "text-red-700 bg-red-50 border-red-200" };
      case "bluesky":
        return { label: "Bluesky Thread Replies", color: "text-sky-700 bg-sky-50 border-sky-200" };
      case "gdelt":
        return { label: "GDELT Editorial Discourse", color: "text-amber-700 bg-amber-50 border-amber-200" };
      case "google_news":
        return { label: "Google News Public Reactions", color: "text-blue-700 bg-blue-50 border-blue-200" };
      case "google_maps":
        return { label: "Google Places Review Thread", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
      default:
        return { label: `${platform} Discussion`, color: "text-gray-700 bg-gray-50 border-gray-200" };
    }
  };

  const platformMeta = getPlatformLabel(post.platform);

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

  const quickResponses = [
    "Check our free mock interview drills on the Tata STRIVE student portal.",
    "Admissions for the upcoming batch are open at all district centers.",
    "Always structure behavioral answers with the STAR technique.",
    "Walk into your nearest Tata STRIVE center for personalized counseling.",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F5F7F9]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#DCEFF7] text-[#0067A5]">
              <MessageCircle className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#252525]">
                  Discussion &amp; Comments
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${platformMeta.color}`}>
                  {platformMeta.label}
                </span>
              </div>
              <p className="text-[11px] text-[#666666]">
                {comments.length} verified responses across {post.author_handle}&apos;s thread
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

        {/* Post Context Preview Banner */}
        <div className="px-6 py-3.5 bg-gray-50/80 border-b border-[#E5E7EB] flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-bold text-[#252525]">{post.author_handle}</span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-[#666666]">{formatDate(post.posted_at)}</span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="px-1.5 py-0.2 rounded bg-white text-[#0067A5] font-semibold border border-[#E5E7EB]">
                {post.topic}
              </span>
            </div>
            <p className="text-[#252525] text-xs leading-relaxed line-clamp-2 italic">
              &ldquo;{post.content}&rdquo;
            </p>
          </div>

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-[#DCEFF7] text-[10px] font-semibold text-[#0067A5] border border-[#E5E7EB] transition-colors flex-shrink-0 cursor-pointer"
            >
              <span>Original Post</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Scrollable Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-[#E5E7EB]/70">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#0067A5]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-xs font-medium text-[#666666]">Fetching live discussion thread...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center text-[#666666] text-xs">
              No public comments recorded on this thread yet. You can post an official response or guidance note below.
            </div>
          ) : (
            comments.map((comment, index) => {
              const isLiked = likedMap[comment.id];
              const totalLikes = (comment.likes || 0) + (isLiked ? 1 : 0);

              return (
                <div
                  key={comment.id}
                  className={`space-y-1.5 transition-colors ${index > 0 ? "pt-4" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          comment.is_official
                            ? "bg-[#0067A5] text-white"
                            : "bg-[#DCEFF7] text-[#0067A5]"
                        }`}
                      >
                        {comment.is_official ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#252525]">
                        {comment.author_handle}
                      </span>
                      {comment.is_official && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#0067A5] border border-blue-200">
                          Tata STRIVE Team
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#666666]">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-[#666666]" />
                        {formatDate(comment.posted_at)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#252525] pl-8 leading-relaxed">
                    {comment.content}
                  </p>

                  <div className="pl-8 pt-1 flex items-center gap-4 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(comment.id)}
                      className={`inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                        isLiked ? "text-red-600" : "text-[#666666] hover:text-[#252525]"
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isLiked ? "fill-red-600" : ""}`}
                      />
                      <span>{totalLikes} likes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewCommentText(`@${comment.author_handle.replace("@", "")} `);
                      }}
                      className="inline-flex items-center gap-1 text-[#666666] hover:text-[#0067A5] font-semibold transition-colors cursor-pointer"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Response Suggestion Chips */}
        <div className="px-6 py-2 bg-gray-50 border-t border-[#E5E7EB] flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none">
          <span className="font-bold text-[#0067A5] flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-[#0067A5]" />
            Suggested Replies:
          </span>
          {quickResponses.map((qr, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setNewCommentText(qr)}
              className="px-2 py-0.5 rounded-md bg-white border border-[#E5E7EB] text-[#252525] hover:border-[#0067A5] hover:text-[#0067A5] transition-colors whitespace-nowrap cursor-pointer flex-shrink-0 font-medium"
            >
              + {qr.slice(0, 32)}...
            </button>
          ))}
        </div>

        {/* Interactive Add Response Form */}
        <form
          onSubmit={handleAddComment}
          className="p-4 bg-white border-t border-[#E5E7EB] space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#666666]">Posting as:</span>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="@Handle"
                className="h-6 px-2 text-[11px] font-semibold text-[#0067A5] bg-[#F5F7F9] rounded border border-[#E5E7EB] focus:outline-none focus:border-[#0067A5]"
              />
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-[#666666] cursor-pointer">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={(e) => setIsOfficial(e.target.checked)}
                className="rounded text-[#0067A5] focus:ring-0"
              />
              <span className="font-medium">Mark as Official STRIVE Response</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write an official response or student guidance note..."
              className="flex-1 h-9 px-3 text-xs bg-[#F5F7F9] rounded-lg border border-[#E5E7EB] focus:outline-none focus:border-[#0067A5] text-[#252525]"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0067A5] hover:bg-[#005588] text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-xs flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Reply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
