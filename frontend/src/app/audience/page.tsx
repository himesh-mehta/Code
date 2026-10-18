"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import {
  Users,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Building2,
  MapPin,
  Wrench,
  GraduationCap,
  Briefcase,
  Award,
  ExternalLink,
  Zap,
  Copy,
  Check,
  Search,
  BookOpen,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  RealAudienceResponse,
  OfflineCentre,
  OutreachInitiative,
  CategorizedFaq,
} from "@/types";
import { InlineGenerator, InlineGeneratorInitialData } from "@/components/ai/InlineGenerator";

// Architectural rule: When true, routes directly to the dedicated full Content Studio (/studio)
// When false, opens the portal slide-over panel.
const USE_STUDIO_REDIRECT = true;

export default function AudiencePage() {
  const router = useRouter();
  const [selectedFaqFilter, setSelectedFaqFilter] = useState<string>("all");
  const [selectedCentreFilter, setSelectedCentreFilter] = useState<string>("all");
  const [centreSearchQuery, setCentreSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audienceData, setAudienceData] = useState<RealAudienceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inlineData, setInlineData] = useState<InlineGeneratorInitialData | null>(null);

  useEffect(() => {
    api.getRealAudience()
      .then((res) => setAudienceData(res))
      .catch((err) => console.error("Error loading real audience data:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyReply = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const digest = audienceData?.learner_questions_digest || {
    total_questions: 54,
    sources_used: ["youtube", "google_news", "bluesky", "youtube_comment"],
    period: "Last 30 days",
  };

  const faqs = audienceData?.categorized_faqs || [];
  const centres = audienceData?.offline_centres || [];
  const initiatives = audienceData?.outreach_initiatives || [];

  const bestTimes = audienceData?.best_time_to_post || [
    { hour: "08:00", label: "8 AM", score: 20, peak: false },
    { hour: "10:00", label: "10 AM", score: 20, peak: false },
    { hour: "12:00", label: "12 PM", score: 20, peak: false },
    { hour: "14:00", label: "2 PM", score: 20, peak: false },
    { hour: "17:00", label: "5 PM", score: 100, peak: true },
    { hour: "19:00", label: "7 PM", score: 20, peak: false },
    { hour: "21:00", label: "9 PM", score: 23, peak: false },
  ];

  const isSample = Boolean(audienceData?.is_sample);

  // Filter FAQs
  const filteredFaqs = useMemo(() => {
    if (selectedFaqFilter === "all") return faqs;
    const q = selectedFaqFilter.toLowerCase();
    return faqs.filter(
      (f) =>
        f.topic.toLowerCase().includes(q) ||
        f.sample_question.toLowerCase().includes(q) ||
        (f.centre_connection && f.centre_connection.toLowerCase().includes(q))
    );
  }, [faqs, selectedFaqFilter]);

  // Filter Offline Centres
  const filteredCentres = useMemo(() => {
    return centres.filter((c) => {
      const matchesSearch =
        centreSearchQuery === "" ||
        c.name.toLowerCase().includes(centreSearchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(centreSearchQuery.toLowerCase()) ||
        c.state.toLowerCase().includes(centreSearchQuery.toLowerCase()) ||
        c.key_domains.some((d) => d.toLowerCase().includes(centreSearchQuery.toLowerCase())) ||
        c.corporate_partners.some((p) => p.toLowerCase().includes(centreSearchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCentreFilter === "all") return true;
      if (selectedCentreFilter === "tssdc") return c.type === "Flagship TSSDC";
      if (selectedCentreFilter === "tsec") return c.type === "Domain TSEC";
      if (selectedCentreFilter === "ev")
        return c.key_domains.some((d) => d.toLowerCase().includes("ev") || d.toLowerCase().includes("automotive"));
      if (selectedCentreFilter === "ai")
        return c.key_domains.some((d) => d.toLowerCase().includes("ai") || d.toLowerCase().includes("cyber"));
      if (selectedCentreFilter === "solar")
        return c.key_domains.some((d) => d.toLowerCase().includes("solar") || d.toLowerCase().includes("green"));
      if (selectedCentreFilter === "healthcare")
        return c.key_domains.some((d) => d.toLowerCase().includes("healthcare") || d.toLowerCase().includes("hospitality"));

      return true;
    });
  }, [centres, selectedCentreFilter, centreSearchQuery]);

  const updatedTime = audienceData?.updated_at
    ? `Updated at ${new Date(audienceData.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST`
    : "Live Audience Telemetry";

  const handleLaunchStudio = (topic: string, title?: string, target?: string) => {
    if (USE_STUDIO_REDIRECT) {
      router.push(`/studio?topic=${encodeURIComponent(topic)}`);
    } else {
      setInlineData({
        kind: "campaign",
        title: title || `Campaign for ${topic}`,
        topic: topic,
        audience: target || "Vocational Job Seekers & Students",
      });
    }
  };

  return (
    <>
      <Topbar pageTitle="Audience & Outreach" lastUpdated={updatedTime} />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-10 animate-fade-in-up">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2ecff] text-[#00629e] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#0099f2] animate-ping"></span>
                Audience Intelligence
              </span>
              {isSample && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300">
                  Sample data
                </span>
              )}
              <span className="text-xs text-[#3f4852] font-semibold">
                {digest.total_questions} verified learner questions
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Audience &amp; Outreach
            </h1>
            <p className="text-sm md:text-base text-[#3f4852] mt-1.5 max-w-2xl leading-relaxed">
              Curate institutional outreach tailored to real community questions gathered across{" "}
              <span className="font-bold text-[#001e2d]">{digest.sources_used.join(", ")}</span> and the{" "}
              <span className="font-bold text-[#001e2d]">156 Tata STRIVE Training Centres</span> nationwide.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleLaunchStudio("Employability and job readiness", "Youth Skilling & Employability Outreach")}
              className="stitch-btn-primary cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Compose Campaign</span>
            </button>
          </div>
        </section>

        {/* Section 1: Offline Training Centres Network (TSSDC & TSEC) */}
        <section className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#eaf5ff] flex items-center justify-center text-[#0099f2] shadow-2xs">
                <Building2 className="w-5 h-5 text-[#0099f2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#001e2d]">
                    Offline Training Centres Network
                  </h2>
                  <span className="text-[11px] font-black uppercase tracking-wider bg-[#dfec42] text-[#001e2d] px-2.5 py-0.5 rounded-full">
                    TSSDC &amp; TSEC Hubs
                  </span>
                </div>
                <p className="text-xs text-[#3f4852] mt-0.5">
                  Flagship multi-skilling infrastructure hubs with specialized technical labs and direct employer hiring tie-ups
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#eaf5ff] text-[#00629e] font-bold px-3 py-1 rounded-full shadow-2xs">
                156 Active Centres • 25 States
              </span>
            </div>
          </div>

          {/* Search & Centre Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-[#f5faff] border border-[#def0ff]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3f4852]" />
              <input
                type="text"
                value={centreSearchQuery}
                onChange={(e) => setCentreSearchQuery(e.target.value)}
                placeholder="Search centres by city, domain, partner (e.g. Pune, EV, Cisco)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#def0ff] text-xs font-semibold text-[#001e2d] placeholder-[#3f4852]/60 focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "All Hubs" },
                { id: "tssdc", label: "Flagship TSSDC" },
                { id: "ev", label: "EV & Auto" },
                { id: "ai", label: "AI & Tech" },
                { id: "solar", label: "Solar Energy" },
                { id: "healthcare", label: "Healthcare" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCentreFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCentreFilter === tab.id
                      ? "bg-[#0099f2] text-white shadow-2xs"
                      : "bg-white text-[#3f4852] hover:bg-[#eaf5ff] border border-[#def0ff]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Offline Centres Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredCentres.map((centre) => (
              <div
                key={centre.id}
                className="stitch-card p-5 flex flex-col justify-between group hover:border-[#0099f2]/40 transition-all shadow-azure-card"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#00629e] bg-[#d2ecff] px-2.5 py-0.5 rounded-full">
                      {centre.type}
                    </span>
                    <span className="text-[11px] font-extrabold text-[#5d6300] bg-[#dfec42]/40 border border-[#dfec42] px-2 py-0.5 rounded-md">
                      {centre.placement_rate}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-[#001e2d] leading-snug group-hover:text-[#0099f2] transition-colors">
                      {centre.short_name}
                    </h3>
                    <div className="flex items-start gap-1.5 mt-1 text-[#3f4852]">
                      <MapPin className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
                      <p className="text-[11px] font-medium leading-tight">
                        {centre.city}, {centre.state}
                      </p>
                    </div>
                  </div>

                  {/* Key Domains Pills */}
                  <div className="flex flex-wrap gap-1">
                    {centre.key_domains.slice(0, 3).map((domain, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold text-[#004c6e] bg-[#eaf5ff] px-2 py-0.5 rounded-md border border-[#def0ff]"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>

                  {/* Specialized Labs List */}
                  <div className="p-3 rounded-xl bg-[#f5faff] border border-[#def0ff] space-y-1.5">
                    <span className="text-[10px] font-extrabold text-[#00629e] uppercase tracking-wider block">
                      Specialized Training Labs:
                    </span>
                    <ul className="space-y-1">
                      {centre.specialized_labs.slice(0, 2).map((lab, i) => (
                        <li key={i} className="text-[11px] text-[#001e2d] font-semibold flex items-start gap-1.5 leading-snug">
                          <Wrench className="w-3 h-3 text-[#0099f2] shrink-0 mt-0.5" />
                          <span>{lab}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Corporate Partners & Capacity */}
                  <div className="pt-2 text-[11px] text-[#3f4852] space-y-1 border-t border-[#def0ff]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#3f4852]">Key Partners:</span>
                      <span className="font-bold text-[#001e2d] text-right truncate max-w-[150px]">
                        {centre.corporate_partners.join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#3f4852]">Annual Capacity:</span>
                      <span className="font-bold text-[#0099f2]">
                        {centre.annual_capacity.toLocaleString()} learners/yr
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#0099f2]/10 flex flex-col gap-2">
                  <button
                    onClick={() =>
                      handleLaunchStudio(
                        centre.primary_topic,
                        `Admissions Campaign: ${centre.short_name}`,
                        `Aspirants in ${centre.city} & ${centre.state}`
                      )
                    }
                    className="w-full stitch-btn-highlight text-xs flex items-center justify-between font-bold cursor-pointer py-2 px-3"
                  >
                    <span>Launch Studio Campaign</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href={`mailto:${centre.contact_email}`}
                    className="text-[11px] text-center font-bold text-[#00629e] hover:text-[#0099f2] transition-colors"
                  >
                    Contact: {centre.contact_email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Outreach Ideas Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#eaf5ff] flex items-center justify-center text-[#0099f2]">
                <span className="material-symbols-outlined text-[20px]">campaign</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#001e2d]">Actionable Outreach Initiatives</h2>
                <p className="text-xs text-[#3f4852]">
                  Tactical engagement concepts connected to real training hubs and learner sentiment queries
                </p>
              </div>
            </div>
            <span className="text-xs bg-[#eaf5ff] text-[#00629e] font-bold px-3 py-1 rounded-full shadow-2xs">
              {initiatives.length} prioritized initiatives
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {initiatives.map((idea) => (
              <div
                key={idea.id}
                className="stitch-card p-6 flex flex-col justify-between group hover:border-[#0099f2]/30 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-full bg-[#eaf5ff] text-[#0099f2] flex items-center justify-center group-hover:bg-[#0099f2] group-hover:text-white transition-colors shadow-2xs">
                      <span className="material-symbols-outlined text-[22px]">{idea.icon}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#def0ff] text-[11px] font-bold text-[#004c6e]">
                      {idea.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#001e2d] mb-2 leading-snug group-hover:text-[#0099f2] transition-colors">
                    {idea.title}
                  </h3>
                  <p className="text-xs text-[#3f4852] mb-4 leading-relaxed">
                    {idea.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-[#f5faff] border border-[#def0ff] text-xs space-y-1 mb-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#3f4852]">Training Hub:</span>
                      <span className="font-bold text-[#001e2d]">{idea.centre_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#3f4852]">Location:</span>
                      <span className="font-bold text-[#00629e]">{idea.centre_location}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#0099f2]/10 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 text-[#3f4852]">
                    <Users className="w-3.5 h-3.5 text-[#0099f2] shrink-0" />
                    <span className="text-xs font-semibold">{idea.target_cohort}</span>
                  </div>
                  <button
                    onClick={() => handleLaunchStudio(idea.topic, idea.title, idea.target_cohort)}
                    className="w-full stitch-btn-highlight text-xs flex items-center justify-between font-bold cursor-pointer py-2 px-3"
                  >
                    <span>Use in Content Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visual Storytelling / Learner Voice Context Banner */}
        <section className="stitch-card p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0099f2] text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="material-symbols-outlined text-[28px]">format_quote</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#eaf5ff] text-xs font-bold text-[#0099f2]">
                Learner Sentiment Digest
              </span>
              <span className="text-xs text-[#3f4852]">
                Across verified sources: <strong className="text-[#001e2d]">{digest.sources_used.join(", ")}</strong>
              </span>
            </div>
            <p className="text-sm text-[#001e2d] font-semibold leading-relaxed">
              &quot;First-generation aspirants express the highest curiosity around industry job links, hands-on lab time, and living stipends. Addressing these proactive inquiries early accelerates admissions conversion across all 156 centres.&quot;
            </p>
          </div>
          <div className="flex-shrink-0 text-right md:pr-4">
            <span className="block text-2xl font-black text-[#0099f2]">{digest.total_questions}</span>
            <span className="block text-xs text-[#3f4852] font-semibold">Real Questions Analyzed ({digest.period})</span>
          </div>
        </section>

        {/* Best Time to Post (IST - UTC+5:30) */}
        <section className="stitch-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#00629e] uppercase tracking-wider">Engagement Telemetry</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0099f2]"></span>
                <span className="text-xs text-[#3f4852] font-semibold">Indian Standard Time (IST)</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#001e2d] tracking-tight mt-0.5">
                Best Time to Post &amp; Broadcast
              </h2>
            </div>
            <span className="text-xs text-[#3f4852] font-semibold">
              Computed from learner published_at hours weighted by verified likes
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
            {bestTimes.map((slot: any, idx: number) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl flex flex-col items-center justify-between gap-2 transition-all ${
                  slot.peak
                    ? "bg-[#dfec42]/30 border-2 border-[#909a00] shadow-sm scale-105"
                    : "bg-[#eaf5ff] border border-[#def0ff]"
                }`}
              >
                <span className="text-xs font-black text-[#001e2d]">{slot.label}</span>
                <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${slot.peak ? "bg-[#909a00]" : "bg-[#0099f2]"}`}
                    style={{ width: `${slot.score}%` }}
                  ></div>
                </div>
                <span className={`text-[10px] font-bold ${slot.peak ? "text-[#5d6300]" : "text-[#3f4852]"}`}>
                  {slot.peak ? "⚡ Peak Window" : `${slot.score}% activity`}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Questions Learners Ask */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#001e2d]">Categorized FAQs &amp; Questions Learners Ask</h2>
              <p className="text-xs text-[#3f4852]">
                Grouped inquiry clusters with verified institutional replies from Tata STRIVE training network
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "all", label: "All Topics" },
                { id: "ev", label: "EV & Tech" },
                { id: "ai", label: "AI & Digital" },
                { id: "placement", label: "Placements" },
                { id: "solar", label: "Solar PV" },
                { id: "scholarship", label: "Stipends" },
                { id: "healthcare", label: "Healthcare" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFaqFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedFaqFilter === f.id
                      ? "bg-[#0099f2] text-white shadow-xs"
                      : "bg-[#eaf5ff] text-[#3f4852] hover:bg-[#def0ff]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredFaqs.map((q) => {
              const questionText = q.sample_question;
              const replyText = q.suggested_reply;
              const replyLabel = q.reply_label || "Verified Institutional Reply";

              return (
                <div
                  key={q.id}
                  className="stitch-card p-5 flex flex-col justify-between space-y-4 shadow-azure-card hover:border-[#0099f2]/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#eaf5ff] text-[11px] font-bold text-[#00629e]">
                        {q.topic}
                      </span>
                      <span className="chip-growing">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {q.count} verified inquiries
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#001e2d] leading-snug">
                      &quot;{questionText}&quot;
                    </h3>

                    {q.centre_connection && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#00629e] font-semibold">
                        <Building2 className="w-3 h-3 text-[#0099f2]" />
                        <span>Connected Hub: {q.centre_connection}</span>
                      </div>
                    )}

                    <div className="mt-3 p-3 rounded-xl bg-[#eaf5ff]/70 border border-[#0099f2]/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-[#00629e] block">
                          Institutional Official Response:
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dfec42] text-[#001e2d] font-bold">
                          {replyLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#001e2d] font-medium leading-relaxed">
                        {replyText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#0099f2]/10">
                    <span className="text-xs text-[#3f4852] font-semibold">
                      {q.count.toLocaleString()} queries recorded
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyReply(q.id, replyText)}
                        className="px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        {copiedId === q.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#00629e]" />
                            <span>Copy Reply</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() =>
                          handleLaunchStudio(
                            q.topic,
                            `FAQ Reply: ${q.topic}`,
                            "Learners & Aspirants"
                          )
                        }
                        className="px-3 py-1.5 rounded-full bg-[#0099f2] text-white text-xs font-bold hover:bg-[#007acc] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Use in Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Fallback Safe Modal Drawer if ever opened */}
        <InlineGenerator
          isOpen={Boolean(inlineData)}
          onClose={() => setInlineData(null)}
          data={inlineData}
        />
      </main>
    </>
  );
}
