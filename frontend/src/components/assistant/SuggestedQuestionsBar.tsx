"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface SuggestedQuestionsBarProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestionsBar({
  questions,
  onSelect,
  disabled = false,
}: SuggestedQuestionsBarProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="py-2 px-3 border-t border-[#E5E7EB] bg-[#F5F7F9]/80">
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold text-[#0067A5] uppercase tracking-wider">
        <Sparkles className="w-3 h-3 text-[#0067A5]" />
        <span>Suggested for this page</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className="text-left text-[11px] font-medium bg-white hover:bg-[#DCEFF7] text-[#252525] hover:text-[#0067A5] border border-[#E5E7EB] hover:border-[#008FD3]/40 px-2.5 py-1 rounded-full whitespace-nowrap transition-all shadow-2xs flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
