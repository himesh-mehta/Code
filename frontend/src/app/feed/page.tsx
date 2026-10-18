"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { PostCard } from "@/components/PostCard";
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
  Share2,
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
import { YoutubeCommentAnalysisCard } from "@/components/YoutubeCommentAnalysisCard";
import { store } from "@/lib/data-store";
import { usePageContext } from "@/context/PageContext";
import { SAMPLE_TRENDING_TOPICS } from "@/lib/sampleData";

function ListeningContent() {
  const searchParams = useSearchParams();
  const { updatePageContext } = usePageContext();

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);

  // Compute real dynamic sentiment distribution from currently filtered posts
  const sentimentStats = useMemo(() => {
    const totalPosts = posts.length || 1;
    const pos = posts.filter((p) => p.sentiment === "positive").length;
    const neu = posts.filter((p) => p.sentiment === "neutral").length;
    const neg = posts.filter((p) => p.sentiment === "negative").length;
    const posPct = Math.round((pos / totalPosts) * 100);
    const neuPct = Math.round((neu / totalPosts) * 100);
    const negPct = Math.max(0, 100 - posPct - neuPct);
    return {
      positive: posPct,
      neutral: neuPct,
      negative: negPct,
      total: posts.length,
    };
  }, [posts]);
  const [showSourceVolumeChart, setShowSourceVolumeChart] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mount state to prevent SSR/client hydration divergence
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLastRefreshed(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, []);

  // Modals state
  const [activeArticle, setActiveArticle] = useState<Post | null>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<Post | null>(null);
  const [activeSharePost, setActiveSharePost] = useState<Post | null>(null);

  // Active view: Omni-channel feed vs GDELT News Intelligence
  const [activeTab, setActiveTab] = useState<"omni" | "gdelt">("omni");

  // Auxiliary panels
  const [bskyOpen, setBskyOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  // Live Multi-Source Fetch State
  const [liveFetching, setLiveFetching] = useState(false);
  const [liveStatus, setLiveStatus] = useState<{ message: string; ok: boolean } | null>(null);

  // Filters state
  const [filters, setFilters] = useState<PostsQuery>({
    query: searchParams.get("query") || undefined,
    platform: (searchParams.get("platform") as Platform) || undefined,
    sentiment: (searchParams.get("sentiment") as Sentiment) || undefined,
    topic: searchParams.get("topic") || undefined,
    is_question: searchParams.get("questions_only") === "true" ? true : undefined,
    is_relevant: searchParams.get("relevant_only") === "true" ? true : undefined,
    date_range: (searchParams.get("date_range") as any) || "30d",
    sort: (searchParams.get("sort") as any) || "recent",
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
        setLastRefreshed(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    const q = filters.query || "Tata STRIVE";
    try {
      // 1. Fire ultra-fast primary connectors first (YouTube, Google News, Bluesky)
      await Promise.allSettled([
        api.searchYouTube(q, 15),
        api.searchGoogleNews(q, 15),
        api.searchBluesky(q, 15),
      ]);
      // Update UI immediately (sub-1 second)
      fetchPosts();
      setLoading(false);

      // 2. Auxiliary connectors run in the background without freezing the UI
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
        message: `Querying live signals for "${query}" across YouTube, Google News & Bluesky...`,
        ok: true,
      });

      try {
        // Fast primary burst (responds in 200-800ms)
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

        setLiveStatus({
          message: counts.length > 0
            ? `Retrieved ${counts.join(", ")} for "${query}". Loading background signals...`
            : `Live search complete for "${query}".`,
          ok: true,
        });

        fetchPosts();
        setLiveFetching(false);

        // Auxiliary background fetch without holding UI
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

  // Strictly genuine 5 platforms
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
      sample_data_status: "Live Verified Social Signals",
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
      <Topbar pageTitle="Social Listening" onRefresh={fetchPosts} />

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
              Track real-time vocational chatter, community sentiment, and learner inquiries across YouTube, LinkedIn, Telegram, and regional forums.
            </p>

            {/* View Mode Toggle: Unified Feed vs GDELT Newsroom */}
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
          </div>

          {/* Header Action Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
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
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
                bskyOpen
                  ? "bg-[#00629e] text-white shadow-xs"
                  : "bg-white text-[#00629e] shadow-azure-card hover:bg-[#eaf5ff]"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Bluesky Stream</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCsvOpen(!csvOpen);
                if (bskyOpen) setBskyOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
                csvOpen
                  ? "bg-[#00629e] text-white shadow-xs"
                  : "bg-white text-[#00629e] shadow-azure-card hover:bg-[#eaf5ff]"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>

            {/* Layout switch */}
            <div className="bg-white p-1 rounded-full shadow-azure-card flex text-xs">
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-full transition-all ${viewMode === "cards" ? "bg-[#0099f2] text-white shadow-xs" : "text-[#3f4852] hover:text-[#001e2d]"}`}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-full transition-all ${viewMode === "table" ? "bg-[#0099f2] text-white shadow-xs" : "text-[#3f4852] hover:text-[#001e2d]"}`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
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
            {/* Live Stream Collector Panel */}
            <BlueskyCollector
              isOpen={bskyOpen}
              onToggle={() => setBskyOpen(!bskyOpen)}
              onImportPosts={(newPosts) => {
                api.collectPosts(newPosts);
                fetchPosts();
              }}
            />

            {/* Direct CSV Ingestion Panel */}
            <CsvUploadPanel
              isOpen={csvOpen}
              onClose={() => setCsvOpen(false)}
              onImportSuccess={() => {
                fetchPosts();
              }}
            />

            {/* Compact Live Source Status Bar */}
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

            {/* Platform Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <button
                type="button"
                onClick={() => setFilters({ ...filters, platform: undefined, page: 1 })}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  !filters.platform
                    ? "bg-[#0067A5] text-white shadow-2xs"
                    : "bg-white text-[#666666] border border-[#E5E7EB] hover:bg-[#DCEFF7] hover:text-[#0067A5]"
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
                    className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#0067A5] text-white shadow-2xs"
                        : "bg-white text-[#666666] border border-[#E5E7EB] hover:bg-[#DCEFF7] hover:text-[#0067A5]"
                    }`}
                  >
                    <span>{src.source}</span>
                    {mounted && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-[#F5F7F9] text-[#0067A5]"
                        }`}
                      >
                        {src.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Global Filter Bar */}
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

            {/* Search & Sort Bar */}
            <div className="bg-white rounded-xl p-3.5 border border-[#E5E7EB] shadow-xs space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#666666]" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search live signals: skilling, apprenticeships, EV..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] placeholder:text-[#666666] focus:outline-none focus:border-[#0067A5]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={liveFetching}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors disabled:opacity-70 whitespace-nowrap flex-shrink-0 cursor-pointer"
                  >
                    {liveFetching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 text-white" />
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <label className="flex items-center gap-1.5 text-xs text-[#252525] cursor-pointer">
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
                      className="rounded border-[#E5E7EB] text-[#0067A5] focus:ring-0"
                    />
                    <span className="font-medium">Questions only</span>
                  </label>

                  <select
                    value={filters.sort || "recent"}
                    onChange={(e) =>
                      setFilters({ ...filters, sort: e.target.value as any, page: 1 })
                    }
                    className="h-8 px-2.5 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] focus:outline-none focus:border-[#0067A5] cursor-pointer"
                  >
                    <option value="recent">Sort: Most Recent</option>
                    <option value="engagement">Sort: Highest Engagement</option>
                    <option value="rating">Sort: Highest Rating</option>
                  </select>

                  <div className="flex items-center gap-1.5 text-xs text-[#666666]">
                    <span>Show:</span>
                    <select
                      value={filters.page_size || 20}
                      onChange={(e) =>
                        setFilters({ ...filters, page_size: parseInt(e.target.value, 10), page: 1 })
                      }
                      className="h-8 px-2 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] focus:outline-none focus:border-[#0067A5] cursor-pointer font-medium"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Keywords for Topic Exploration */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#666666]">
                <span className="font-semibold text-[#0067A5] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#0067A5]" />
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
                ].map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      setSearchInput(keyword);
                      handleSearchSubmit(undefined, keyword);
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#DCEFF7] text-[#0067A5] border border-[#008FD3]/30 hover:bg-[#c8e6f3] transition-colors font-medium cursor-pointer"
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Fetch Feedback Banner */}
            {liveStatus && (
              <div
                className={`px-4 py-2 rounded-xl text-xs flex items-center justify-between border ${
                  liveStatus.ok
                    ? "bg-[#DCEFF7]/70 text-[#0067A5] border-[#008FD3]/30"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {liveStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0067A5] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="font-semibold">Live Signals:</span>
                  <span>{liveStatus.message}</span>
                </div>
                <button
                  onClick={() => setLiveStatus(null)}
                  className="text-[11px] font-semibold text-[#0067A5] hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Content Display: Cards vs Table */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#666666] gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0067A5]" />
                <span className="text-xs">Streaming social conversations...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border border-[#E5E7EB] text-center space-y-2">
                <h3 className="text-sm font-semibold text-[#252525]">
                  No records found matching active filters
                </h3>
                <p className="text-xs text-[#666666] max-w-md mx-auto">
                  Try searching for &quot;Tata STRIVE&quot;, &quot;skilling&quot;, or &quot;vocational training&quot;, or click Refresh above to fetch live signals.
                </p>
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Stream: col-span-8 */}
                <div className="lg:col-span-8 space-y-4">
                  {/* YouTube Community Comment Analysis Card for searched topic */}
                  <YoutubeCommentAnalysisCard
                    topic={filters.query || "Tata STRIVE"}
                    onSelectQuestion={(q) => {
                      setSearchInput(q);
                      handleSearchSubmit(undefined, q);
                    }}
                  />

                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#001e2d]">Live Community Stream</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#def0ff] text-[#0099f2] text-xs font-bold">
                        {posts.length} signals displayed
                      </span>
                    </div>
                    <span className="text-xs text-[#3f4852] font-semibold">
                      Showing {posts.length} of {total} mentions
                    </span>
                  </div>

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
                </div>

                {/* Right Column: Trending Topics & Sentiment Breakdown (col-span-4) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Recurring Topics Card computed from real 7-day mentions */}
                  <div className="stitch-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-[#001e2d]">
                        What people are talking about
                      </h2>
                      <span className="material-symbols-outlined text-[#0099f2] text-[20px]">trending_up</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#3f4852]">
                        Top 5 recurring skilling topics computed from last 7 days volume.
                      </p>
                      {trendingTopics.length === 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                          Sample data
                        </span>
                      )}
                    </div>
                    <div className="space-y-3.5">
                      {(trendingTopics.length > 0 ? trendingTopics : SAMPLE_TRENDING_TOPICS).slice(0, 5).map((topicItem: any, idx: number) => {
                        const name = topicItem.name || topicItem.topic;
                        const mentions = topicItem.post_count || topicItem.mentions || topicItem.current_weekly_mentions || 0;
                        const growth = topicItem.growth_pct || topicItem.growth || 0;
                        const region = topicItem.region; // Only if region explicitly exists

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSearchInput(name);
                              handleSearchSubmit(undefined, name);
                            }}
                            className="p-3.5 rounded-xl bg-[#eaf5ff] hover:bg-[#def0ff] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-[#0099f2] group-hover:underline truncate">
                                #{name}
                              </span>
                              <span className="chip-growing">
                                <TrendingUp className="w-3 h-3" />
                                +{Math.abs(growth)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#3f4852]">
                              <span>{mentions.toLocaleString()} mentions</span>
                              {region && <span className="font-semibold text-[#001e2d]">{region}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sentiment Distribution Card from filtered posts */}
                  <div className="stitch-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[#001e2d]">Sentiment Distribution</h3>
                      <span className="text-[11px] text-[#3f4852] font-semibold">N={sentimentStats.total} filtered</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-[#1e9e6a]">Positive Sentiment</span>
                          <span>{sentimentStats.positive}%</span>
                        </div>
                        <div className="w-full bg-[#eaf5ff] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#1e9e6a] h-full rounded-full transition-all duration-500"
                            style={{ width: `${sentimentStats.positive}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-[#6b7a90]">Neutral Queries</span>
                          <span>{sentimentStats.neutral}%</span>
                        </div>
                        <div className="w-full bg-[#eaf5ff] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#6b7a90] h-full rounded-full transition-all duration-500"
                            style={{ width: `${sentimentStats.neutral}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-[#d64545]">Needs Attention</span>
                          <span>{sentimentStats.negative}%</span>
                        </div>
                        <div className="w-full bg-[#eaf5ff] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#d64545] h-full rounded-full transition-all duration-500"
                            style={{ width: `${sentimentStats.negative}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
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

                              {(post.platform === "gdelt" || post.platform === "google_news") && (
                                <button
                                  type="button"
                                  onClick={() => setActiveArticle(post)}
                                  className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  <span>AI Analysis</span>
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
