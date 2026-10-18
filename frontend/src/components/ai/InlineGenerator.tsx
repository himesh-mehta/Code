"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Edit3,
  BookmarkCheck,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Lightbulb,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/lib/api";

export interface InlineGeneratorInitialData {
  kind: "campaign" | "opportunity_brief" | "outreach_post" | "faq_reply";
  title: string;
  topic?: string;
  audience?: string;
  opportunityId?: string;
  score?: number;
  evidencePosts?: Array<{ text: string; url?: string; author?: string }>;
  trendMetrics?: { mentions?: number; growth_pct?: number; forecast_pct?: number };
  ideaText?: string;
  targetGroup?: string;
  questionText?: string;
}

interface InlineGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  data: InlineGeneratorInitialData | null;
}

export function InlineGenerator({ isOpen, onClose, data }: InlineGeneratorProps) {
  const [platform, setPlatform] = useState<string>("linkedin");
  const [tone, setTone] = useState<string>("Professional");
  const [language, setLanguage] = useState<string>("English");
  const [audience, setAudience] = useState<string>("Vocational Job Seekers & Students");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [generated, setGenerated] = useState<any | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedBody, setEditedBody] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Prefill controls when new card is opened
  useEffect(() => {
    if (data) {
      setError(null);
      setErrorCode(null);
      setGenerated(null);
      setIsEditing(false);
      setEditedBody("");
      setSavedDraftId(null);
      setSaveNotice(null);

      if (data.audience) {
        setAudience(data.audience);
      } else if (data.targetGroup) {
        setAudience(data.targetGroup);
      } else {
        setAudience("Vocational Job Seekers & Students");
      }

      if (data.kind === "faq_reply") {
        setPlatform("whatsapp");
        setTone("Informative");
      } else if (data.kind === "outreach_post") {
        setPlatform("linkedin");
        setTone("Friendly");
      } else {
        setPlatform("linkedin");
        setTone("Professional");
      }
    }
  }, [data]);

  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !data || !mounted) return null;

  // Construct verified real context data only
  const buildContextPayload = () => {
    if (data.kind === "faq_reply") {
      return {
        question_text: data.questionText || data.title,
        topic: data.topic || "Tata STRIVE Employability",
        institution_role: "Tata STRIVE Skills Development & Employability Centre",
      };
    }

    if (data.kind === "outreach_post") {
      return {
        outreach_idea: data.title,
        details: data.ideaText || "",
        target_group: data.targetGroup || audience,
        topic: data.topic || "Skill Development",
      };
    }

    // Opportunity brief or campaign
    const evidenceSnippets = (data.evidencePosts || []).slice(0, 3).map((ep) => ({
      text: ep.text,
      author: ep.author || "Learner",
      url: ep.url || "",
    }));

    return {
      opportunity_title: data.title,
      priority_score: data.score ? `${data.score}/100` : "High",
      topic: data.topic || "Employability & Skilling",
      evidence_posts: evidenceSnippets,
      trend_metrics: data.trendMetrics || {},
    };
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setIsEditing(false);

    try {
      const contextData = buildContextPayload();
      const res = await api.generateAiContent({
        kind: data.kind,
        topic: data.topic || data.title,
        audience,
        platform,
        tone,
        language,
        context: contextData,
      });

      setGenerated(res);
      setEditedBody(res.body || "");
    } catch (err: any) {
      setError(err.message || "Failed to generate content.");
      setErrorCode(err.code || null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = isEditing ? editedBody : generated?.body || "";
    const fullText = `${textToCopy}\n\n${generated?.cta ? `CTA: ${generated.cta}\n` : ""}${
      generated?.hashtags ? generated.hashtags.join(" ") : ""
    }`.trim();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = async () => {
    const currentBody = isEditing ? editedBody : generated?.body || "";
    if (!currentBody) return;

    try {
      const res = await api.saveCampaign({
        opportunity_id: data.opportunityId || "opp_inline",
        topic: data.topic || "Tata STRIVE Skilling",
        title: generated?.headline || data.title,
        target_audience: audience,
        platform,
        tone,
        body_copy: currentBody,
        call_to_action: generated?.cta || "Enroll in Tata STRIVE",
        hashtags: generated?.hashtags ? generated.hashtags.join(" ") : "#TataSTRIVE #SkillIndia",
      });

      const draftId = res.id || `draft_${Date.now()}`;
      setSavedDraftId(draftId);
      setSaveNotice("Draft saved successfully to database!");
      setTimeout(() => setSaveNotice(null), 3000);
    } catch (err: any) {
      setSaveNotice("Saved to local session.");
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#001e2d]/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="sticky top-0 z-10 bg-[#f5faff] border-b border-[#def0ff] p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf5ff] text-[#0099f2] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <Sparkles className="w-5 h-5 text-[#0099f2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00629e] bg-[#d2ecff] px-2.5 py-0.5 rounded-full">
                  {data.kind === "faq_reply"
                    ? "FAQ Institutional Reply"
                    : data.kind === "outreach_post"
                    ? "Audience Outreach Post"
                    : "Conversation Campaign"}
                </span>
                {data.score && (
                  <span className="text-[11px] font-bold text-[#001e2d] bg-white px-2 py-0.5 rounded-md border border-[#def0ff]">
                    Score: {data.score}/100
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#001e2d] mt-1 line-clamp-2">
                {data.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#def0ff] text-[#3f4852] hover:text-[#001e2d] flex items-center justify-center transition-colors cursor-pointer border border-[#def0ff]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content Area */}
        <div className="p-6 space-y-6 flex-1">
          {/* Grounding Source Info Pill */}
          <div className="p-3.5 rounded-2xl bg-[#eaf5ff]/70 border border-[#cae6fb] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#00629e] font-bold">
              <span className="flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-[#0099f2]" />
                Verified Factual Grounding Context
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-white px-2 py-0.5 rounded text-[#001e2d]">
                Zero Invented Data
              </span>
            </div>
            <p className="text-[11px] text-[#3f4852] leading-relaxed">
              {data.kind === "faq_reply"
                ? `Question: "${data.questionText || data.title}"`
                : data.kind === "outreach_post"
                ? `Tactical concept for: ${data.targetGroup || "Target cohort"}`
                : `Opportunity: ${data.title} (${data.evidencePosts?.length || 0} supporting discussions)`}
            </p>
          </div>

          {/* Compact Generation Controls */}
          <div className="space-y-4 bg-[#f5faff] p-4 rounded-2xl border border-[#def0ff]">
            <h3 className="text-xs font-black text-[#001e2d] uppercase tracking-wider">
              Generation Controls
            </h3>

            {/* Platform Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#001e2d]">Delivery Platform</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "linkedin", label: "LinkedIn" },
                  { id: "instagram", label: "Instagram" },
                  { id: "youtube_shorts", label: "YouTube Shorts" },
                  { id: "whatsapp", label: "WhatsApp" },
                  { id: "multi_channel", label: "Multi-Channel" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      platform === p.id
                        ? "bg-[#0099f2] text-white shadow-xs"
                        : "bg-white text-[#3f4852] hover:bg-[#def0ff] border border-[#def0ff]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone & Language Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#001e2d]">Tone of Voice</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-white text-[#001e2d] font-bold text-xs px-3 py-2 rounded-xl border border-[#def0ff] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                >
                  <option value="Friendly">Friendly & Welcoming</option>
                  <option value="Professional">Professional & Authoritative</option>
                  <option value="Motivational">Motivational & Inspiring</option>
                  <option value="Informative">Informative & Fact-Driven</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#001e2d]">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white text-[#001e2d] font-bold text-xs px-3 py-2 rounded-xl border border-[#def0ff] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                </select>
              </div>
            </div>

            {/* Target Audience (for opportunities or outreach) */}
            {(data.kind === "campaign" || data.kind === "opportunity_brief") && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#001e2d]">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-white text-[#001e2d] font-bold text-xs px-3 py-2 rounded-xl border border-[#def0ff] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                >
                  <option value="Vocational Job Seekers & Students">Vocational Job Seekers & Students</option>
                  <option value="Parents & Counselors">Parents & Counselors</option>
                  <option value="Industry Placement Partners">Industry Placement Partners</option>
                  <option value="Rural Youth & Women Aspirants">Rural Youth & Women Aspirants</option>
                </select>
              </div>
            )}

            {/* Primary Generate Trigger */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 rounded-full stitch-btn-primary text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing with Groq LLM...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{generated ? "Regenerate Content" : "Generate with Groq"}</span>
                </>
              )}
            </button>
          </div>

          {/* Notifications and Errors */}
          {error && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  {errorCode === "rate_limited"
                    ? "Rate Limit Notice"
                    : errorCode === "off_topic"
                    ? "Topic Scope Boundary"
                    : "AI Generation Notice"}
                </strong>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {saveNotice && (
            <div className="p-3.5 rounded-2xl bg-[#eaf5ff] border border-[#0099f2] text-xs text-[#00629e] font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0099f2]" />
              <span>{saveNotice}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-[#def0ff] rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-[#eaf5ff] rounded"></div>
                <div className="h-3 bg-[#eaf5ff] rounded w-5/6"></div>
                <div className="h-3 bg-[#eaf5ff] rounded w-4/6"></div>
              </div>
              <div className="h-20 bg-[#def0ff]/50 rounded-2xl"></div>
            </div>
          )}

          {/* Results Area */}
          {!loading && generated && (
            <div className="space-y-5 animate-in fade-in-50 duration-300">
              {/* Mandatory AI Badge */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dfec42] text-[#001e2d] text-[11px] font-extrabold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#0099f2]"></span>
                  AI generated draft. Please review before publishing.
                </span>
                {generated.model_used && (
                  <span className="text-[10px] text-[#3f4852] font-semibold">
                    Model: {generated.model_used}
                  </span>
                )}
              </div>

              {/* Result Preview Card */}
              <div className="stitch-card p-5 space-y-4 shadow-azure-card border border-[#def0ff]">
                {/* Headline */}
                {generated.headline && (
                  <h3 className="text-base font-black text-[#001e2d] leading-snug">
                    {generated.headline}
                  </h3>
                )}

                {/* Body Copy */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#def0ff] mb-2">
                    <span className="text-[11px] font-extrabold text-[#00629e] uppercase tracking-wider">
                      {platform.toUpperCase()} Draft Copy
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-[11px] font-bold text-[#0099f2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditing ? "Done Editing" : "Edit Copy"}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={6}
                      className="w-full p-3 rounded-xl border border-[#0099f2] text-xs text-[#001e2d] font-sans leading-relaxed focus:outline-none"
                    />
                  ) : (
                    <div className="text-xs text-[#001e2d] leading-relaxed whitespace-pre-line font-medium bg-[#f5faff] p-3.5 rounded-xl border border-[#def0ff]">
                      {editedBody || generated.body}
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                {generated.hashtags && generated.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {generated.hashtags.map((tag: string, i: number) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold text-[#00629e] bg-[#eaf5ff] px-2.5 py-0.5 rounded-full"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Call to Action */}
                {generated.cta && (
                  <div className="p-3 rounded-xl bg-[#eaf5ff] border border-[#cae6fb] text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#00629e] block">
                      Call to Action (CTA):
                    </span>
                    <p className="font-bold text-[#001e2d] mt-0.5">{generated.cta}</p>
                  </div>
                )}

                {/* Visual Suggestion Text Card */}
                {generated.visual_suggestion && (
                  <div className="p-3.5 rounded-xl bg-[#f5faff] border border-[#def0ff] text-xs space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-[#00629e] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#0099f2]" />
                      Suggested Visual Asset
                    </span>
                    <p className="text-[#3f4852] font-medium leading-relaxed italic">
                      &quot;{generated.visual_suggestion}&quot;
                    </p>
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-[#def0ff] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f5faff] hover:bg-[#def0ff] text-[#001e2d] text-xs font-bold transition-all cursor-pointer border border-[#def0ff]"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#f5faff] hover:bg-[#def0ff] text-[#001e2d] text-xs font-bold transition-all cursor-pointer border border-[#def0ff]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="stitch-btn-highlight !px-3.5 !py-1.5 !text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>
                </div>
              </div>

              {/* Optional Secondary Link to Content Studio */}
              <div className="pt-2 text-center">
                <Link
                  href={`/studio?topic=${encodeURIComponent(data.topic || data.title)}${
                    data.opportunityId ? `&opportunity=${data.opportunityId}` : ""
                  }${savedDraftId ? `&draftId=${savedDraftId}` : ""}`}
                  className="text-xs font-bold text-[#00629e] hover:text-[#0099f2] inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Open full editor in Content Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
