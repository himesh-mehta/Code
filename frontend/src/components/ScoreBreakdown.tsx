"use client";

import React from "react";
import { ScoreBreakdown as IScoreBreakdown, Priority } from "@/types";

interface Props {
  score: number;
  breakdown: IScoreBreakdown;
  weights: Record<keyof IScoreBreakdown, number>;
  priority: Priority;
}

const CRITERIA_META: Record<
  keyof IScoreBreakdown,
  { label: string; description: string }
> = {
  volume: {
    label: "Conversation Volume",
    description: "Total posts and unique mentions across platforms (25%)",
  },
  growth: {
    label: "Momentum & Growth",
    description: "30-day velocity and acceleration trajectory (25%)",
  },
  relevance: {
    label: "Strategic Relevance",
    description: "Alignment with Tata STRIVE skilling and placement mission (25%)",
  },
  engagement: {
    label: "Audience Engagement",
    description: "Re-shares, comments, and deep discussion ratios (15%)",
  },
  sentiment_gap: {
    label: "Unmet Need (Sentiment Gap)",
    description: "High friction, confusion, or unanswered audience questions (10%)",
  },
};

export function ScoreBreakdown({ score, breakdown, weights, priority }: Props) {
  const getPriorityStyle = (p: Priority) => {
    switch (p) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "low":
        return "bg-[#DCEFF7] text-[#0067A5] border-[#008FD3]/30";
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="text-xs font-semibold text-[#666666] uppercase tracking-wider">
            Transparent Priority Scoring
          </div>
          <div className="text-[13px] text-[#666666] mt-0.5">
            Formula: ∑ (Dimension Score × Fixed Weight)
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-bold text-[#0067A5] tabular-nums">
              {score}
            </span>
            <span className="text-xs text-[#666666]"> / 100</span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${getPriorityStyle(
              priority
            )}`}
          >
            {priority} Priority
          </span>
        </div>
      </div>

      <div className="space-y-3.5">
        {(Object.keys(breakdown) as (keyof IScoreBreakdown)[]).map((key) => {
          const value = breakdown[key];
          const weight = weights[key] ?? 0.2;
          const meta = CRITERIA_META[key] || {
            label: key,
            description: "",
          };

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#252525]">{meta.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#666666]">
                    weight: {Math.round(weight * 100)}%
                  </span>
                  <span className="font-semibold text-[#0067A5] tabular-nums">
                    {value}/100
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-[#F5F7F9] rounded-full overflow-hidden border border-[#E5E7EB]">
                <div
                  className="h-full bg-[#0067A5] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
              </div>

              <p className="text-[10px] text-[#666666]">{meta.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
