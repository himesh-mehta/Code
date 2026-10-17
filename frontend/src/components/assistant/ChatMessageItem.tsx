"use client";

import React, { useState } from "react";
import { AssistantChatMessage } from "@/lib/assistant-api";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  Sparkles,
  User,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

interface ChatMessageItemProps {
  message: AssistantChatMessage;
  onRetry?: () => void;
}

export function ChatMessageItem({ message, onRetry }: ChatMessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 my-2.5">
        <div className="max-w-[85%] bg-[#0067A5] text-white px-3.5 py-2.5 rounded-2xl rounded-tr-xs shadow-xs text-xs leading-relaxed">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <span className="block text-[9px] text-white/70 text-right mt-1">
            {message.timestamp}
          </span>
        </div>
        <div className="w-6 h-6 rounded-full bg-[#005588] text-white flex items-center justify-center flex-shrink-0 text-[10px] mt-1 shadow-xs">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex items-start gap-2.5 my-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0067A5] to-[#008FD3] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>

      <div className="flex-1 min-w-0 max-w-[90%]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#0067A5]">Pulse AI</span>
            <span className="text-[9px] font-semibold bg-[#DCEFF7] text-[#0067A5] px-1.5 py-0.2 rounded border border-[#008FD3]/20">
              Intelligence Analyst
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[#666666]">
            <span>{message.timestamp}</span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-[#F1F5F9] text-[#666666] hover:text-[#0067A5] transition-colors"
              title="Copy message text"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {message.status === "error" ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to process request</p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  {message.error || message.content}
                </p>
              </div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-red-300 text-red-800 text-xs font-semibold hover:bg-red-100/50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry Question</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-xs text-[#252525]">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
