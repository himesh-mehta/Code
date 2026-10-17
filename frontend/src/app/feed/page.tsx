"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { FilterBar } from "@/components/FilterBar";
import { PostCard } from "@/components/PostCard";
import { api } from "@/lib/api";
import { Post, Platform, Sentiment, PostsQuery } from "@/types";
import {
  Search,
  SlidersHorizontal,
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
  MapPin,
  BookOpen,
  Key,
  ShieldCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { BlueskyCollector } from "@/components/BlueskyCollector";
import { GdeltIntelligenceView } from "@/components/GdeltIntelligenceView";
import { ArticleDetailModal } from "@/components/ArticleDetailModal";
import { MetaTestPanel } from "@/components/MetaTestPanel";
import { CsvUploadPanel } from "@/components/CsvUploadPanel";

import { store } from "@/lib/data-store";

function ListeningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [showSourceVolumeChart, setShowSourceVolumeChart] = useState(true);

  // In-page article detail reader state (GDELT News and full media dispatches)
  const [activeArticle, setActiveArticle] = useState<Post | null>(null);

  // Active view: Omni-channel feed vs GDELT News Intelligence
  const [activeTab, setActiveTab] = useState<"omni" | "gdelt">("omni");

  // Live Stream Collector panel toggle state
  const [bskyOpen, setBskyOpen] = useState(false);
  // Direct CSV Ingestion panel toggle state
  const [csvOpen, setCsvOpen] = useState(false);

  // Hydration safety mount tracker
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Live Multi-Source Fetch State (YouTube, Bluesky, GDELT)
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
    page_size: 15,
  });

  const [searchInput, setSearchInput] = useState(filters.query || "");

  const fetchPosts = () => {
    setLoading(true);
    api.getPosts(filters)
      .then((res) => {
        setPosts(res.items);
        setTotal(res.total);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const handleSearchSubmit = async (e?: React.FormEvent, directTerm?: string) => {
    if (e) e.preventDefault();
    const query = (directTerm !== undefined ? directTerm : searchInput).trim();

    if (query) {
      setLiveFetching(true);
      setLiveStatus({
        message: `Querying public streams from YouTube, Bluesky & GDELT for "${query}"...`,
        ok: true,
      });

      try {
        const [ytRes, bskyRes, gdeltRes] = await Promise.allSettled([
          api.searchYouTube(query, 10),
          api.searchBluesky(query, 10),
          api.searchGdelt(query, "30d", 10),
        ]);

        let ytCount = 0;
        let bskyCount = 0;
        let gdeltCount = 0;

        if (ytRes.status === "fulfilled" && ytRes.value) {
          const ytItems = ytRes.value.items || ytRes.value.posts || [];
          if (ytItems.length > 0) {
            const added = api.collectPosts(ytItems);
            ytCount = added.added || ytItems.length;
          }
        }

        if (bskyRes.status === "fulfilled" && bskyRes.value?.items?.length > 0) {
          const collectResult = api.collectPosts(bskyRes.value.items);
          bskyCount = collectResult.added || bskyRes.value.items.length;
        }

        if (gdeltRes.status === "fulfilled" && gdeltRes.value?.articles?.length > 0) {
          const collectResult = api.collectPosts(gdeltRes.value.articles);
          gdeltCount = collectResult.added || gdeltRes.value.articles.length;
        }

        const counts: string[] = [];
        if (ytCount > 0) counts.push(`${ytCount} from YouTube`);
        if (bskyCount > 0) counts.push(`${bskyCount} from Bluesky`);
        if (gdeltCount > 0) counts.push(`${gdeltCount} from GDELT News`);

        if (counts.length > 0) {
          setLiveStatus({
            message: `Fetched & connected live discussions: ${counts.join(", ")} for "${query}"!`,
            ok: true,
          });
        } else {
          setLiveStatus({
            message: `Search complete for "${query}".`,
            ok: true,
          });
        }

        // Immediately refresh displayed posts from store
        fetchPosts();
      } catch (err: any) {
        setLiveStatus({ message: `Search query error: ${err.message}`, ok: false });
      } finally {
        setLiveFetching(false);
      }
    }

    setFilters({ ...filters, query: query || undefined, page: 1 });
  };

  // Derive source counts for compact source bar chart and source availability from query-matched posts
  // Backed by state to ensure 100% hydration matching between SSR and client
  const [sourceDistribution, setSourceDistribution] = useState([
    { source: "YouTube", count: 0, platform: "youtube" },
    { source: "Bluesky", count: 0, platform: "bluesky" },
    { source: "GDELT News", count: 0, platform: "gdelt" },
    { source: "CSV Import", count: 0, platform: "csv_import" },
  ]);

  useEffect(() => {
    if (!mounted) return;
    const dist = [
      { source: "YouTube", count: 0, platform: "youtube" },
      { source: "Bluesky", count: 0, platform: "bluesky" },
      { source: "GDELT News", count: 0, platform: "gdelt" },
      { source: "CSV Import", count: 0, platform: "csv_import" },
    ];

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

    setSourceDistribution(dist);
  }, [filters, posts, total, mounted]);

  const activeSourcesWithData = mounted ? sourceDistribution.filter((s) => s.count > 0) : [];

  const getPlatformBadge = (platform: Platform) => {
    switch (platform) {
      case "youtube":
        return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">YouTube</span>;
      case "linkedin":
        return <span className="text-[10px] font-bold text-[#0067A5] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">LinkedIn</span>;
      case "bluesky":
        return <span className="text-[10px] font-bold text-[#008FD3] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">Bluesky</span>;
      case "gdelt":
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">GDELT News</span>;
      case "instagram":
        return <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">Instagram</span>;
      case "facebook":
        return <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">Facebook</span>;
      case "google_maps":
        return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Google Maps</span>;
      case "google_play":
        return <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">Google Play</span>;
      case "csv_import":
        return <span className="text-[10px] font-bold text-[#0067A5] bg-[#DCEFF7] px-1.5 py-0.5 rounded border border-[#008FD3]/30">CSV Import</span>;
      default:
        return <span className="text-[10px] font-bold text-[#666666] bg-gray-50 px-1.5 py-0.5 rounded border border-[#E5E7EB]">{platform}</span>;
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
      default:
        return "View Source";
    }
  };

  return (
    <>
      <Topbar pageTitle="Social Listening" onRefresh={fetchPosts} />

      <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
              <span>Social Pulse</span>
              <span className="text-[#CBD5E1]">/</span>
              <span>Raw Signal Monitoring</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#252525] mt-1">
              Social Listening
            </h1>
            <p className="text-sm text-[#666666]">
              Filterable multi-source feed of collected student feedback, reviews, discussions, and ratings.
            </p>

            {/* Listening View Mode Selector: Omni-Channel vs GDELT News Intelligence */}
            <div className="flex items-center gap-1 bg-[#F5F7F9] p-1 rounded-xl border border-[#E5E7EB] w-fit mt-3">
              <button
                type="button"
                onClick={() => setActiveTab("omni")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "omni"
                    ? "bg-[#0067A5] text-white shadow-2xs"
                    : "text-[#666666] hover:text-[#252525]"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Omni-Channel Stream</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("gdelt")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "gdelt"
                    ? "bg-[#0067A5] text-white shadow-2xs"
                    : "text-[#666666] hover:text-[#252525]"
                }`}
              >
                <Newspaper className="w-3.5 h-3.5 text-amber-500" />
                <span>GDELT News Intelligence</span>
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                  DOC 2.0
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBskyOpen(!bskyOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                bskyOpen
                  ? "bg-[#0067A5] text-white border-[#0067A5]"
                  : "bg-white text-[#0067A5] border-[#008FD3]/40 hover:bg-[#DCEFF7]"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Live Social Collector (YT, Bluesky, GDELT)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCsvOpen(!csvOpen);
                if (bskyOpen) setBskyOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                csvOpen
                  ? "bg-[#0067A5] text-white border-[#0067A5]"
                  : "bg-white text-[#0067A5] border-[#E5E7EB] hover:bg-[#DCEFF7]"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>

            <div className="bg-[#F5F7F9] p-0.5 rounded-lg border border-[#E5E7EB] flex text-xs">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded transition-all ${viewMode === "table" ? "bg-[#0067A5] text-white shadow-2xs" : "text-[#666666] hover:text-[#252525]"}`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded transition-all ${viewMode === "cards" ? "bg-[#0067A5] text-white shadow-2xs" : "text-[#666666] hover:text-[#252525]"}`}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

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
            {/* Live Social Discourse Stream Collector (YouTube & Bluesky & GDELT) */}
            <BlueskyCollector
              isOpen={bskyOpen}
              onToggle={() => setBskyOpen(!bskyOpen)}
              onImportPosts={(newPosts) => {
                api.collectPosts(newPosts);
                fetchPosts();
              }}
            />

            {/* Direct In-Page CSV Dataset Ingestion Panel */}
            <CsvUploadPanel
              isOpen={csvOpen}
              onClose={() => setCsvOpen(false)}
              onImportSuccess={() => {
                fetchPosts();
              }}
            />

            {/* Quick In-Page Platform Switcher */}
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
                <span>All Sources</span>
                <span suppressHydrationWarning className="ml-1">
                  ({mounted ? sourceDistribution.reduce((acc, s) => acc + s.count, 0) : 0})
                </span>
              </button>
              {sourceDistribution.filter((s) => s.platform !== "csv_import" || s.count > 0).map((src) => {
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
                    <span
                      suppressHydrationWarning
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#F5F7F9] text-[#0067A5]"
                      }`}
                    >
                      {mounted ? src.count : 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Platform Integration & Developer Setup Notice Banners */}

            {filters.platform === "youtube" && (
              <div className="bg-gradient-to-r from-red-50 via-white to-red-50/30 rounded-xl p-4 border border-red-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-700 flex-shrink-0">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#252525]">YouTube Data API v3</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Live Video Stream Active
                      </span>
                    </div>
                    <p className="text-[#666666] text-[11px] mt-0.5">
                      Real video thumbnails and inline playback supported. Videos can be watched inline or on YouTube.
                    </p>
                  </div>
                </div>
              </div>
            )}

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

        {/* Optional Compact Bar Chart: Conversation Volume by Source */}
        {showSourceVolumeChart && activeSourcesWithData.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#0067A5]" />
                <h3 className="text-xs font-bold text-[#252525]">
                  Conversation Volume by Source
                </h3>
              </div>
              <button
                onClick={() => setShowSourceVolumeChart(false)}
                className="text-[10px] text-[#666666] hover:underline"
              >
                Hide Chart
              </button>
            </div>

            <div className="h-32 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeSourcesWithData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="source" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                  <Bar dataKey="count" name="Conversations" fill="#0067A5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Search & Sort Controls */}
        <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#666666]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search live signals: skilling, employability, apprenticeships..."
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
            </div>
          </div>

          {/* Quick Keywords for Live Public Search */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#666666]">
            <span className="font-semibold text-[#0067A5] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#0067A5]" />
              Explore Skilling Topics:
            </span>
            {[
              "skilling",
              "skill development",
              "employability",
              "vocational training",
              "career guidance",
              "apprenticeships",
              "entrepreneurship",
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
            className={`px-4 py-2.5 rounded-xl text-xs flex items-center justify-between border ${
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
              <span className="font-semibold">Live Signals Stream:</span>
              <span>{liveStatus.message}</span>
            </div>
            <button
              onClick={() => setLiveStatus(null)}
              className="text-[11px] font-semibold text-[#0067A5] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Display: Table or Cards */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#666666] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0067A5]" />
            <span className="text-xs">Streaming social conversations...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-[#E5E7EB] text-center space-y-2">
            <h3 className="text-sm font-semibold text-[#252525]">
              Collect conversations or import a CSV to generate insights
            </h3>
            <p className="text-xs text-[#666666]">
              No conversations match the currently active filters.
            </p>
          </div>
        ) : viewMode === "table" ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5F7F9] border-b border-[#E5E7EB] text-[#666666] font-semibold">
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Original Text</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4">Sentiment</th>
                    <th className="py-3 px-4">Engagement / Rating</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#252525]">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-[#F5F7F9] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getPlatformBadge(post.platform)}
                          {!post.is_sample && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Verified Signal"></span>
                          )}
                          {post.is_relevant === false && (
                            <span className="px-1 py-0.5 rounded text-[8px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                              Filtered
                            </span>
                          )}
                          {post.is_question && (
                            <span className="p-0.5 text-[#0067A5]" title="Question Detected">
                              <HelpCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="text-[#252525] leading-relaxed line-clamp-2">
                          {post.content}
                        </p>
                        <span className="text-[10px] text-[#666666] block mt-0.5">
                          by {post.author_handle}
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
                          <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {post.rating} / 5 ★
                          </span>
                        ) : (
                          <span className="space-x-1.5 text-[10px]">
                            {post.likes !== undefined && <span>{post.likes} likes</span>}
                            {post.shares !== undefined && post.shares > 0 && <span>{post.shares} reposts</span>}
                            {post.comments !== undefined && <span>{post.comments} {post.platform === "bluesky" ? "replies" : "comments"}</span>}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#666666] text-[11px]">
                        {post.posted_at.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {post.platform === "gdelt" && (
                            <button
                              onClick={() => setActiveArticle(post)}
                              className="text-[11px] font-semibold text-[#0067A5] hover:text-[#005588] bg-[#DCEFF7] hover:bg-[#c9e6f3] px-2 py-1 rounded transition-colors cursor-pointer"
                              title="Open article details in-page"
                            >
                              Read In-Page
                            </button>
                          )}
                          {post.url ? (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#0067A5] hover:text-[#005588] hover:underline inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F5F7F9] hover:bg-[#DCEFF7] border border-[#E5E7EB] transition-colors"
                              title={`Open content on ${post.platform}`}
                            >
                              <span>{getExternalLinkText(post.platform)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-[#666666] italic">No Link</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onReadInPage={(p) => setActiveArticle(p)}
              />
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {total > (filters.page_size || 15) && (
          <div className="flex items-center justify-between pt-2 text-xs text-[#666666]">
            <span>
              Showing {(filters.page! - 1) * filters.page_size! + 1} to{" "}
              {Math.min(filters.page! * filters.page_size!, total)} of {total} records
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                className="px-2.5 py-1 rounded border border-[#E5E7EB] bg-white text-[#252525] hover:bg-[#DCEFF7] disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-[#0067A5]">Page {filters.page}</span>
              <button
                disabled={filters.page! * filters.page_size! >= total}
                onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                className="px-2.5 py-1 rounded border border-[#E5E7EB] bg-white text-[#252525] hover:bg-[#DCEFF7] disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* In-Page Article Detail Modal (GDELT News & Media Dispatches) */}
      <ArticleDetailModal
        post={activeArticle}
        onClose={() => setActiveArticle(null)}
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
