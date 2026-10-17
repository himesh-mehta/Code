"use client";

import React from "react";

export function SampleDataBadge({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-50 text-amber-800 text-[11px] font-semibold tracking-wide"
      title="This dataset contains simulated/labelled sample posts for the hackathon demonstration."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
      <span>Sample data</span>
    </div>
  );
}
