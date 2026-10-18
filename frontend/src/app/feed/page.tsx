"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { PostCard } from "@/components/PostCard";
import { SentimentBreakdownCard } from "@/components/SentimentBreakdownCard";
import { YoutubeCommentAnalysisCard } from "@/components/YoutubeCommentAnalysisCard";
import { api } from "@/lib/api";
import { Post, Platform, Sentiment, PostsQuery } from "@/types";
import {
  Search,
  Table as TableIcon,
  LayoutGrid,
  BarChart2,
  ExternalLink,
  HelpCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Radio,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Globe,
  Newspaper,
  MessageCircle,
  RefreshCw,
  Activity,
  Check,
  Copy,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BlueskyCollector } from "@/components/BlueskyCollector";
import { GdeltIntelligenceView } from "@/components/GdeltIntelligenceView";
import { ArticleDetailModal } from "@/components/ArticleDetailModal";
import { CommentsModal } from "@/components/CommentsModal";
import { ShareModal } from "@/components/ShareModal";
import { CsvUploadPanel } from "@/components/CsvUploadPanel";
import { store } from "@/lib/data-store";
import { usePageContext } from "@/context/PageContext";
import { SAMPLE_TRENDING_TOPICS } from "@/lib/sampleData";
import {
  computeTopTopics,
  formatCount,
  formatChange,
} from "@/lib/feed-analytics";

// Flags for legacy controls (preserved in code, not rendered on screen)
const SHOW_LEGACY_CONTROLS = false;
const SHOW_LEGACY_COLLECTOR = false;

function ListeningContent() {
  const searchParams = useSearchParams();
  const { updatePageContext } = usePageContext();

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [mixSources, setMixSources] = useState(true);

  const [showSourceVolumeChart, setShowSourceVolumeChart] = useState(false);
  const [, setLastRefreshed] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mount state to prevent SSR/client hydration divergence
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLastRefreshed(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, []);

  // Modals state
  const [activeArticle, setActiveArticle] = useState<Post | null>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<Post | null>(null);
  const [activeSharePost, setActiveSharePost] = useState<Post | null>(null);

  // Active view: Omni-channel feed vs GDELT News Intelligence (kept for legacy support)
  const [activeTab, setActiveTab] = useState<"omni" | "gdelt">("omni");

  // Auxiliary panels
  const [bskyOpen, setBskyOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  // Live Multi-Source Fetch State
  const [liveFetching, setLiveFetching] = useState(false);
  const [liveStatus, setLiveStatus] = useState<{ message: string; ok: boolean } | null>(null);

  // Filters state (mix_sources on by default)
  const [filters, setFilters] = useState<PostsQuery>({
    query: searchParams.get("query") || undefined,
    platform: (searchParams.get("platform") as Platform) || undefined,
    sentiment: (searchParams.get("sentiment") as Sentiment) || undefined,
    topic: searchParams.get("topic") || undefined,
    is_question: searchParams.get("questions_only") === "true" ? true : undefined,
    is_relevant: searchParams.get("relevant_only") === "true" ? true : undefined,
    date_range: (searchParams.get("date_range") as any) || "30d",
    sort: (searchParams.get("sort") as any) || "recent",
    mix_sources: true,
    page: 1,
    page_size: 20,
  });

  const [searchInput, setSearchInput] = useState(filters.query || "");

  const fetchPosts = () => {
    setLoading(true);
    api.getPosts(filters)
      .then((res) => {
        setPosts(res.items);
        setTotal(res.total);
        setLastRefreshed(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  // Unified Multi-Source Fetch Handler (Default Behaviour)
  const handleManualRefresh = async () => {
    setLoading(true);
    const q = filters.query || "Tata STRIVE";
    try {
      // 1. Fire fast primary connectors (YouTube, Google News, Bluesky)
      await Promise.allSettled([
        api.searchYouTube(q, 15),
        api.searchGoogleNews(q, 15),
        api.searchBluesky(q, 15),
      ]);

      fetchPosts();
      setLoading(false);

      // 2. Auxiliary connectors run in background without blocking UI
      Promise.allSettled([
        api.searchGdelt(q, "30d", 15),
        api.searchGooglePlaces(q, 10),
      ]).then(() => {
        fetchPosts();
      });
    } catch {
      fetchPosts();
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    if (store.getPosts().length === 0) {
      handleManualRefresh();
    }
  }, [filters]);

  const handleSearchSubmit = async (e?: React.FormEvent, directTerm?: string) => {
    if (e) e.preventDefault();
    const query = (directTerm !== undefined ? directTerm : searchInput).trim();

    if (query) {
      setLiveFetching(true);
      setLiveStatus({
        message: `Querying live signals for "${query}" across connected sources...`,
        ok: true,
      });

      try {
        const [ytRes, bskyRes, gnewsRes] = await Promise.allSettled([
          api.searchYouTube(query, 20),
          api.searchBluesky(query, 20),
          api.searchGoogleNews(query, 20),
        ]);

        let ytCount = 0;
        let bskyCount = 0;
        let gnewsCount = 0;

        if (ytRes.status === "fulfilled" && ytRes.value?.items?.length) {
          const added = api.collectPosts(ytRes.value.items);
          ytCount = added.added;
        }

        if (bskyRes.status === "fulfilled" && bskyRes.value?.items?.length) {
          const added = api.collectPosts(bskyRes.value.items);
          bskyCount = added.added;
        }

        if (gnewsRes.status === "fulfilled" && gnewsRes.value?.items?.length) {
          const added = api.collectPosts(gnewsRes.value.items);
          gnewsCount = added.added;
        }

        const counts: string[] = [];
        if (ytCount > 0) counts.push(`${ytCount} YouTube`);
        if (gnewsCount > 0) counts.push(`${gnewsCount} Google News`);
        if (bskyCount > 0) counts.push(`${bskyCount} Bluesky`);

        const totalNew = ytCount + bskyCount + gnewsCount;
        setLiveStatus({
          message:
            totalNew > 0
              ? `Fetched ${totalNew} new posts (${counts.join(", ")}) for "${query}".`
              : `Search complete for "${query}". All records synchronized.`,
          ok: true,
        });

        fetchPosts();
        setLiveFetching(false);

        // Auxiliary background fetch
        Promise.allSettled([
          api.searchGdelt(query, "30d", 20),
          api.searchGooglePlaces(query, 10),
        ]).then(([gdeltRes, gplacesRes]) => {
          if (gdeltRes.status === "fulfilled" && gdeltRes.value?.articles?.length) {
            api.collectPosts(gdeltRes.value.articles);
          }
          if (gplacesRes.status === "fulfilled" && gplacesRes.value?.items?.length) {
            api.collectPosts(gplacesRes.value.items);
          }
          fetchPosts();
        });
      } catch (err: any) {
        setLiveStatus({ message: `Search query error: ${err.message}`, ok: false });
        setLiveFetching(false);
      }
    }

    setFilters({ ...filters, query: query || undefined, page: 1 });
  };

  const handleCopyLink = (url?: string | null, id?: string) => {
    if (!url || !id) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ALL matching records for the current search and filters (not just 20 shown)
  const allMatchingPosts = useMemo(() => {
    if (!mounted) return [];
    return store.queryPosts({
      ...filters,
      page: 1,
      page_size: 10000,
    }).items;
  }, [mounted, filters, total]);

  // Compute top 5 recurring topics strictly from real matching records
  const computedTopics = useMemo(() => {
    return computeTopTopics(allMatchingPosts, {
      query: filters.query,
      topic: filters.topic,
    });
  }, [allMatchingPosts, filters.query, filters.topic]);

  const isSampleNeeded = total < 10;

  // Genuine 5 platform distribution
  const sourceDistribution = useMemo(() => {
    const dist = [
      { source: "YouTube", count: 0, platform: "youtube" },
      { source: "GDELT News", count: 0, platform: "gdelt" },
      { source: "Google News", count: 0, platform: "google_news" },
      { source: "Bluesky", count: 0, platform: "bluesky" },
      { source: "Google Places", count: 0, platform: "google_maps" },
    ];

    if (mounted) {
      const matchingQueryPosts = store.queryPosts({
        ...filters,
        platform: undefined,
        page: 1,
        page_size: 10000,
      }).items;

      matchingQueryPosts.forEach((p) => {
        const item = dist.find((s) => s.platform === p.platform);
        if (item) item.count++;
      });
    }

    return dist;
  }, [mounted, filters, total]);

  const activeSourcesWithData = useMemo(() => {
    return mounted ? sourceDistribution.filter((s) => s.count > 0) : [];
  }, [mounted, sourceDistribution]);

  const sourceCountsSummary = useMemo(() => {
    return sourceDistribution.map((s) => `${s.source}: ${s.count}`).join(", ");
  }, [sourceDistribution]);

  useEffect(() => {
    if (!mounted) return;
    updatePageContext({
      route: "/feed",
      page_name: "Social Listening Feed",
      page_purpose:
        "Filterable multi-source feed of student feedback, news, reviews, and discussions across YouTube, Bluesky, GDELT, Google News, and Google Places.",
      filters: { ...filters },
      metrics: {
        total_matching_posts: total,
        visible_on_page: posts.length,
        current_page: filters.page || 1,
        active_platform_filter: filters.platform || "All Sources",
        active_sentiment_filter: filters.sentiment || "All Sentiments",
        search_query: filters.query || "None",
        source_counts: sourceCountsSummary,
      },
      selected_item: activeArticle
        ? {
            type: "article_or_post",
            id: activeArticle.id,
            platform: activeArticle.platform,
            title: activeArticle.article_title || activeArticle.content.slice(0, 80),
            author: activeArticle.author_handle,
            sentiment: activeArticle.sentiment,
            topic: activeArticle.topic,
          }
        : undefined,
      sample_data_status: isSampleNeeded ? "Sample baseline dataset" : "Live Verified Social Signals",
      key_records: posts.slice(0, 5).map((p) => ({
        id: p.id,
        platform: p.platform,
        author: p.author_handle,
        content: p.content.slice(0, 140),
        sentiment: p.sentiment,
        topic: p.topic,
        likes: p.likes,
        comments: p.comments,
      })),
    });
  }, [
    mounted,
    total,
    posts,
    filters,
    activeArticle,
    sourceCountsSummary,
    isSampleNeeded,
    updatePageContext,
  ]);

  const getPlatformBadge = (platform: Platform) => {
    switch (platform) {
      case "youtube":
        return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">YouTube</span>;
      case "bluesky":
        return <span className="text-[10px] font-bold text-[#008FD3] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">Bluesky</span>;
      case "gdelt":
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">GDELT</span>;
      case "google_news":
        return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Google News</span>;
      case "google_maps":
        return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Google Places</span>;
      default:
        return <span className="text-[10px] font-bold text-[#666666] bg-gray-50 px-1.5 py-0.5 rounded border border-[#E5E7EB]">{platform}</span>;
    }
  };

  return (
    <>
      <Topbar pageTitle="Social Listening" onRefresh={handleManualRefresh} />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-6 animate-fade-in-up">
        {/* Real-time Radar Header matching Stitch */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-3 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2ecff] text-[#00629e] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#0099f2] animate-ping"></span>
                Real-time Radar
              </span>
              <span className="text-xs text-[#3f4852] font-semibold">
                Synced across 5 active channels
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Social Listening
            </h1>
            <p className="text-sm md:text-base text-[#3f4852] mt-1 max-w-2xl leading-relaxed">
              Track real-time vocational chatter, community sentiment, and learner inquiries across YouTube, Bluesky, Google News, GDELT, and Google Places.
            </p>

            {/* Preserved Legacy Toggle (Kept in code behind flag) */}
            {SHOW_LEGACY_CONTROLS && (
              <div className="flex items-center gap-1.5 bg-[#eaf5ff] p-1 rounded-full border border-[#0099f2]/15 w-fit mt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("omni")}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "omni"
                      ? "bg-[#0099f2] text-white shadow-xs"
                      : "text-[#3f4852] hover:text-[#001e2d]"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Unified Feed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("gdelt")}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "gdelt"
                      ? "bg-[#0099f2] text-white shadow-xs"
                      : "text-[#3f4852] hover:text-[#001e2d]"
                  }`}
                >
                  <Newspaper className="w-3.5 h-3.5 text-amber-500" />
                  <span>GDELT Newsroom</span>
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                    DOC 2.0
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Action buttons (Cleaned up: 4 legacy toolbar buttons removed from rendering) */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {SHOW_LEGACY_CONTROLS && (
              <>
                <button
                  onClick={handleManualRefresh}
                  disabled={loading || liveFetching}
                  className="stitch-btn-primary"
                  title="Re-query live source APIs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading || liveFetching ? "animate-spin text-white" : ""}`} />
                  <span>Refresh Stream</span>
                </button>

                <button
                  onClick={() => setBskyOpen(!bskyOpen)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-[#00629e] shadow-azure-card hover:bg-[#eaf5ff]"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Bluesky Stream</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setCsvOpen(!csvOpen);
                if (bskyOpen) setBskyOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                csvOpen
                  ? "bg-[#00629e] text-white shadow-xs"
                  : "bg-white text-[#00629e] shadow-azure-card hover:bg-[#eaf5ff]"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>
          </div>
        </section>

        {activeTab === "gdelt" ? (
          <GdeltIntelligenceView
            initialQuery={filters.query || "Tata STRIVE"}
            onImportToFeed={(articles) => {
              api.collectPosts(articles);
              fetchPosts();
            }}
          />
        ) : (
          <>
            {/* Preserved Legacy Collector Panel (Kept behind flag) */}
            {SHOW_LEGACY_COLLECTOR && (
              <BlueskyCollector
                isOpen={bskyOpen}
                onToggle={() => setBskyOpen(!bskyOpen)}
                onImportPosts={(newPosts) => {
                  api.collectPosts(newPosts);
                  fetchPosts();
                }}
              />
            )}

            {/* Direct CSV Ingestion Panel */}
            <CsvUploadPanel
              isOpen={csvOpen}
              onClose={() => setCsvOpen(false)}
              onImportSuccess={() => {
                fetchPosts();
              }}
            />

            {/* ================================================================= */}
            {/* LAYOUT SECTION A: Active Data Connectors Bar (Unchanged)          */}
            {/* ================================================================= */}
            <div className="bg-[#F8FAFC] rounded-xl px-4 py-2.5 border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#0067A5]" />
                <span className="font-bold text-[#252525]">Active Data Connectors:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-[#252525]">YouTube API v3</span>
                </div>
                <span className="text-[#CBD5E1]">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-[#252525]">GDELT DOC 2.0</span>
                </div>
                <span className="text-[#CBD5E1]">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-[#252525]">Google News RSS</span>
                </div>
                <span className="text-[#CBD5E1]">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-[#252525]">Bluesky AT Proto</span>
                </div>
                <span className="text-[#CBD5E1]">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-[#252525]">Google Places API</span>
                </div>
              </div>

              <button
                onClick={() => setShowSourceVolumeChart(!showSourceVolumeChart)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0067A5] hover:underline cursor-pointer"
              >
                <BarChart2 className="w-3 h-3" />
                <span>{showSourceVolumeChart ? "Hide Volume" : "Show Volume Chart"}</span>
              </button>
            </div>

            {/* Optional Volume by Source Chart */}
            {showSourceVolumeChart && activeSourcesWithData.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#252525] flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-[#0067A5]" />
                    <span>Real Conversation Volume by Source</span>
                  </h3>
                  <span className="text-[10px] text-[#666666]">
                    Derived strictly from collected records
                  </span>
                </div>
                <div className="h-28 w-full pt-1">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeSourcesWithData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="source" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                        <Bar dataKey="count" name="Records" fill="#0067A5" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* LAYOUT SECTION B: Prominent Search Section Directly Below Connectors */}
            {/* ================================================================= */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-azure-card space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-center gap-3">
                {/* 56px height, 18px text, rounded-2xl search input */}
                <div className="relative flex-1 w-full">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#666666]" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search live signals: skilling, apprenticeships, EV, solar, placements..."
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#F5F7F9] border border-[#E5E7EB] text-lg text-[#001e2d] placeholder:text-[#666666] focus:outline-none focus:border-[#0099f2] focus:bg-white transition-all shadow-inner"
                  />
                </div>

                {/* Controls on the same row */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 justify-between lg:justify-end">
                  {/* Questions only checkbox */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#001e2d] cursor-pointer bg-[#F5F7F9] px-3.5 h-12 rounded-xl border border-[#E5E7EB] hover:bg-[#eaf5ff] transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.is_question === true}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          is_question: e.target.checked ? true : undefined,
                          page: 1,
                        })
                      }
                      className="rounded border-[#E5E7EB] text-[#0099f2] focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Questions only</span>
                  </label>

                  {/* Sort dropdown */}
                  <select
                    value={filters.sort || "recent"}
                    onChange={(e) =>
                      setFilters({ ...filters, sort: e.target.value as any, page: 1 })
                    }
                    className="h-12 px-3 rounded-xl bg-[#F5F7F9] border border-[#E5E7EB] text-xs font-semibold text-[#001e2d] focus:outline-none focus:border-[#0099f2] cursor-pointer"
                  >
                    <option value="recent">Sort: Most Recent</option>
                    <option value="engagement">Sort: Highest Engagement</option>
                    <option value="rating">Sort: Highest Rating</option>
                  </select>

                  {/* Show dropdown */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3f4852] bg-[#F5F7F9] px-3 h-12 rounded-xl border border-[#E5E7EB]">
                    <span>Show:</span>
                    <select
                      value={filters.page_size || 20}
                      onChange={(e) =>
                        setFilters({ ...filters, page_size: parseInt(e.target.value, 10), page: 1 })
                      }
                      className="bg-transparent text-xs font-bold text-[#001e2d] focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Large Search button */}
                  <button
                    type="submit"
                    disabled={liveFetching}
                    className="h-12 px-6 rounded-xl bg-[#0099f2] hover:bg-[#0080cc] text-white text-sm font-bold shadow-azure-card hover:shadow-azure-hover transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 whitespace-nowrap"
                  >
                    {liveFetching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-white" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Keywords for Topic Exploration */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E5E7EB] text-xs">
                <span className="font-bold text-[#00629e] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0099f2]" />
                  Query Topics:
                </span>
                {[
                  "Tata STRIVE",
                  "skilling",
                  "employability",
                  "vocational training",
                  "apprenticeships",
                  "solar technician",
                  "practical AI skills",
                  "EV technician",
                ].map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      setSearchInput(keyword);
                      handleSearchSubmit(undefined, keyword);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#eaf5ff] hover:bg-[#def0ff] text-[#00629e] text-[11px] font-bold border border-[#0099f2]/20 transition-all cursor-pointer"
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
            </div>

            {/* Fetch Feedback Toast */}
            {liveStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-2xs ${
                  liveStatus.ok
                    ? "bg-[#eaf5ff] text-[#00629e] border-[#0099f2]/30"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {liveStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0099f2] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{liveStatus.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLiveStatus(null)}
                  className="text-[11px] font-bold text-[#00629e] hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ================================================================= */}
            {/* LAYOUT SECTION C: Source Tabs With Live Counts                   */}
            {/* ================================================================= */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <button
                type="button"
                onClick={() => setFilters({ ...filters, platform: undefined, page: 1 })}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  !filters.platform
                    ? "bg-[#0099f2] text-white shadow-azure-card"
                    : "bg-white text-[#3f4852] border border-[#E5E7EB] hover:bg-[#eaf5ff] hover:text-[#0099f2]"
                }`}
              >
                All Sources {mounted ? `(${sourceDistribution.reduce((acc, s) => acc + s.count, 0)})` : ""}
              </button>
              {sourceDistribution.map((src) => {
                const isActive = filters.platform === src.platform;
                return (
                  <button
                    key={src.platform}
                    type="button"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        platform: isActive ? undefined : (src.platform as Platform),
                        page: 1,
                      })
                    }
                    className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#0099f2] text-white shadow-azure-card"
                        : "bg-white text-[#3f4852] border border-[#E5E7EB] hover:bg-[#eaf5ff] hover:text-[#0099f2]"
                    }`}
                  >
                    <span>{src.source}</span>
                    {mounted && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-[#eaf5ff] text-[#0099f2]"
                        }`}
                      >
                        {src.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ================================================================= */}
            {/* LAYOUT SECTION D: Filters Row With "Showing N records"            */}
            {/* ================================================================= */}
            <FilterBar
              filters={filters}
              onChange={setFilters}
              availableSources={sourceDistribution.map((s) => ({
                platform: s.platform as Platform,
                count: s.count,
                connected: true,
              }))}
              totalResults={total}
            />

            {/* ================================================================= */}
            {/* LAYOUT SECTION E: Posts List & Right Sidebar                      */}
            {/* ================================================================= */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#666666] gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#0099f2]" />
                <span className="text-xs font-semibold text-[#001e2d]">Streaming social conversations...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-[#E5E7EB] text-center space-y-2">
                <h3 className="text-sm font-bold text-[#001e2d]">
                  No records found matching active filters
                </h3>
                <p className="text-xs text-[#3f4852] max-w-md mx-auto">
                  Try searching for &quot;Tata STRIVE&quot;, &quot;skilling&quot;, or &quot;vocational training&quot;, or click Refresh above to fetch live signals.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Stream: Posts List (col-span-8) */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Stream Controls Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#001e2d]">Live Community Stream</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#def0ff] text-[#0099f2] text-xs font-bold">
                        {posts.length} signals displayed
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Mix Sources Toggle (Round-robin interleaving) */}
                      {!filters.platform && (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-[#001e2d]">
                          <input
                            type="checkbox"
                            checked={mixSources}
                            onChange={(e) => {
                              setMixSources(e.target.checked);
                              setFilters((prev) => ({
                                ...prev,
                                mix_sources: e.target.checked,
                                page: 1,
                              }));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#0099f2] relative"></div>
                          <span className="text-[11px] text-[#3f4852]">Mix sources</span>
                        </label>
                      )}

                      {/* Layout Switch (Cards vs Table) */}
                      <div className="bg-white p-1 rounded-full shadow-azure-card flex text-xs border border-[#E5E7EB]">
                        <button
                          onClick={() => setViewMode("cards")}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            viewMode === "cards" ? "bg-[#0099f2] text-white shadow-xs" : "text-[#3f4852] hover:text-[#001e2d]"
                          }`}
                          title="Cards View"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewMode("table")}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            viewMode === "table" ? "bg-[#0099f2] text-white shadow-xs" : "text-[#3f4852] hover:text-[#001e2d]"
                          }`}
                          title="Table View"
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cards View */}
                  {viewMode === "cards" ? (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onReadInPage={(p) => setActiveArticle(p)}
                          onViewComments={(p) => setActiveCommentsPost(p)}
                          onShare={(p) => setActiveSharePost(p)}
                          onAnalyzeWithAI={(p) => setActiveArticle(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Table View */
                    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F5F7F9] border-b border-[#E5E7EB] text-[#666666] font-semibold">
                              <th className="py-3 px-4">Source</th>
                              <th className="py-3 px-4">Headline / Content</th>
                              <th className="py-3 px-4">Topic</th>
                              <th className="py-3 px-4">Sentiment</th>
                              <th className="py-3 px-4">Metric / Status</th>
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] text-[#252525]">
                            {posts.map((post) => (
                              <tr key={post.id} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {getPlatformBadge(post.platform)}
                                    {post.is_question && (
                                      <span className="p-0.5 text-[#0067A5]" title="Question Detected">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 max-w-md">
                                  {post.article_title && (
                                    <span className="font-bold text-[#252525] block truncate mb-0.5">
                                      {post.article_title}
                                    </span>
                                  )}
                                  <p className="text-[#4B5563] leading-relaxed line-clamp-2">
                                    {post.content}
                                  </p>
                                  <span className="text-[10px] text-[#666666] block mt-0.5">
                                    by {post.domain || post.author_handle}
                                  </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] text-[10px] font-semibold border border-[#008FD3]/20">
                                    {post.topic}
                                  </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                                      post.sentiment === "positive"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : post.sentiment === "negative"
                                        ? "bg-red-50 text-red-800 border-red-200"
                                        : "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {post.sentiment}
                                  </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap tabular-nums text-[11px] text-[#666666]">
                                  {post.rating ? (
                                    <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      {post.rating} / 5 ★
                                    </span>
                                  ) : post.platform === "youtube" ? (
                                    <div className="flex items-center gap-2">
                                      {post.likes !== undefined && <span>{post.likes} likes</span>}
                                      {post.comments !== undefined && <span>{post.comments} comments</span>}
                                    </div>
                                  ) : post.platform === "bluesky" ? (
                                    <div className="flex items-center gap-2">
                                      {post.likes ? <span>{post.likes} likes</span> : null}
                                      {post.comments ? <span>{post.comments} replies</span> : null}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] italic text-[#666666]">Press wire</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap text-[#666666] text-[11px]">
                                  {post.posted_at.slice(0, 10)}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    {post.platform === "youtube" && (
                                      <button
                                        type="button"
                                        onClick={() => setActiveCommentsPost(post)}
                                        className="text-[11px] font-semibold text-[#0067A5] hover:text-[#005588] bg-[#DCEFF7] hover:bg-[#cbe6f3] px-2 py-1 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>Comments</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(post.url, post.id)}
                                      className="text-[11px] font-semibold text-[#666666] hover:text-[#252525] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                                      title="Copy content URL"
                                    >
                                      {copiedId === post.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                      <span>{copiedId === post.id ? "Copied" : "Copy"}</span>
                                    </button>

                                    {post.url && (
                                      <a
                                        href={post.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold text-[#0067A5] hover:text-[#005588] hover:underline inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F5F7F9] hover:bg-[#DCEFF7] border border-[#E5E7EB] transition-colors"
                                      >
                                        <span>Open</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {total > (filters.page_size || 20) && (
                    <div className="flex items-center justify-between pt-2 text-xs text-[#666666]">
                      <span>
                        Showing {(filters.page! - 1) * filters.page_size! + 1} to{" "}
                        {Math.min(filters.page! * filters.page_size!, total)} of {total} records
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={filters.page === 1}
                          onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                          className="px-2.5 py-1 rounded border border-[#E5E7EB] bg-white text-[#252525] hover:bg-[#DCEFF7] disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-semibold text-[#0067A5]">Page {filters.page}</span>
                        <button
                          disabled={filters.page! * filters.page_size! >= total}
                          onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                          className="px-2.5 py-1 rounded border border-[#E5E7EB] bg-white text-[#252525] hover:bg-[#DCEFF7] disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Sidebar: Topics, In-Depth Sentiment, and YouTube Analyzer (col-span-4) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* 1. What people are talking about (Real Computed Topics) */}
                  <div className="stitch-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-[#001e2d]">
                        What people are talking about
                      </h2>
                      <span className="material-symbols-outlined text-[#0099f2] text-[20px]">trending_up</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#3f4852]">
                        Top 5 recurring skilling topics computed from last 7 days volume.
                      </p>
                      {isSampleNeeded && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                          Sample data
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {isSampleNeeded ? (
                        SAMPLE_TRENDING_TOPICS.map((topicItem: any, idx: number) => {
                          const name = (topicItem.tag || topicItem.name || "").replace(/^#/, "");
                          const mentionsStr = formatCount(topicItem.mentions);
                          const growthStr = formatChange(topicItem.growth);

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSearchInput(name);
                                handleSearchSubmit(undefined, name);
                              }}
                              className="p-3 rounded-xl bg-[#eaf5ff] hover:bg-[#def0ff] transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-bold text-[#0099f2] group-hover:underline truncate">
                                  #{name}
                                </span>
                                {growthStr && (
                                  <span className="chip-growing">
                                    <TrendingUp className="w-3 h-3" />
                                    {growthStr}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-[#3f4852]">
                                <span>{mentionsStr}</span>
                                {topicItem.region && <span className="font-semibold text-[#001e2d]">{topicItem.region}</span>}
                              </div>
                            </div>
                          );
                        })
                      ) : computedTopics.length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-2">No topic clusters detected for current filters.</p>
                      ) : (
                        computedTopics.map((topicItem, idx) => (
                          <div
                            key={topicItem.id || idx}
                            onClick={() => {
                              setFilters({
                                ...filters,
                                topic: topicItem.name,
                                page: 1,
                              });
                            }}
                            className={`p-3 rounded-xl transition-all cursor-pointer group ${
                              filters.topic === topicItem.name
                                ? "bg-[#0099f2] text-white shadow-xs"
                                : "bg-[#eaf5ff] hover:bg-[#def0ff] text-[#001e2d]"
                            }`}
                            title={`Click to filter feed by ${topicItem.name}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className={`text-xs font-bold truncate group-hover:underline ${
                                  filters.topic === topicItem.name ? "text-white" : "text-[#0099f2]"
                                }`}
                              >
                                #{topicItem.name}
                              </span>
                              {topicItem.growth_label && (
                                <span
                                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5 ${
                                    filters.topic === topicItem.name
                                      ? "bg-white/20 text-white"
                                      : topicItem.is_new
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {!topicItem.is_new && <TrendingUp className="w-2.5 h-2.5" />}
                                  {topicItem.growth_label}
                                </span>
                              )}
                            </div>
                            <div
                              className={`flex items-center justify-between text-[11px] ${
                                filters.topic === topicItem.name ? "text-white/80" : "text-[#3f4852]"
                              }`}
                            >
                              <span>{formatCount(topicItem.post_count)}</span>
                              <span
                                className={`font-semibold ${
                                  filters.topic === topicItem.name ? "text-white" : "text-[#001e2d]"
                                }`}
                              >
                                {topicItem.location_or_source}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2. In-Depth Sentiment Analysis Card based on ALL matching records */}
                  <SentimentBreakdownCard
                    posts={allMatchingPosts}
                    loading={loading}
                    searchQuery={filters.query}
                    dateRange={filters.date_range}
                  />

                  {/* 3. YouTube Community Comment Analysis Card (Moved to Sidebar) */}
                  <YoutubeCommentAnalysisCard
                    topic={filters.query || "Tata STRIVE"}
                    onSelectQuestion={(q) => {
                      setSearchInput(q);
                      handleSearchSubmit(undefined, q);
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* In-Page Article Detail Modal with AI Analysis */}
      <ArticleDetailModal
        post={activeArticle}
        onClose={() => setActiveArticle(null)}
      />

      {/* Discussion & Comments Modal */}
      <CommentsModal
        post={activeCommentsPost}
        onClose={() => setActiveCommentsPost(null)}
        onCommentAdded={(p, newCount) => {
          setPosts((prev) =>
            prev.map((item) =>
              item.id === p.id ? { ...item, comments: newCount } : item
            )
          );
        }}
      />

      {/* Share Modal */}
      <ShareModal
        post={activeSharePost}
        onClose={() => setActiveSharePost(null)}
      />
    </>
  );
}

export default function SocialListeningPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#666666]">Loading listening feed...</div>}>
      <ListeningContent />
    </Suspense>
  );
}
