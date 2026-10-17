"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  LineChart,
  Target,
  Sparkles,
  Building2,
  CheckCircle2,
  Settings,
  Activity,
} from "lucide-react";

export const MAIN_NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Social Listening", href: "/feed", icon: Radio },
  { label: "Insights & Trends", href: "/trends", icon: LineChart },
  { label: "Opportunity Centre", href: "/opportunities", icon: Target },
  { label: "Content Studio", href: "/studio", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0067A5] border-r border-[#005588] z-50 flex flex-col justify-between select-none shadow-sm">
      <div className="flex flex-col">
        {/* App Logo & Header */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/15">
          <div className="w-8 h-8 rounded-lg bg-white text-[#0067A5] flex items-center justify-center flex-shrink-0 shadow-sm font-bold">
            <Activity className="w-4 h-4 text-[#0067A5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-white leading-tight tracking-tight">
              Social Pulse
            </span>
            <span className="text-[9px] tracking-wider uppercase text-[#DCEFF7] font-medium">
              Social Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Items (The Five Main Tabs) */}
        <div className="p-3">
          <nav className="space-y-1">
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-[#008FD3] text-white font-semibold shadow-xs"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      isActive ? "text-white" : "text-[#DCEFF7]/90"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Workspace & API Settings */}
      <div className="p-3 border-t border-white/15 flex flex-col gap-2">
        <div className="px-3 py-1.5 flex items-center justify-between text-[#DCEFF7] bg-white/10 rounded-md border border-white/15">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-white" />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-white">
              Tata STRIVE
            </span>
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
        </div>


        <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-lg bg-black/15 border border-white/10">
          <div className="w-7 h-7 rounded-full bg-white text-[#0067A5] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
            AK
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-semibold text-white truncate leading-tight">
              Anand Kumar
            </span>
            <span className="text-[10px] text-[#DCEFF7] truncate">
              Lead Strategist
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
