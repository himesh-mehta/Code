"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  LineChart,
  Target,
  Sparkles,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export const MAIN_NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutDashboard, materialIcon: "grid_view" },
  { label: "Social Listening", href: "/feed", icon: Radio, materialIcon: "hearing" },
  { label: "Insights & Trends", href: "/trends", icon: LineChart, materialIcon: "trending_up" },
  { label: "Opportunity Centre", href: "/opportunities", icon: Target, materialIcon: "lightbulb" },
  { label: "Content Studio", href: "/studio", icon: Sparkles, materialIcon: "edit_note" },
  { label: "Audience & Outreach", href: "/audience", icon: Users, materialIcon: "groups" },
  { label: "Reports", href: "/reports", icon: FileText, materialIcon: "assessment" },
  { label: "Settings", href: "/settings", icon: Settings, materialIcon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const collapsed = mounted ? isCollapsed : false;

  return (
    <>
      {/* Mobile Backdrop Overlay with smooth fade */}
      {isMobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu backdrop"
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={closeMobile}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") closeMobile();
          }}
        />
      )}

      {/* Main Sliding Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#0099f2] text-white z-50 flex flex-col justify-between select-none shadow-[0_4px_24px_rgba(0,153,242,0.22)] transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-20" : "md:w-64"}`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-5 px-3">
          {/* Header & Brand with Logo */}
          <div className="flex items-center justify-between mb-6 px-1">
            <Link
              href="/"
              onClick={closeMobile}
              className={`flex items-center gap-3 min-w-0 transition-all ${
                collapsed ? "justify-center w-full" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-md p-1 group hover:rotate-6 transition-transform">
                <span className="material-symbols-outlined text-[#0099f2] text-[24px]">hub</span>
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="font-bold text-[17px] text-white tracking-tight leading-tight truncate">
                    Social Pulse
                  </span>
                  <span className="text-[10px] tracking-wider uppercase text-[#c8e6ff] font-semibold truncate">
                    Empowering Skills
                  </span>
                </div>
              )}
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={closeMobile}
              className="flex md:hidden w-8 h-8 rounded-full items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sliding Collapse Toggle Pill (Desktop) */}
          <div className="hidden md:flex justify-end mb-3 px-1">
            <button
              type="button"
              onClick={toggleCollapse}
              className={`flex items-center justify-center w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white shadow-sm transition-all duration-200 cursor-pointer ${
                collapsed ? "mx-auto" : ""
              }`}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 transition-transform hover:scale-125" />
              ) : (
                <ChevronLeft className="w-4 h-4 transition-transform hover:scale-125" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1.5">
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={`relative group flex items-center rounded-full transition-all duration-200 ${
                    collapsed ? "justify-center p-3" : "gap-3 px-4 py-2.5"
                  } ${
                    isActive
                      ? "bg-[#dfec42] text-[#001e2d] font-bold shadow-sm"
                      : "text-white/95 hover:bg-[#56c0ff]/35 hover:text-white font-medium"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] flex-shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#001e2d]" : "text-white"
                    }`}
                  >
                    {item.materialIcon}
                  </span>

                  {!collapsed && (
                    <span className="text-[13.5px] truncate font-medium">
                      {item.label}
                    </span>
                  )}

                  {/* Accessible hover tooltip when collapsed on desktop */}
                  {collapsed && (
                    <span className="hidden md:block absolute left-full ml-3 px-3 py-1.5 bg-[#001e2d] text-white text-[12px] font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all z-50">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area with Tata STRIVE Badge & User Profile */}
        <div className="p-3 border-t border-white/20 flex flex-col gap-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white relative group cursor-pointer"
                title="Tata STRIVE Organization"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="animate-ping absolute top-0 right-0 w-2 h-2 rounded-full bg-[#dfec42]"></span>
                <span className="hidden md:block absolute left-full ml-3 px-3 py-1.5 bg-[#001e2d] text-white text-[12px] font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-50">
                  Tata STRIVE Hub
                </span>
              </div>
              <div
                className="w-9 h-9 rounded-full bg-white text-[#0099f2] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-md group relative cursor-pointer"
                title="Ananya Sharma (Lead Skill Strategist)"
              >
                AS
                <span className="hidden md:block absolute left-full ml-3 px-3 py-1.5 bg-[#001e2d] text-white text-[12px] font-semibold rounded-xl shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-50">
                  Ananya Sharma — Lead Strategist
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#56c0ff]/30 rounded-2xl p-3 backdrop-blur-sm border border-white/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  TATA STRIVE
                </span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dfec42] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#dfec42]"></span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/15 rounded-xl p-2">
                <div className="w-8 h-8 rounded-full bg-white text-[#0099f2] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white/50">
                  AS
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12.5px] font-bold text-white truncate leading-tight">
                    Ananya Sharma
                  </span>
                  <span className="text-[10.5px] text-[#c8e6ff] truncate">
                    Lead Skill Strategist
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
