"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { EvidencePosts } from "@/components/EvidencePosts";
import { api } from "@/lib/api";
import { Opportunity } from "@/types";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    api.getOpportunity(id)
      .then((res) => setOpp(res))
      .catch((err) => {
        console.error(err);
        setError(`Opportunity "${id}" could not be found.`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <>
        <Topbar pageTitle="Opportunity Detail" onRefresh={loadData} />
        <main className="pt-20 px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0067A5]" />
          <p className="mt-3 text-xs text-[#666666]">Loading opportunity analysis...</p>
        </main>
      </>
    );
  }

  if (error || !opp) {
    return (
      <>
        <Topbar pageTitle="Opportunity Detail" onRefresh={loadData} />
        <main className="pt-20 px-8 pb-16 max-w-4xl mx-auto w-full space-y-4">
          <div className="bg-white rounded-xl p-8 border border-red-200 text-center space-y-3">
            <h2 className="text-base font-bold text-red-800">Opportunity Not Found</h2>
            <p className="text-xs text-[#666666]">{error}</p>
            <Link
              href="/opportunities"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Opportunity Radar
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar pageTitle={`Opportunity: ${opp.title}`} onRefresh={loadData} />

      <main className="pt-20 px-8 pb-16 max-w-5xl mx-auto w-full space-y-8">
        {/* Back Link */}
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0067A5] hover:text-[#005588] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Opportunity Radar
        </Link>

        {/* Title Header Card */}
        <div className="bg-white rounded-xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0067A5] bg-[#DCEFF7] px-2.5 py-0.5 rounded-md border border-[#008FD3]/20">
                  {opp.topic}
                </span>
                <span className="text-xs text-[#666666]">
                  ID: {opp.id}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#252525]">
                {opp.title}
              </h1>
            </div>

            <Link
              href={`/studio?opportunity=${opp.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0067A5] text-white text-xs font-bold hover:bg-[#005588] transition-all shadow-xs flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[#DCEFF7]" />
              <span>Generate AI Campaign</span>
            </Link>
          </div>

          {/* Context Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E5E7EB] text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-[#666666]">
                Conversation Summary:
              </span>
              <p className="text-[#252525] leading-relaxed">
                {opp.summary}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-[#0067A5]">
                Recommended Action:
              </span>
              <p className="text-[#252525] leading-relaxed">
                {opp.recommended_action}
              </p>
            </div>
          </div>
        </div>

        {/* Strategic Fit Box */}
        <div className="bg-[#DCEFF7] rounded-xl p-5 border border-[#008FD3]/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0067A5] uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-[#0067A5]" />
            <span>Why it matters to Tata STRIVE</span>
          </div>
          <p className="text-xs text-[#252525] leading-relaxed">
            {opp.why_it_matters}
          </p>
        </div>

        {/* Transparent Score Breakdown */}
        <section className="space-y-3">
          <ScoreBreakdown
            score={opp.score}
            breakdown={opp.score_breakdown}
            weights={opp.score_weights}
            priority={opp.priority}
          />
        </section>

        {/* Evidence Posts Section */}
        <section className="bg-white rounded-xl p-6 border border-[#E5E7EB] shadow-xs space-y-4">
          <EvidencePosts
            postIds={opp.supporting_post_ids}
            title="Supporting Social Evidence"
            subtitle="Actual posts that triggered this opportunity score"
          />
        </section>

        {/* Bottom Campaign Launcher Banner */}
        <div className="bg-white rounded-xl p-6 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#252525]">
              Ready to launch this campaign?
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              Generate platform-optimized social copy, key messages, and conversion metrics in the AI Campaign Studio.
            </p>
          </div>

          <Link
            href={`/studio?opportunity=${opp.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0067A5] text-white text-xs font-bold hover:bg-[#005588] transition-all shadow-xs flex-shrink-0"
          >
            <Sparkles className="w-4 h-4 text-[#DCEFF7]" />
            <span>Open in Campaign Studio</span>
          </Link>
        </div>
      </main>
    </>
  );
}
