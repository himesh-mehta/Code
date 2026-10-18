"use client";

import React, { useState, useEffect } from "react";
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
  Send,
  Zap,
} from "lucide-react";

interface OutreachIdea {
  id: string;
  title: string;
  description: string;
  target: string;
  tag: string;
  icon: string;
  topic: string;
}

const OUTREACH_IDEAS: OutreachIdea[] = [
  {
    id: "ev-ama",
    title: "Host an AMA with certified EV technicians",
    description: "Demystify high-voltage safety and battery diagnostics career progression with live Q&A sessions.",
    target: "Final year ITI students",
    tag: "High Momentum",
    icon: "electric_bolt",
    topic: "Electric Vehicle Fleet Maintenance",
  },
  {
    id: "solar-alumni",
    title: "Highlight Tata STRIVE alumni career journeys in Solar Energy",
    description: "Authentic grassroot success narratives emphasizing stable rooftop micro-grid entrepreneurship.",
    target: "Rural youth and parent groups",
    tag: "Alumni Spotlight",
    icon: "wb_sunny",
    topic: "Solar PV Installation",
  },
  {
    id: "stipend-myths",
    title: "Clarify stipend & scholarship myths in short videos",
    description: "Short vertical reel explaining onboarding grants, course sponsorship, and tools allowance.",
    target: "First-generation learners",
    tag: "Mythbuster",
    icon: "payments",
    topic: "Employability and scholarships",
  },
  {
    id: "weekend-crash",
    title: "Weekend crash courses for working professionals",
    description: "Hybrid schedule tailored for technicians aiming to master PLC programming and IoT controllers.",
    target: "Upskilling candidates",
    tag: "Upskill Format",
    icon: "calendar_month",
    topic: "Industrial Automation & PLC",
  },
];

const QUESTIONS_DATA = [
  {
    id: "q1",
    question: "Do we get hands-on experience in EV diagnostics labs during the weekend course?",
    count: 840,
    surge: "+45% this week",
    topic: "EV Diagnostics",
    suggestedReply: "Yes! All Tata STRIVE EV technician courses include 60% dedicated lab time working on live battery management test benches.",
  },
  {
    id: "q2",
    question: "Is there job placement assistance in Pune automotive companies after completing certification?",
    count: 1240,
    surge: "+28% this week",
    topic: "Job Placement",
    suggestedReply: "Tata STRIVE partners with 120+ leading automotive manufacturers and certified service hubs across Pune and Nashik for campus placement drives.",
  },
  {
    id: "q3",
    question: "Can first-generation college students apply for scholarship stipends?",
    count: 690,
    surge: "+18% this week",
    topic: "Scholarships",
    suggestedReply: "Absolutely! Eligible candidates can access full tuition waivers and tool stipends under the STRIVE Affirmative Action initiative.",
  },
  {
    id: "q4",
    question: "Are certificates recognized by NSDC and National Skill Qualification Framework (NSQF)?",
    count: 520,
    surge: "+12% this week",
    topic: "Certification",
    suggestedReply: "All completed certifications are strictly aligned with NSQF Level 4/5 standards recognized nationwide.",
  },
];

import { api } from "@/lib/api";
import { SAMPLE_OUTREACH_IDEAS } from "@/lib/sampleData";
import { InlineGenerator, InlineGeneratorInitialData } from "@/components/ai/InlineGenerator";

// Architectural rule: When false, opens slide-over panel on the same page.
const USE_STUDIO_REDIRECT = false;

export default function AudiencePage() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audienceData, setAudienceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inlineData, setInlineData] = useState<InlineGeneratorInitialData | null>(null);


  useEffect(() => {
    api.getRealAudience()
      .then((res) => setAudienceData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyReply = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const digest = audienceData?.learner_questions_digest || {
    total_questions: 12,
    sources_used: ["youtube", "google_news", "bluesky"],
    period: "Last 30 days",
  };

  const faqs = audienceData?.categorized_faqs && audienceData.categorized_faqs.length > 0
    ? audienceData.categorized_faqs
    : [
        {
          id: "q1",
          topic: "EV diagnostics and battery tech",
          count: 8,
          sample_question: "Do we get hands-on experience in EV diagnostics labs during the weekend course?",
          suggested_reply: "Yes! All Tata STRIVE EV technician courses include 60% dedicated lab time working on live battery management test benches.",
          reply_label: "AI suggested reply",
        },
        {
          id: "q2",
          topic: "Employability and job readiness",
          count: 14,
          sample_question: "Is there job placement assistance in automotive companies after completing certification?",
          suggested_reply: "Tata STRIVE partners with 120+ leading automotive manufacturers and certified service hubs for campus placement drives.",
          reply_label: "AI suggested reply",
        },
        {
          id: "q3",
          topic: "Internships and placements",
          count: 6,
          sample_question: "Can first-generation college students apply for NAPS/NATS stipend programs?",
          suggested_reply: "Absolutely! Eligible candidates can access full tuition waivers and tool stipends under accredited government apprenticeship tracks.",
          reply_label: "AI suggested reply",
        },
      ];

  const bestTimes = audienceData?.best_time_to_post || [
    { hour: "08:00", label: "8 AM", score: 25, peak: false },
    { hour: "10:00", label: "10 AM", score: 40, peak: false },
    { hour: "12:00", label: "12 PM", score: 35, peak: false },
    { hour: "14:00", label: "2 PM", score: 30, peak: false },
    { hour: "17:00", label: "5 PM", score: 100, peak: true },
    { hour: "19:00", label: "7 PM", score: 65, peak: false },
    { hour: "21:00", label: "9 PM", score: 45, peak: false },
  ];

  const isSample = Boolean(audienceData?.is_sample);

  const filteredQuestions =
    selectedFilter === "all"
      ? faqs
      : faqs.filter((q: any) => q.topic.toLowerCase().includes(selectedFilter.toLowerCase()));

  const updatedTime = audienceData?.updated_at
    ? `Updated at ${new Date(audienceData.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST`
    : "Live Audience Telemetry";

  return (
    <>
      <Topbar pageTitle="Audience & Outreach" lastUpdated={updatedTime} />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
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
              Curate institutional outreach tailored to real community questions gathered from{" "}
              <span className="font-bold text-[#001e2d]">{digest.sources_used.join(", ")}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (USE_STUDIO_REDIRECT) {
                  router.push("/studio");
                } else {
                  setInlineData({
                    kind: "campaign",
                    title: "Youth Skilling & Employability Outreach",
                    topic: "Employability & Digital Skills",
                    audience: "Vocational Job Seekers & Students",
                  });
                }
              }}
              className="stitch-btn-primary cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Compose Campaign</span>
            </button>
          </div>
        </section>

        {/* Section 1: Outreach Ideas Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#eaf5ff] flex items-center justify-center text-[#0099f2]">
                <span className="material-symbols-outlined text-[20px]">campaign</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#001e2d]">Outreach Ideas</h2>
                <p className="text-xs text-[#3f4852]">
                  Actionable tactical concepts derived from real learner sentiment queries and trend signals
                </p>
              </div>
            </div>
            <span className="text-xs bg-[#eaf5ff] text-[#00629e] font-bold px-3 py-1 rounded-full shadow-2xs">
              4 prioritized initiatives
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {OUTREACH_IDEAS.map((idea) => (
              <div
                key={idea.id}
                className="stitch-card p-6 flex flex-col justify-between group"
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
                  <p className="text-xs text-[#3f4852] mb-6 leading-relaxed">
                    {idea.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#0099f2]/10 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 text-[#3f4852]">
                    <span className="material-symbols-outlined text-[16px] text-[#0099f2]">target</span>
                    <span className="text-xs font-semibold">{idea.target}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (USE_STUDIO_REDIRECT) {
                        router.push(`/studio?topic=${encodeURIComponent(idea.topic)}`);
                      } else {
                        setInlineData({
                          kind: "outreach_post",
                          title: idea.title,
                          topic: idea.topic,
                          ideaText: idea.description,
                          targetGroup: idea.target,
                          audience: idea.target,
                        });
                      }
                    }}
                    className="w-full stitch-btn-highlight text-xs flex items-center justify-between font-bold cursor-pointer"
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
              &quot;First-generation aspirants express the highest curiosity around industry job links, hands-on lab time, and living stipends. Addressing these proactive inquiries early accelerates admissions conversion.&quot;
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

        {/* Section 2: Questions Learners Ask */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#001e2d]">Categorized FAQs &amp; Questions Learners Ask</h2>
              <p className="text-xs text-[#3f4852]">
                Grouped inquiry clusters with AI suggested replies generated from real learner posts
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {["all", "ev", "job", "internship", "employability"].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                    selectedFilter === f
                      ? "bg-[#0099f2] text-white shadow-xs"
                      : "bg-[#eaf5ff] text-[#3f4852] hover:bg-[#def0ff]"
                  }`}
                >
                  {f === "all" ? "All Topics" : f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredQuestions.map((q: any) => {
              const questionText = q.sample_question || q.question;
              const replyText = q.suggested_reply || q.suggestedReply;
              const replyLabel = q.reply_label || "AI suggested reply";

              return (
                <div
                  key={q.id}
                  className="stitch-card p-5 flex flex-col justify-between space-y-4"
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
                    <div className="mt-3 p-3 rounded-xl bg-[#eaf5ff]/70 border border-[#0099f2]/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-[#00629e] block">
                          Suggested Institutional Reply:
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
                        className="px-3 py-1.5 rounded-full bg-[#eaf5ff] hover:bg-[#d2ecff] text-[#00629e] text-xs font-bold transition-all"
                      >
                        {copiedId === q.id ? "Copied!" : "Copy Reply"}
                      </button>
                      <button
                        onClick={() => {
                          if (USE_STUDIO_REDIRECT) {
                            router.push(`/studio?topic=${encodeURIComponent(q.topic)}`);
                          } else {
                            setInlineData({
                              kind: "faq_reply",
                              title: `FAQ Reply: ${q.topic}`,
                              topic: q.topic,
                              questionText: questionText,
                              audience: "Learners & Aspirants",
                            });
                          }
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#0099f2] text-white text-xs font-bold hover:bg-[#007acc] transition-all cursor-pointer"
                      >
                        Use in Studio
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Inline AI Content Studio Slide-Over Panel */}
        <InlineGenerator
          isOpen={Boolean(inlineData)}
          onClose={() => setInlineData(null)}
          data={inlineData}
        />
      </main>
    </>
  );
}

