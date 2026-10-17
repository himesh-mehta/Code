"use client";

import React, { useState } from "react";
import { Search, Calendar, RefreshCw } from "lucide-react";
import { SampleDataBadge } from "./SampleDataBadge";
import { api } from "@/lib/api";

interface TopbarProps {
  pageTitle: string;
  onRefresh?: () => void;
  lastUpdated?: string;
  isSample?: boolean;
}

export function Topbar({
  pageTitle,
  onRefresh,
  lastUpdated = "Just now",
  isSample = true,
}: TopbarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.refresh();
      if (onRefresh) onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchVal.trim()) {
      window.location.href = `/feed?query=${encodeURIComponent(searchVal.trim())}`;
    }
  };

  return (
    <header className="fixed top-0 left-[240px] right-0 h-14 bg-white border-b border-[#E5E7EB] z-40 px-6 flex items-center justify-between select-none shadow-xs">
      {/* Left: Breadcrumbs & Quick Search */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs text-[#666666]">
          <span className="font-medium text-[#0067A5]">Social Pulse</span>
          <span className="text-[#CBD5E1]">/</span>
          <span className="font-semibold text-[#252525]">{pageTitle}</span>
        </div>

        <div className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#666666] pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search queries, cohorts, or tags..."
            className="w-64 h-8 pl-8 pr-10 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] placeholder:text-[#666666] focus:outline-none focus:border-[#0067A5] focus:ring-1 focus:ring-[#0067A5]/20 transition-all"
          />
          <kbd className="absolute right-2 px-1.5 py-0.5 rounded border border-[#E5E7EB] bg-white text-[9px] font-mono text-[#666666]">
            ↵
          </kbd>
        </div>
      </div>

      {/* Right: Date filter, Sample data pill, Refresh button, Profile */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-[#F5F7F9] text-xs text-[#252525] hover:bg-[#DCEFF7] transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-[#0067A5]" />
          <span>Last 30 days</span>
        </button>

        <SampleDataBadge visible={isSample} />

        <span className="text-[11px] text-[#666666] hidden lg:inline">
          {lastUpdated}
        </span>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh telemetry"
          className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#666666] hover:bg-[#DCEFF7] hover:text-[#0067A5] transition-all disabled:opacity-50"
          title="Re-fetch and analyze latest social feed"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0067A5]" : ""}`}
          />
        </button>

        <div className="h-4 w-px bg-[#E5E7EB] hidden sm:block"></div>

        <div className="w-8 h-8 rounded-full bg-[#0067A5] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
          AK
        </div>
      </div>
    </header>
  );
}
