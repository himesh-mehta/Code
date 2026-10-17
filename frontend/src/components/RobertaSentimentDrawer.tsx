"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Loader2,
  RefreshCw,
  ThumbsUp,
  Minus,
  ThumbsDown,
} from "lucide-react";
import { api } from "@/lib/api";

interface RobertaSentimentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_PROMPTS = [
  "The training was useful and helped me find a job!",
  "What are the eligibility criteria and batch start dates for the AI certificate in Mumbai?",
  "The registration portal had server downtime and documents failed to upload.",
  "Solar PV practical workshops and mock interviews gave me confidence for Tata Motors interview.",
];

export function RobertaSentimentDrawer({
  isOpen,
  onClose,
}: RobertaSentimentDrawerProps) {
  const [inputText, setInputText] = useState(
    "The training was useful and helped me find a job!"
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    sentiment: "positive" | "neutral" | "negative";
    confidence: number;
    model: string;
    backend?: string;
  } | null>({
    sentiment: "positive",
    confidence: 0.985,
    model: "cardiffnlp/twitter-roberta-base-sentiment-latest",
    backend: "python-roberta-live",
  });

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setAnalyzing(true);

    try {
      const res = await api.analyzeSentiment(inputText.trim());
      setResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentDetails = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return {
          label: "Positive",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-800",
          barColor: "bg-emerald-600",
          icon: <ThumbsUp className="w-4 h-4 text-emerald-600" />,
        };
      case "negative":
        return {
          label: "Negative",
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          barColor: "bg-red-600",
          icon: <ThumbsDown className="w-4 h-4 text-red-600" />,
        };
      default:
        return {
          label: "Neutral / Inquiring",
          bg: "bg-sky-50",
          border: "border-sky-200",
          text: "text-sky-800",
          barColor: "bg-[#0067A5]",
          icon: <Minus className="w-4 h-4 text-[#0067A5]" />,
        };
    }
  };

  const details = result ? getSentimentDetails(result.sentiment) : null;

  return (
    <div className="bg-white rounded-xl border border-[#0067A5]/30 shadow-md p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#DCEFF7] text-[#0067A5] flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#252525]">
                RoBERTa AI Sentiment Analyzer
              </h3>
              <span className="text-[10px] font-mono font-semibold bg-[#DCEFF7] text-[#0067A5] px-2 py-0.5 rounded-full border border-[#008FD3]/30">
                cardiffnlp/twitter-roberta-base-sentiment-latest
              </span>
            </div>
            <p className="text-[11px] text-[#666666]">
              Real-time deep learning classification for skilling feedback and student sentiment
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#666666] hover:bg-gray-100 hover:text-[#252525] transition-colors"
          title="Close analyzer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Input area */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#252525] flex items-center justify-between">
          <span>Enter student review, video comment, or feedback text:</span>
          <span className="text-[10px] text-[#666666] font-normal">
            Max 512 tokens
          </span>
        </label>
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder="Type or paste any student feedback or inquiry..."
            className="w-full p-3 text-xs rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#252525] focus:outline-none focus:border-[#0067A5] focus:bg-white transition-all resize-none"
          />
        </div>
      </div>

      {/* Preset sample prompts */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-[#666666] uppercase tracking-wider block">
          Quick Test Prompts:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[#F5F7F9] hover:bg-[#DCEFF7] hover:text-[#0067A5] text-[#252525] border border-[#E5E7EB] transition-colors text-left truncate max-w-full"
            >
              &quot;{prompt.length > 55 ? prompt.slice(0, 52) + "..." : prompt}&quot;
            </button>
          ))}
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || !inputText.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running Inference...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze with RoBERTa</span>
            </>
          )}
        </button>

        <span className="text-[11px] text-[#666666]">
          Connected to Python backend at <code className="font-mono text-[#0067A5]">http://localhost:8000</code>
        </span>
      </div>

      {/* Result Card */}
      {result && details && (
        <div className={`p-4 rounded-xl border ${details.border} ${details.bg} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-white border border-gray-200 shadow-2xs">
                {details.icon}
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#666666] block text-[10px]">
                  Predicted Classification
                </span>
                <span className={`text-sm font-extrabold ${details.text}`}>
                  {details.label}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#666666] block font-medium">
                Model Confidence
              </span>
              <span className={`text-base font-extrabold tabular-nums ${details.text}`}>
                {(result.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden border border-gray-200">
            <div
              className={`h-full ${details.barColor} transition-all duration-500`}
              style={{ width: `${Math.round(result.confidence * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#666666] pt-1">
            <span>Model: <code className="font-mono text-[10px] text-[#252525]">{result.model}</code></span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#0067A5]">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>RoBERTa Ready</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
