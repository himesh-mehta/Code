"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, RefreshCw, Settings, Shield, User, LogOut } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { api } from "@/lib/api";
import { AppSettings } from "@/types";

interface TopbarProps {
  pageTitle: string;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  lastUpdated?: string;
  lastAttempt?: string;
  refreshResult?: {
    status: "success" | "partial" | "failed" | "idle";
    message?: string;
  };
}

export function Topbar({
  pageTitle,
  onRefresh,
  isRefreshing: propIsRefreshing,
  lastUpdated,
  lastAttempt,
  refreshResult,
}: TopbarProps) {
  const router = useRouter();
  const { isCollapsed, toggleMobile } = useSidebar();
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [accountSettings, setAccountSettings] = useState<AppSettings["account"]>({
    display_name: "STRIVE Analyst",
    email: "analyst@tatastrive.org",
    organization: "Tata STRIVE",
    role: "Lead Skill Strategist",
    avatar_initials: "AS",
    session_status: "Active Local Session",
    auth_configured: false,
    auth_note: "Single-Tenant Local Session (OAuth / SSO not configured in environment)",
  });

  const profileRef = useRef<HTMLDivElement>(null);
  const isRefreshing = propIsRefreshing !== undefined ? propIsRefreshing : internalRefreshing;

  // Load account settings from backend on mount
  useEffect(() => {
    let isMounted = true;
    api.getSettings()
      .then((res) => {
        if (isMounted && res?.settings?.account) {
          setAccountSettings(res.settings.account);
        }
      })
      .catch(() => {
        // Fallback to initial local session state
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  const handleRefreshClick = async () => {
    if (onRefresh && !isRefreshing) {
      setInternalRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setInternalRefreshing(false);
      }
    }
  };

  const handleClearSession = () => {
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      setIsProfileOpen(false);
      router.refresh();
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-[#0099f2]/10 shadow-[0_1px_8px_rgba(0,153,242,0.06)] z-40 px-4 md:px-8 flex items-center justify-between select-none transition-[left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isCollapsed ? "md:left-20 left-0" : "md:left-64 left-0"
      }`}
    >
      {/* Left: Mobile Drawer Trigger, Breadcrumbs & Live Status */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden p-2 rounded-xl text-[#001e2d] hover:bg-[#eaf5ff] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm min-w-0">
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
        <div className="ml-2 hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#eaf5ff] border border-[#0099f2]/15 rounded-full shadow-2xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isRefreshing
                ? "bg-[#0099f2] animate-ping"
                : refreshResult?.status === "failed"
                ? "bg-[#d64545]"
                : "bg-[#1e9e6a] animate-pulse"
            }`}
          ></span>
          <span className="text-[11px] font-bold text-[#00629e] truncate max-w-[220px]">
            {isRefreshing
              ? "Synchronizing Live Sources..."
              : lastUpdated || "Live Feed Synced"}
          </span>
        </div>
      </div>

      {/* Right: Search, Refresh & Profile (Notification bell permanently removed) */}
      <div className="flex items-center gap-3">
        {/* Search Input Pill */}
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#3f4852] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search skills, trends, cohorts..."
            className="w-52 lg:w-64 pl-10 pr-4 py-2 bg-[#eaf5ff] text-[#001e2d] placeholder:text-[#3f4852] text-xs font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-[#0099f2] transition-all"
          />
        </div>

        {/* Refresh Action Button */}
        {onRefresh && (
          <div className="relative flex items-center">
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefreshClick}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all ${
                isRefreshing
                  ? "bg-[#def0ff] text-[#00629e] cursor-not-allowed opacity-80"
                  : "bg-[#eaf5ff] hover:bg-[#def0ff] text-[#00629e] hover:scale-105 active:scale-95 cursor-pointer"
              }`}
              title={
                isRefreshing
                  ? "Synchronizing..."
                  : lastAttempt
                  ? `Last attempt: ${lastAttempt}. Click to refresh.`
                  : "Trigger backend synchronization across configured sources"
              }
              aria-label="Refresh data stream"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#0099f2] ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline font-bold">
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>
          </div>
        )}

        {/* User Profile Avatar with Accessible Dropdown Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            id="user-profile-menu-button"
            aria-haspopup="true"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-[#0099f2] text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-[#cfe5ff] hover:ring-[#0099f2] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#001e2d]"
            title={`${accountSettings.display_name} • ${accountSettings.session_status}`}
          >
            {accountSettings.avatar_initials || "AS"}
          </button>

          {/* Profile Dropdown Panel */}
          {isProfileOpen && (
            <div
              role="menu"
              aria-labelledby="user-profile-menu-button"
              className="absolute right-0 mt-2.5 w-76 bg-white rounded-2xl shadow-[0_10px_35px_rgba(0,30,45,0.15)] border border-[#0099f2]/15 py-3 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* User Identity Card */}
              <div className="px-4 pb-3 border-b border-[#0099f2]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0099f2] text-white font-bold text-sm flex items-center justify-center ring-2 ring-[#eaf5ff] shrink-0">
                    {accountSettings.avatar_initials || "AS"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#001e2d] truncate">
                      {accountSettings.display_name}
                    </p>
                    <p className="text-xs text-[#3f4852] truncate">
                      {accountSettings.email}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 flex flex-col gap-1 text-[11px] text-[#3f4852] bg-[#f5fafd] p-2.5 rounded-xl border border-[#0099f2]/10">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#00629e]">Organization:</span>
                    <span className="font-bold text-[#001e2d]">{accountSettings.organization}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#00629e]">Role:</span>
                    <span className="text-[#001e2d] font-medium">{accountSettings.role}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#0099f2]/10">
                    <span className="font-semibold text-[#00629e]">Auth State:</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      {accountSettings.session_status}
                    </span>
                  </div>
                </div>

                {/* Honest Auth Provider Note */}
                <p className="mt-2 text-[10px] text-[#6f7883] leading-relaxed italic">
                  {accountSettings.auth_note}
                </p>
              </div>

              {/* Navigation Options */}
              <div className="pt-2 px-1">
                <Link
                  href="/settings#account"
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#001e2d] hover:bg-[#eaf5ff] hover:text-[#0099f2] transition-colors"
                >
                  <User className="w-4 h-4 text-[#0099f2]" />
                  <span>Profile &amp; Preferences</span>
                </Link>

                <Link
                  href="/settings#sources"
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#001e2d] hover:bg-[#eaf5ff] hover:text-[#0099f2] transition-colors"
                >
                  <Shield className="w-4 h-4 text-[#0099f2]" />
                  <span>Data Sources &amp; Health</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#001e2d] hover:bg-[#eaf5ff] hover:text-[#0099f2] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#0099f2]" />
                  <span>Dashboard Settings</span>
                </Link>

                <div className="my-1.5 border-t border-[#0099f2]/10"></div>

                <button
                  type="button"
                  onClick={handleClearSession}
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Reset Local Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
