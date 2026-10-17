"use client";

import React, { useState } from "react";
import { Post, Platform } from "@/types";
import { api } from "@/lib/api";
import {
  Globe,
  Search,
  Loader2,
  Heart,
  Repeat,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Video,
  Newspaper,
} from "lucide-react";

export const SKILLING_KEYWORDS = [
  "skilling",
  "skill development",
  "employability",
  "vocational training",
  "career guidance",
  "apprenticeships",
  "entrepreneurship",
];

export const BLUESKY_SKILLING_KEYWORDS = SKILLING_KEYWORDS;

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  onImportPosts: (posts: Post[]) => void;
}

export type CollectorSource = "all" | "youtube" | "bluesky" | "gdelt" | "google_news" | "google_maps";

export function LiveSocialCollector({ isOpen, onToggle, onImportPosts }: Props) {
  const [query, setQuery] = useState("skilling");
  const [selectedSource, setSelectedSource] = useState<CollectorSource>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [bskyCursor, setBskyCursor] = useState<string | null>(null);
  const [ytCursor, setYtCursor] = useState<string | null>(null);
  const [relevantOnly, setRelevantOnly] = useState(false);
  const [importedMessage, setImportedMessage] = useState<string | null>(null);

  const executeSearch = async (term?: string, isNextPage = false) => {
    const q = (term !== undefined ? term : query).trim();
    if (!q) return;

    if (isNextPage) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
      setImportedMessage(null);
    }

    try {
      const promises: Promise<any>[] = [];

      if (selectedSource === "all" || selectedSource === "youtube") {
        const cursorToUse = isNextPage ? ytCursor || undefined : undefined;
        promises.push(api.searchYouTube(q, 10, cursorToUse));
      } else {
        promises.push(Promise.resolve({ items: [], cursor: null }));
      }

      if (selectedSource === "all" || selectedSource === "bluesky") {
        const cursorToUse = isNextPage ? bskyCursor || undefined : undefined;
        promises.push(api.searchBluesky(q, 10, cursorToUse));
      } else {
        promises.push(Promise.resolve({ items: [], cursor: null }));
      }

      if (selectedSource === "all" || selectedSource === "gdelt") {
        promises.push(api.searchGdelt(q, "30d", 10));
      } else {
        promises.push(Promise.resolve({ articles: [] }));
      }

      if (selectedSource === "all" || selectedSource === "google_news") {
        promises.push(api.searchGoogleNews(q, 10));
      } else {
        promises.push(Promise.resolve({ items: [] }));
      }

      if (selectedSource === "all" || selectedSource === "google_maps") {
        promises.push(api.searchGooglePlaces(q, 8));
      } else {
        promises.push(Promise.resolve({ items: [] }));
      }

      const [ytRes, bskyRes, gdeltRes, gnewsRes, gplacesRes] = await Promise.allSettled(promises);

      let newItems: Post[] = [];
      let nextYtCursor: string | null = null;
      let nextBskyCursor: string | null = null;
      let caughtError: string | null = null;

      if (ytRes.status === "fulfilled" && ytRes.value) {
        if (ytRes.value.error && selectedSource === "youtube") {
          caughtError = ytRes.value.error;
        } else if (ytRes.value.items) {
          newItems.push(...ytRes.value.items);
          nextYtCursor = ytRes.value.cursor || null;
        }
      }

      if (bskyRes.status === "fulfilled" && bskyRes.value) {
        if (bskyRes.value.error && selectedSource === "bluesky") {
          caughtError = bskyRes.value.error;
        } else if (bskyRes.value.items) {
          newItems.push(...bskyRes.value.items);
          nextBskyCursor = bskyRes.value.cursor || null;
        }
      }

      if (gdeltRes.status === "fulfilled" && gdeltRes.value?.articles?.length > 0) {
        newItems.push(...gdeltRes.value.articles);
      }

      if (gnewsRes.status === "fulfilled" && gnewsRes.value?.items?.length > 0) {
        newItems.push(...gnewsRes.value.items);
      }

      if (gplacesRes.status === "fulfilled" && gplacesRes.value?.items?.length > 0) {
        newItems.push(...gplacesRes.value.items);
      }

      if (caughtError && newItems.length === 0) {
        setError({ message: caughtError });
        return;
      }

      if (isNextPage) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const existingUrls = new Set(prev.map((p) => p.url).filter(Boolean));
          const unique = newItems.filter((p) => !existingIds.has(p.id) && (!p.url || !existingUrls.has(p.url)));
          return [...prev, ...unique];
        });
      } else {
        setPosts(newItems);
      }

      if (nextYtCursor) setYtCursor(nextYtCursor);
      if (nextBskyCursor) setBskyCursor(nextBskyCursor);
    } catch (err: any) {
      setError({ message: err.message || "Failed to stream live social data" });
    } finally {
      if (isNextPage) setLoadingMore(false);
      else setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleKeywordClick = (keyword: string) => {
    setQuery(keyword);
    executeSearch(keyword, false);
  };

  const displayedPosts = relevantOnly
    ? posts.filter((p) => p.is_relevant)
    : posts;

  const ytCount = displayedPosts.filter((p) => p.platform === "youtube").length;
  const bskyCount = displayedPosts.filter((p) => p.platform === "bluesky").length;
  const relevantCount = posts.filter((p) => p.is_relevant).length;
  const noiseCount = posts.length - relevantCount;

  const handleCollect = () => {
    if (displayedPosts.length === 0) return;
    onImportPosts(displayedPosts);
    setImportedMessage(
      `Collected ${displayedPosts.length} posts (${ytCount} YouTube, ${bskyCount} Bluesky) into your active feed. Available for current demo session.`
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#008FD3]/30 shadow-xs overflow-hidden transition-all">
      {/* Header bar with toggle */}
      <div
        onClick={onToggle}
        className="px-5 py-3.5 bg-gradient-to-r from-[#DCEFF7] to-white border-b border-[#008FD3]/20 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#0067A5] text-white">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#252525]">
                Live Social Stream Collector
              </h2>
              <span className="text-[10px] font-bold text-[#0067A5] bg-[#DCEFF7] px-2 py-0.5 rounded-full border border-[#008FD3]/30">
                YouTube &amp; Bluesky Connectors
              </span>
            </div>
            <p className="text-[11px] text-[#666666]">
              Stream live skilling, employability, and youth discussions directly from YouTube and Bluesky simultaneously
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {posts.length > 0 && (
            <span className="text-xs font-semibold text-[#0067A5] bg-white px-2.5 py-1 rounded-md border border-[#E5E7EB]">
              {posts.length} fetched ({posts.filter(p => p.platform === "youtube").length} YT, {posts.filter(p => p.platform === "bluesky").length} Bluesky)
            </span>
          )}
          <button
            type="button"
            className="p-1 rounded text-[#0067A5] hover:bg-white/60"
            title={isOpen ? "Collapse panel" : "Expand panel"}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-5 space-y-4">
          {/* Source Selection Tabs */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-1.5 bg-[#F5F7F9] p-1 rounded-lg border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setSelectedSource("all")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedSource === "all"
                    ? "bg-[#0067A5] text-white shadow-2xs"
                    : "text-[#666666] hover:text-[#252525]"
                }`}
              >
                All 5 Streams
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("youtube")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedSource === "youtube"
                    ? "bg-red-600 text-white shadow-2xs"
                    : "text-[#666666] hover:text-red-700"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>YouTube</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("bluesky")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedSource === "bluesky"
                    ? "bg-[#008FD3] text-white shadow-2xs"
                    : "text-[#666666] hover:text-[#008FD3]"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Bluesky</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("gdelt")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedSource === "gdelt"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-[#666666] hover:text-amber-700"
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>GDELT News</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("google_news")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedSource === "google_news"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-[#666666] hover:text-blue-700"
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>Google News</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource("google_maps")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedSource === "google_maps"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-[#666666] hover:text-emerald-700"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Google Places</span>
              </button>
            </div>

            <span className="text-[11px] text-[#666666]">
              Targeting: <strong className="text-[#0067A5]">{selectedSource === "all" ? "All Live Channels" : selectedSource.toUpperCase()}</strong>
            </span>
          </div>

          {/* Search bar and Keyword Chips */}
          <div className="space-y-3">
            <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#666666]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter keyword: skilling, employability, vocational training, apprenticeships..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] focus:outline-none focus:border-[#0067A5]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors disabled:opacity-60 cursor-pointer shadow-xs flex-shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Streaming Live Discussions...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Fetch Signals</span>
                  </>
                )}
              </button>
            </form>

            {/* Recommended Skilling Keyword Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-[#666666] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0067A5]" />
                Explore Skilling Topics:
              </span>
              {SKILLING_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleKeywordClick(kw)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                    query === kw
                      ? "bg-[#0067A5] text-white border-[#0067A5]"
                      : "bg-[#F5F7F9] text-[#252525] border-[#E5E7EB] hover:bg-[#DCEFF7] hover:text-[#0067A5]"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback & Error Alerts */}
          {error && (
            <div className="p-3 rounded-lg text-xs flex items-center justify-between bg-red-50 text-red-900 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="font-bold">Connector Notice: </span>
                  <span>{error.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => executeSearch()}
                className="text-xs font-semibold underline ml-2"
              >
                Retry
              </button>
            </div>
          )}

          {importedMessage && (
            <div className="p-3 rounded-lg text-xs flex items-center justify-between bg-emerald-50 text-emerald-900 border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{importedMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportedMessage(null)}
                className="text-xs font-semibold underline text-emerald-800"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Results Action Bar */}
          {posts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB] text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[#666666]">
                  Showing <strong className="text-[#252525]">{displayedPosts.length}</strong> of {posts.length} fetched
                  <span className="ml-1 text-[11px] font-medium text-[#0067A5]">
                    ({ytCount} YouTube, {bskyCount} Bluesky)
                  </span>
                </span>

                {/* Relevance Filter Toggle */}
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F5F7F9] border border-[#E5E7EB] cursor-pointer text-xs font-medium text-[#252525]">
                  <input
                    type="checkbox"
                    checked={relevantOnly}
                    onChange={(e) => setRelevantOnly(e.target.checked)}
                    className="rounded text-[#0067A5] focus:ring-0"
                  />
                  <span>Filter noise ({relevantCount} relevant, {noiseCount} filtered)</span>
                </label>
              </div>

              {/* Action: Collect Posts */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCollect}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0067A5] text-white text-xs font-bold hover:bg-[#005588] transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Collect {displayedPosts.length} Posts to Feed</span>
                </button>
              </div>
            </div>
          )}

          {/* Posts Preview Grid */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#666666] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#0067A5]" />
              <span className="text-xs">Fetching live discussions from YouTube &amp; Bluesky...</span>
            </div>
          ) : posts.length === 0 && !error ? (
            <div className="p-8 text-center bg-[#F5F7F9] rounded-xl border border-dashed border-[#E5E7EB] space-y-1.5">
              <Globe className="w-6 h-6 text-[#008FD3] mx-auto opacity-70" />
              <h3 className="text-xs font-semibold text-[#252525]">
                Ready to stream live social discussions
              </h3>
              <p className="text-[11px] text-[#666666] max-w-md mx-auto">
                Select your source (YouTube, Bluesky, or Both) and click any topic chip to fetch live conversations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#008FD3]/50 transition-all flex flex-col justify-between space-y-2 text-xs shadow-2xs"
                >
                  <div className="space-y-2">
                    {/* Top: Source Badge, Author, Handle, Date, Link */}
                    <div className="flex items-start justify-between gap-1.5 border-b border-[#F5F7F9] pb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {post.platform === "youtube" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                              <Video className="w-2.5 h-2.5" />
                              YouTube
                            </span>
                          ) : post.platform === "gdelt" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Newspaper className="w-2.5 h-2.5" />
                              GDELT News
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#008FD3] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                              <Globe className="w-2.5 h-2.5" />
                              Bluesky
                            </span>
                          )}
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Signal"></span>
                        </div>
                        <div className="font-bold text-[#252525] truncate">
                          {post.author_handle}
                        </div>
                        <span className="text-[10px] text-[#666666]">
                          {post.posted_at ? new Date(post.posted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </span>
                      </div>

                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[#0067A5] hover:underline text-[10px] font-semibold flex-shrink-0"
                          title={post.platform === "youtube" ? "Watch video on YouTube" : post.platform === "gdelt" ? "Read article on news site" : "Open original post on Bluesky"}
                        >
                          <span>{post.platform === "youtube" ? "Watch" : post.platform === "gdelt" ? "Read" : "Post"}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Content text */}
                    <p className="text-[12px] text-[#252525] leading-relaxed line-clamp-4 whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>

                  {/* Badges & Metrics */}
                  <div className="pt-2 border-t border-[#F5F7F9] space-y-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Topic pill */}
                      <span className="px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] text-[10px] font-semibold border border-[#008FD3]/20">
                        {post.topic}
                      </span>

                      {/* Sentiment */}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold capitalize border ${
                          post.sentiment === "positive"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : post.sentiment === "negative"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {post.sentiment}
                      </span>

                      {/* Question detected */}
                      {post.is_question && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#DCEFF7] text-[#0067A5]">
                          <HelpCircle className="w-2.5 h-2.5" />
                          <span>Question</span>
                        </span>
                      )}

                      {/* Relevance Badge */}
                      {post.is_relevant ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Relevant Skilling
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          Unrelated / Noise
                        </span>
                      )}
                    </div>

                    {/* Metrics: Likes, Reposts/Shares, Comments */}
                    <div className="flex items-center justify-between text-[11px] text-[#666666] tabular-nums">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1" title="Likes">
                          <Heart className="w-3 h-3 text-red-500" />
                          <span>{post.likes || 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Reposts / Shares">
                          <Repeat className="w-3 h-3 text-emerald-600" />
                          <span>{post.shares || 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Comments / Replies">
                          <MessageCircle className="w-3 h-3 text-[#008FD3]" />
                          <span>{post.comments || 0}</span>
                        </span>
                      </div>

                      <span className="text-[10px] text-[#666666] font-medium capitalize">
                        {post.platform}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination: Load More */}
          {posts.length > 0 && !loading && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => executeSearch(undefined, true)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#0067A5] bg-white text-xs font-semibold text-[#0067A5] hover:bg-[#DCEFF7] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0067A5]" />
                    <span>Loading More Signals...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Signals (Next Batch)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Backwards compatibility alias
export const BlueskyCollector = LiveSocialCollector;
