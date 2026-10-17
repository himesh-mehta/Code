"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { EvidencePosts } from "@/components/EvidencePosts";
import { api } from "@/lib/api";
import {
  Opportunity,
  Campaign,
  CampaignTone,
  Platform,
} from "@/types";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  MessageSquare,
  BarChart3,
  Users,
  Video,
  FileText,
  Share2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { usePageContext } from "@/context/PageContext";

function StudioContent() {
  const searchParams = useSearchParams();
  const preselectedOppId = searchParams.get("opportunity") || "opp_01";
  const { updatePageContext } = usePageContext();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>(preselectedOppId);
  const [tone, setTone] = useState<CampaignTone>("inspiring");
  const [platform, setPlatform] = useState<Platform | "">("");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showBasedOn, setShowBasedOn] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load opportunities
  useEffect(() => {
    api.getOpportunities().then((res) => {
      setOpportunities(res.items);
      if (!selectedOppId && res.items.length > 0) {
        setSelectedOppId(res.items[0].id);
      }
    });
  }, [selectedOppId]);

  useEffect(() => {
    const currentOpp = opportunities.find((o) => o.id === selectedOppId);
    updatePageContext({
      route: "/studio",
      page_name: "Content Studio",
      page_purpose:
        "AI campaign studio converting high-priority opportunities into actionable content ideas, captions, key messages, and measurable CTAs.",
      filters: {
        selected_opportunity_id: selectedOppId,
        tone,
        platform_filter: platform || "All Platforms",
      },
      metrics: {
        opportunity_title: currentOpp?.title || "N/A",
        opportunity_priority: currentOpp?.priority || "N/A",
        opportunity_score: currentOpp?.score || 0,
        content_formats_count: campaign?.content_ideas?.length || 0,
        captions_count: campaign?.captions?.length || 0,
        target_cta: campaign?.call_to_action || "N/A",
      },
      selected_item: campaign
        ? {
            opportunity_title: currentOpp?.title,
            call_to_action: campaign.call_to_action,
            key_messages: campaign.key_messages,
            content_ideas: campaign.content_ideas,
            success_metrics: campaign.success_metrics,
          }
        : undefined,
      key_records: campaign
        ? campaign.content_ideas.map((ci) => ({
            format: ci.format,
            title: ci.title,
            description: ci.description,
            target_audience: ci.target_audience,
          }))
        : undefined,
    });
  }, [
    campaign,
    selectedOppId,
    tone,
    platform,
    opportunities,
    updatePageContext,
  ]);

  useEffect(() => {
    if (searchParams.get("opportunity")) {
      setSelectedOppId(searchParams.get("opportunity")!);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedOppId && !campaign) {
      handleGenerate();
    }
  }, [selectedOppId]);

  const handleGenerate = async () => {
    if (!selectedOppId) return;
    setGenerating(true);
    try {
      const res = await api.generateCampaign({
        opportunity_id: selectedOppId,
        tone,
        platform: platform ? (platform as Platform) : undefined,
      });
      setCampaign(res);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const currentOpp = opportunities.find((o) => o.id === selectedOppId);

  // Chart data: Summary of recommended content formats in current plan
  const formatSummaryData = campaign
    ? [
        { format: "Carousels & Infographics", count: 2 },
        { format: "Short Video Reels", count: 2 },
        { format: "Interactive Checklists", count: 1 },
        { format: "Alumni Testimonials", count: 1 },
      ]
    : [];

  return (
    <>
      <Topbar pageTitle="Content Studio" />

      <main className="pt-20 px-8 pb-16 max-w-6xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
            <span>Social Pulse</span>
            <span className="text-[#CBD5E1]">/</span>
            <span>Conversation-to-Campaign Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#252525]">
            Content Studio
          </h1>
          <p className="text-sm text-[#666666]">
            Visual content-planning panel translating student voices into ready-to-broadcast campaigns, audience segments, and CTAs.
          </p>
        </header>

        {/* Generator Controls Card */}
        <section className="bg-white rounded-xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Opportunity Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#252525]">
                1. Target Opportunity
              </label>
              <select
                value={selectedOppId}
                onChange={(e) => setSelectedOppId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] focus:outline-none focus:border-[#0067A5]"
              >
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} (Score: {opp.score})
                  </option>
                ))}
              </select>
            </div>

            {/* Campaign Tone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#252525]">
                2. Brand Voice &amp; Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as CampaignTone)}
                className="w-full h-9 px-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] focus:outline-none focus:border-[#0067A5]"
              >
                <option value="inspiring">Inspiring &amp; Empathetic</option>
                <option value="friendly">Friendly &amp; Practical</option>
                <option value="professional">Professional &amp; Authoritative</option>
              </select>
            </div>

            {/* Target Channel */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#252525]">
                3. Primary Channel Focus
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform | "")}
                className="w-full h-9 px-3 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-xs text-[#252525] focus:outline-none focus:border-[#0067A5]"
              >
                <option value="">Multi-Channel (YouTube, GDELT, Bluesky, Google News & Places)</option>
                <option value="youtube">YouTube (Video Shorts / Community)</option>
                <option value="bluesky">Bluesky (Discourse & Microblogging)</option>
                <option value="google_news">Google News (Press & Regional Outreach)</option>
                <option value="google_maps">Google Places (Center Reviews & Engagement)</option>
                <option value="gdelt">GDELT (Global Press & TVET Monitoring)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0067A5] text-white text-xs font-bold hover:bg-[#005588] transition-all disabled:opacity-50 shadow-xs"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing campaign assets...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#DCEFF7]" />
                  <span>Re-Generate Plan</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Source Evidence Panel */}
        {currentOpp && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <button
              onClick={() => setShowBasedOn(!showBasedOn)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-[#0067A5] bg-[#F5F7F9] hover:bg-[#DCEFF7] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#0067A5]" />
                <span>
                  Source Evidence Grounding: &quot;{currentOpp.title}&quot; (Priority Score {currentOpp.score}/100)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-normal text-[#666666]">
                <span>{showBasedOn ? "Hide supporting evidence" : "Show supporting original posts"}</span>
                {showBasedOn ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showBasedOn && (
              <div className="p-5 border-t border-[#E5E7EB] space-y-4">
                <div className="p-3 bg-[#DCEFF7] rounded-lg text-xs space-y-1 border border-[#008FD3]/30">
                  <span className="font-bold text-[#0067A5]">
                    Strategic Rationale for Tata STRIVE:
                  </span>
                  <p className="text-[#252525]">
                    {currentOpp.why_it_matters}
                  </p>
                </div>
                <EvidencePosts postIds={currentOpp.supporting_post_ids} />
              </div>
            )}
          </div>
        )}

        {/* Campaign Visual Planning Panel */}
        {campaign && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Format Distribution Chart */}
            {formatSummaryData.length > 0 && (
              <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#252525] uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#0067A5]" />
                    Recommended Content Format Distribution
                  </h3>
                  <span className="text-[10px] text-[#666666]">
                    Planned asset count across campaign deliverables
                  </span>
                </div>

                <div className="h-32 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatSummaryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="format" tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#666666" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px" }} />
                      <Bar dataKey="count" name="Deliverables Planned" fill="#0067A5" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 1. Recommended Content Formats & Target Audience */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0067A5]" />
                1. Recommended Content Formats &amp; Target Audience
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {campaign.content_ideas.map((idea, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#DCEFF7] text-[#0067A5]">
                          {idea.format}
                        </span>
                        <span className="text-[10px] font-semibold text-[#666666] flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#0067A5]" />
                          <span>Youth / Freshers</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#252525] leading-snug">
                        {idea.title}
                      </h3>

                      <p className="text-xs text-[#666666] leading-relaxed">
                        {idea.description}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${idea.title}\n\nFormat: ${idea.format}\nTarget Audience: ${currentOpp?.target_audience || "Youth & Job Seekers"}\n${idea.description}`,
                          `idea-${idx}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs text-[#0067A5] font-semibold hover:underline pt-2 border-t border-[#E5E7EB]"
                    >
                      {copiedKey === `idea-${idx}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Concept Brief</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Draft Captions */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0067A5]" />
                2. Draft Captions (Platform-Specific)
              </h2>

              <div className="space-y-4">
                {campaign.captions.map((cap, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0067A5] bg-[#DCEFF7] px-2.5 py-0.5 rounded">
                          {cap.platform}
                        </span>
                        <span className="text-[10px] text-[#666666]">
                          Target Audience: {currentOpp?.target_audience || "Job Seekers"}
                        </span>
                      </div>

                      <button
                        onClick={() => copyToClipboard(cap.text, `cap-${idx}`)}
                        className="inline-flex items-center gap-1 text-xs text-[#0067A5] font-semibold hover:underline"
                      >
                        {copiedKey === `cap-${idx}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Caption</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-[#252525] whitespace-pre-line leading-relaxed font-mono bg-[#F5F7F9] p-3 rounded-lg border border-[#E5E7EB]">
                      {cap.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Call to Action & Strategic Key Messages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Messages */}
              <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-[#252525] uppercase tracking-wider">
                  Key Strategic Messages
                </h3>
                <ul className="space-y-2 text-xs text-[#252525]">
                  {campaign.key_messages.map((msg, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0067A5] mt-1.5 flex-shrink-0" />
                      <span className="leading-relaxed">{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Call to Action Highlight */}
              <div className="bg-[#0067A5] text-white rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#DCEFF7]">
                    Suggested Call to Action (CTA)
                  </span>
                  <p className="text-sm font-semibold mt-1.5 leading-relaxed">
                    &quot;{campaign.call_to_action}&quot;
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(campaign.call_to_action, "cta")}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                >
                  {copiedKey === "cta" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied CTA</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy CTA String</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Recommended Success Metrics */}
            <section className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
              <h2 className="text-xs font-bold text-[#252525] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0067A5]" />
                Recommended Success Metrics
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {campaign.success_metrics.map((metric, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg bg-[#F5F7F9] border border-[#E5E7EB] text-center"
                  >
                    <span className="text-[11px] font-semibold text-[#666666] uppercase tracking-wide">
                      Target {metric.metric}
                    </span>
                    <div className="text-base font-bold text-[#0067A5] mt-1">
                      {metric.target}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

export default function ContentStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#666666]">Loading content studio...</div>}>
      <StudioContent />
    </Suspense>
  );
}
