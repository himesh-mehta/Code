"use client";

import React, { useState } from "react";
import { Menu, Search, Bell, RefreshCw, Sparkles } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

interface TopbarProps {
  pageTitle: string;
  onRefresh?: () => void;
  lastUpdated?: string;
}

export function Topbar({ pageTitle, onRefresh, lastUpdated }: TopbarProps) {
  const { isCollapsed, toggleMobile } = useSidebar();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    if (onRefresh) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-[#0099f2]/10 shadow-[0_1px_8px_rgba(0,153,242,0.06)] z-40 px-4 md:px-8 flex items-center justify-between select-none transition-[left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isCollapsed ? "md:left-20 left-0" : "md:left-64 left-0"
      }`}
    >
      {/* Left: Mobile Drawer Trigger, Breadcrumbs & Live Status */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden p-2 rounded-xl text-[#001e2d] hover:bg-[#eaf5ff] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb matching Stitch */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-[#3f4852] hidden sm:inline">
            Pulse Hub
          </span>
          <span className="material-symbols-outlined text-[#6f7883] text-[16px] hidden sm:inline">
            chevron_right
          </span>
          <span className="font-bold text-[#001e2d] truncate">
            {pageTitle}
          </span>
        </div>

        {/* Live Status Pill */}
        <div className="ml-2 hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#eaf5ff] border border-[#0099f2]/15 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#1e9e6a] animate-pulse"></span>
          <span className="text-[11px] font-bold text-[#00629e]">
            {lastUpdated || "Live Feed Synced"}
          </span>
        </div>
      </div>

      {/* Right: Search, Notifications, Refresh & Profile */}
      <div className="flex items-center gap-3">
        {/* Search Input Pill */}
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#3f4852] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search skills, trends, cohorts..."
            className="w-56 lg:w-64 pl-10 pr-4 py-2 bg-[#eaf5ff] text-[#001e2d] placeholder:text-[#3f4852] text-xs font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-[#0099f2] transition-all"
          />
        </div>

        {/* Refresh Action Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefreshClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#def0ff] text-[#00629e] text-xs font-semibold shadow-xs transition-all hover:scale-105 active:scale-95"
            title="Refresh stream"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0099f2]" : ""}`}
            />
            <span className="hidden lg:inline">Refresh</span>
          </button>
        )}

        {/* Notifications Icon Button */}
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#eaf5ff] hover:bg-[#def0ff] text-[#3f4852] hover:text-[#001e2d] transition-colors relative"
          aria-label="View notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0099f2] rounded-full ring-2 ring-white"></span>
        </button>

        {/* User Profile Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-[#0099f2] text-white font-bold text-xs flex items-center justify-center shadow-sm ring-2 ring-[#cfe5ff] cursor-pointer hover:ring-[#0099f2] transition-all"
          title="Ananya Sharma (Lead Skill Strategist)"
        >
          AS
        </div>
      </div>
    </header>
  );
}
