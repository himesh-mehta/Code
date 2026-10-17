"use client";

import React, { useState, useEffect } from "react";
import { Post, GdeltNewsResponse } from "@/types";
import { api } from "@/lib/api";
import {
  Newspaper,
  Search,
  Calendar,
  Globe,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  initialQuery?: string;
  onImportToFeed?: (articles: Post[]) => void;
}

const GDELT_TOPIC_PRESETS = [
  "Tata STRIVE",
  "skilling",
  "skill development",
  "employability",
  "vocational training",
  "apprenticeships",
  "youth entrepreneurship",
];

export function GdeltIntelligenceView({ initialQuery = "Tata STRIVE", onImportToFeed }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GdeltNewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedStatus, setImportedStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");

  const executeSearch = async (searchTerm?: string, selectedRange?: string) => {
    const q = (searchTerm !== undefined ? searchTerm : query).trim();
    const range = (selectedRange !== undefined ? selectedRange : dateRange) as "7d" | "14d" | "30d" | "90d";
    if (!q) return;

    setLoading(true);
    setError(null);
    setImportedStatus(null);

    try {
      const res = await api.searchGdelt(q, range, 25);
      setData(res);
      if (res.notice && !res.is_rate_limited) {
        // informative notice
      }
    } catch (err: any) {
      setError(err.message || "Failed to query GDELT Social Listening API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleTopicClick = (topic: string) => {
    setQuery(topic);
    executeSearch(topic);
  };

  const handleClearFilters = () => {
    setQuery("Tata STRIVE");
    setDateRange("30d");
    executeSearch("Tata STRIVE", "30d");
  };

  const handleCollect = () => {
    if (!data || data.articles.length === 0) return;
    if (onImportToFeed) {
      onImportToFeed(data.articles);
    } else {
      api.collectPosts(data.articles);
    }
    setImportedStatus(
      `Collected ${data.articles.length} verified news articles into your main Social Listening session feed!`
    );
  };

  const toneChartData = data
    ? [
        { name: "Positive Tone", count: data.tone_distribution.positive, fill: "#10B981" },
        { name: "Neutral Tone", count: data.tone_distribution.neutral, fill: "#64748B" },
        { name: "Negative Tone", count: data.tone_distribution.negative, fill: "#EF4444" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#666666]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search news by keyword, company, or brand (e.g., Tata STRIVE, vocational training, EV skills)..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] focus:outline-none focus:border-[#0067A5]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 bg-[#F5F7F9] px-2.5 py-1.5 rounded-lg border border-[#E5E7EB]">
              <Calendar className="w-3.5 h-3.5 text-[#0067A5]" />
              <select
                value={dateRange}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setDateRange(val);
                  executeSearch(undefined, val);
                }}
                className="bg-transparent text-xs font-semibold text-[#252525] focus:outline-none cursor-pointer"
              >
                <option value="7d">Last 7 days</option>
                <option value="14d">Last 14 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors disabled:opacity-60 cursor-pointer shadow-xs whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Querying GDELT...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Search News</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              title="Reset search to default"
              className="p-2 rounded-lg border border-[#E5E7EB] text-[#666666] hover:bg-[#F5F7F9] hover:text-[#252525] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Preset Topic Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#666666]">
          <span className="font-semibold text-[#0067A5] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#0067A5]" />
            Quick Topics:
          </span>
          {GDELT_TOPIC_PRESETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTopicClick(t)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                query.toLowerCase() === t.toLowerCase()
                  ? "bg-[#0067A5] text-white border-[#0067A5]"
                  : "bg-[#DCEFF7]/60 text-[#0067A5] border-[#008FD3]/30 hover:bg-[#DCEFF7]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Notice / Rate limit disclaimer */}
      {data?.notice && (
        <div className="px-4 py-2.5 rounded-xl text-xs flex items-center justify-between border bg-blue-50 text-blue-900 border-blue-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0067A5] flex-shrink-0" />
            <span>{data.notice}</span>
          </div>
          <span className="text-[10px] text-blue-700 font-medium">GDELT DOC 2.0 API</span>
        </div>
      )}

      {/* Action imported feedback */}
      {importedStatus && (
        <div className="px-4 py-2.5 rounded-xl text-xs flex items-center justify-between border bg-emerald-50 text-emerald-900 border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{importedStatus}</span>
          </div>
          <button
            onClick={() => setImportedStatus(null)}
            className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Retrieved Articles */}
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                Articles Retrieved
              </span>
              <Newspaper className="w-4 h-4 text-[#0067A5]" />
            </div>
            <div className="text-2xl font-bold text-[#252525] tabular-nums">
              {data.total_retrieved}
            </div>
            <p className="text-[10px] text-[#666666]">
              Verified full news records parsed
            </p>
          </div>

          {/* Card 2: Estimated Global Mentions (clearly distinguished) */}
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                Est. Global Mentions
              </span>
              <Globe className="w-4 h-4 text-[#008FD3]" />
            </div>
            <div className="text-2xl font-bold text-[#252525] tabular-nums">
              ~{data.hits_estimate.toLocaleString()}
            </div>
            <p className="text-[10px] text-[#666666]">
              Index estimate across global news
            </p>
          </div>

          {/* Card 3: Media Tone Distribution */}
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                Media Tone Balance
              </span>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                +{data.tone_distribution.positive} Pos
              </span>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-gray-50 text-gray-700 border border-gray-200">
                {data.tone_distribution.neutral} Neu
              </span>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                -{data.tone_distribution.negative} Neg
              </span>
            </div>
            <p className="text-[10px] text-[#666666] pt-0.5">
              Publisher editorial tone (not citizen posts)
            </p>
          </div>

          {/* Card 4: Leading Media Source */}
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
                Top Media Source
              </span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-base font-bold text-[#252525] truncate">
              {data.top_domains[0]?.domain || "National News"}
            </div>
            <p className="text-[10px] text-[#666666]">
              {data.top_domains[0] ? `${data.top_domains[0].count} articles published` : "News aggregators"}
            </p>
          </div>
        </div>
      )}

      {/* Analytics Section: Coverage Over Time & Tone Breakdown */}
      {data && data.articles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart 1: Article Coverage Over Time */}
          <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#252525] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#0067A5]" />
                  <span>Media Coverage Volume Over Time</span>
                </h3>
                <p className="text-[10px] text-[#666666]">
                  Publication velocity based on retrieved GDELT articles for &quot;{data.query}&quot;
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[#0067A5] bg-[#DCEFF7] px-2 py-0.5 rounded">
                {data.timespan}
              </span>
            </div>

            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGdelt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0067A5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0067A5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="count" name="Articles" stroke="#0067A5" strokeWidth={2} fillOpacity={1} fill="url(#colorGdelt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Media Tone Distribution */}
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-xs space-y-2">
            <div>
              <h3 className="text-xs font-bold text-[#252525] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Media Tone Breakdown</span>
              </h3>
              <p className="text-[10px] text-[#666666]">
                Distribution of publisher coverage sentiment
              </p>
            </div>

            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toneChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }}
                  />
                  <Bar dataKey="count" name="Articles" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Article Feed Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#252525]">
            Real News Coverage Feed
          </h2>
          {data && (
            <span className="text-xs font-semibold text-[#0067A5] bg-[#DCEFF7] px-2 py-0.5 rounded-full">
              {data.articles.length} articles
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {data && data.articles.length > 0 && (
            <button
              type="button"
              onClick={handleCollect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Collect {data.articles.length} Articles to Feed</span>
            </button>
          )}

          <div className="bg-[#F5F7F9] p-0.5 rounded-lg border border-[#E5E7EB] flex text-xs">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "cards" ? "bg-[#0067A5] text-white shadow-2xs" : "text-[#666666]"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "compact" ? "bg-[#0067A5] text-white shadow-2xs" : "text-[#666666]"
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Article Feed List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#666666] gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#0067A5]" />
          <span className="text-xs">Streaming global news coverage from GDELT...</span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-xl bg-red-50 text-red-900 border border-red-200 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
          <h3 className="text-xs font-bold">Failed to load GDELT news</h3>
          <p className="text-xs text-red-700">{error}</p>
          <button
            onClick={() => executeSearch()}
            className="px-3 py-1 bg-white text-red-700 border border-red-300 rounded text-xs font-semibold hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : !data || data.articles.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-[#E5E7EB] text-center space-y-2">
          <Newspaper className="w-8 h-8 text-[#666666] mx-auto opacity-40" />
          <h3 className="text-sm font-semibold text-[#252525]">
            No news articles found for &quot;{query}&quot;
          </h3>
          <p className="text-xs text-[#666666] max-w-sm mx-auto">
            Try adjusting your search keyword or selecting a wider date range like &quot;Last 90 days&quot;.
          </p>
        </div>
      ) : viewMode === "compact" ? (
        /* Compact Table View */
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F7F9] border-b border-[#E5E7EB] text-[#666666] font-semibold">
                  <th className="py-3 px-4">Publisher / Source</th>
                  <th className="py-3 px-4">Headline</th>
                  <th className="py-3 px-4">Topic</th>
                  <th className="py-3 px-4">Media Tone</th>
                  <th className="py-3 px-4">Published Date</th>
                  <th className="py-3 px-4 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#252525]">
                {data.articles.map((art) => (
                  <tr key={art.id} className="hover:bg-[#F5F7F9] transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-[#0067A5]">
                      <div className="flex items-center gap-1.5">
                        <Newspaper className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>{art.author_handle}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-md font-medium text-[#252525]">
                      <a
                        href={art.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#0067A5] hover:underline line-clamp-2"
                      >
                        {art.content}
                      </a>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] text-[10px] font-semibold border border-[#008FD3]/20">
                        {art.topic}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                          art.sentiment === "positive"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : art.sentiment === "negative"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {art.sentiment} Tone
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#666666] text-[11px]">
                      {art.posted_at.slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {art.url && (
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#0067A5] hover:underline font-semibold"
                        >
                          <span>Read</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Rich Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {data.articles.map((art) => (
            <div
              key={art.id}
              className="p-4 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#008FD3]/50 transition-all flex flex-col justify-between space-y-3 text-xs shadow-2xs"
            >
              <div className="space-y-2">
                {/* Header: Publisher & Timestamp */}
                <div className="flex items-start justify-between gap-2 border-b border-[#F5F7F9] pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-[#0067A5] truncate">
                      <Newspaper className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{art.author_handle}</span>
                    </div>
                    <span className="text-[10px] text-[#666666]">
                      {new Date(art.posted_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex-shrink-0">
                    GDELT News
                  </span>
                </div>

                {/* Article Headline */}
                <h4 className="text-[13px] font-semibold text-[#252525] leading-snug line-clamp-3">
                  {art.content}
                </h4>
              </div>

              {/* Bottom: Topic, Tone, and Read Article Link */}
              <div className="pt-2 border-t border-[#F5F7F9] flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#DCEFF7] text-[#0067A5] text-[10px] font-semibold border border-[#008FD3]/20">
                    {art.topic}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold capitalize border ${
                      art.sentiment === "positive"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : art.sentiment === "negative"
                        ? "bg-red-50 text-red-800 border-red-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {art.sentiment}
                  </span>
                </div>

                {art.url && (
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#0067A5] hover:text-[#005588] hover:underline font-bold text-[11px] flex-shrink-0"
                  >
                    <span>Read Article</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
