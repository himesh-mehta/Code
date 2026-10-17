"use client";

import React from "react";
import { Platform, Sentiment, PostsQuery } from "@/types";
import {
  Calendar,
  Layers,
  Smile,
  Tag,
  RotateCcw,
} from "lucide-react";

interface Props {
  filters: PostsQuery;
  onChange: (filters: PostsQuery) => void;
  availableSources?: { platform: Platform; count: number; connected: boolean }[];
  availableTopics?: string[];
  totalResults?: number;
}

const SOURCES_CONFIG: { id: Platform; label: string }[] = [
  { id: "youtube", label: "YouTube" },
  { id: "gdelt", label: "GDELT News" },
  { id: "bluesky", label: "Bluesky" },
  { id: "csv_import", label: "CSV Imports" },
];

export function FilterBar({
  filters,
  onChange,
  availableSources,
  availableTopics = [
    "Interview preparation",
    "Practical AI skills",
    "Vocational training access",
    "Career guidance",
    "Entrepreneurship",
    "Employability",
    "Future-ready skills",
  ],
  totalResults,
}: Props) {
  const handleDateChange = (val: PostsQuery["date_range"]) => {
    onChange({ ...filters, date_range: val, page: 1 });
  };

  const handleSourceChange = (val: string) => {
    onChange({
      ...filters,
      platform: val ? (val as Platform) : undefined,
      page: 1,
    });
  };

  const handleTopicChange = (val: string) => {
    onChange({ ...filters, topic: val || undefined, page: 1 });
  };

  const handleSentimentChange = (val: string) => {
    onChange({
      ...filters,
      sentiment: val ? (val as Sentiment) : undefined,
      page: 1,
    });
  };

  const handleReset = () => {
    onChange({
      date_range: "30d",
      platform: undefined,
      topic: undefined,
      sentiment: undefined,
      query: undefined,
      is_question: undefined,
      sort: "recent",
      page: 1,
    });
  };

  const hasActiveFilters =
    filters.platform !== undefined ||
    filters.topic !== undefined ||
    filters.sentiment !== undefined ||
    filters.is_relevant !== undefined ||
    (filters.date_range && filters.date_range !== "30d");

  return (
    <div className="bg-white rounded-xl p-3.5 border border-[#E5E7EB] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
          <Calendar className="w-3.5 h-3.5 text-[#0067A5]" />
          <select
            value={filters.date_range || "30d"}
            onChange={(e) =>
              handleDateChange(e.target.value as PostsQuery["date_range"])
            }
            className="bg-transparent text-xs font-semibold text-[#252525] focus:outline-none cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Source Selector with count badges */}
        <div className="flex items-center gap-1.5 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
          <Layers className="w-3.5 h-3.5 text-[#0067A5]" />
          <select
            value={filters.platform || ""}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#252525] focus:outline-none cursor-pointer"
          >
            <option value="">All Sources</option>
            {SOURCES_CONFIG.map((s) => {
              const matched = availableSources?.find(
                (src) => src.platform === s.id
              );
              const countText = matched ? ` (${matched.count})` : "";
              return (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {countText}
                </option>
              );
            })}
          </select>
        </div>

        {/* Topic Selector */}
        <div className="flex items-center gap-1.5 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
          <Tag className="w-3.5 h-3.5 text-[#0067A5]" />
          <select
            value={filters.topic || ""}
            onChange={(e) => handleTopicChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#252525] focus:outline-none cursor-pointer"
          >
            <option value="">All Topics</option>
            {availableTopics.map((top) => (
              <option key={top} value={top}>
                {top}
              </option>
            ))}
          </select>
        </div>

        {/* Sentiment Selector */}
        <div className="flex items-center gap-1.5 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
          <Smile className="w-3.5 h-3.5 text-[#0067A5]" />
          <select
            value={filters.sentiment || ""}
            onChange={(e) => handleSentimentChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#252525] focus:outline-none cursor-pointer"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        {/* Relevance Selector */}
        <div className="flex items-center gap-1.5 bg-[#F5F7F9] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
          <select
            value={filters.is_relevant === undefined ? "" : filters.is_relevant ? "relevant" : "irrelevant"}
            onChange={(e) => {
              const val = e.target.value;
              onChange({
                ...filters,
                is_relevant: val === "relevant" ? true : val === "irrelevant" ? false : undefined,
                page: 1,
              });
            }}
            className="bg-transparent text-xs font-semibold text-[#252525] focus:outline-none cursor-pointer"
          >
            <option value="">Relevance: All</option>
            <option value="relevant">Relevant Skilling Only</option>
            <option value="irrelevant">Filtered / Noise Only</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0067A5] hover:text-[#005588] hover:underline px-2 py-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {totalResults !== undefined && (
        <div className="text-[11px] font-medium text-[#666666]">
          Showing <span className="font-bold text-[#0067A5]">{totalResults}</span> records matching criteria
        </div>
      )}
    </div>
  );
}
