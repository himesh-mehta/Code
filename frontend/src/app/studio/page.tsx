"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { EvidencePosts } from "@/components/EvidencePosts";
import { api } from "@/lib/api";
import {
  Opportunity,
  StudioEvidencePack,
} from "@/types";
import { formatCount, formatChange } from "@/lib/utils";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Edit3,
  BookmarkCheck,
  RefreshCw,
  Trash2,
  Upload,
  AlertTriangle,
  Lightbulb,
  Share2,
  Image as ImageIcon,
  CheckCircle2,
  Search,
  Clock,
  ExternalLink,
  BarChart2,
  BookOpen,
  MessageSquare,
  HelpCircle,
  ThumbsUp,
  Bookmark,
  X,
  Radio,
} from "lucide-react";

import { usePageContext } from "@/context/PageContext";

interface AiGeneratedContent {
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  visual_suggestion: string;
  platform: string;
  variants?: Array<{ platform: string; body: string }>;
  model_used?: string;
  tokens_used?: any;
}

// Canonical platform character limits for real-time verification feedback
const PLATFORM_LIMITS: Record<string, number> = {
  linkedin: 1300,
  instagram: 900,
  youtube_shorts: 450,
  whatsapp: 500,
  multi_channel: 1300,
};

// Audience heuristic auto-selector based on topic keywords
function getSuggestedAudience(topic: string): string {
  const t = topic.toLowerCase();
  if (t.includes("parent") || t.includes("counselor") || t.includes("family") || t.includes("guidance") || t.includes("school")) {
    return "Parents & Counselors";
  }
  if (t.includes("partner") || t.includes("industry") || t.includes("employer") || t.includes("placement drive") || t.includes("hiring") || t.includes("corporate")) {
    return "Industry Placement Partners";
  }
  return "Vocational Job Seekers & Students";
}

function StudioContent() {
  const searchParams = useSearchParams();
  const preselectedOppId = searchParams.get("opportunity") || "";
  const topicParam = searchParams.get("topic") || "";
  const draftIdParam = searchParams.get("draftId") || "";
  const { updatePageContext } = usePageContext();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>(preselectedOppId);
  const [targetAudience, setTargetAudience] = useState<string>("Vocational Job Seekers & Students");
  const [tone, setTone] = useState<string>("Professional");
  const [language, setLanguage] = useState<string>("English");
  const [platform, setPlatform] = useState<string>("linkedin");
  const [multiChannelTab, setMultiChannelTab] = useState<string>("linkedin");

  // 1. Topic Search Combobox State
  const [selectedTopic, setSelectedTopic] = useState<string>(topicParam || "Employability and job readiness");
  const [searchQuery, setSearchQuery] = useState<string>(topicParam || "");
  const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [taxonomyTopics, setTaxonomyTopics] = useState<string[]>([]);
  const [striveProgrammes, setStriveProgrammes] = useState<Array<{ name: string; category: string; source: string }>>([]);
  const [evidencePack, setEvidencePack] = useState<StudioEvidencePack | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(false);
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null);
  const [copiedChecklist, setCopiedChecklist] = useState<boolean>(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // AI Output state
  const [generated, setGenerated] = useState<AiGeneratedContent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateErrorCode, setGenerateErrorCode] = useState<string | null>(null);

  // Editing and preview state
  const [isEditingCopy, setIsEditingCopy] = useState<boolean>(false);
  const [editedBody, setEditedBody] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showBasedOn, setShowBasedOn] = useState(true);

  // Image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved drafts state
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("social_pulse_recent_topics");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Load suggestions (taxonomy topics & STRIVE programmes) from backend
  useEffect(() => {
    api.getStudioSuggestions().then((res) => {
      if (res.taxonomy_topics?.length) setTaxonomyTopics(res.taxonomy_topics);
      if (res.strive_programmes?.length) setStriveProgrammes(res.strive_programmes);
    }).catch(() => {
      // Fallback taxonomy if network delayed
      setTaxonomyTopics([
        "AI and digital skills",
        "EV and battery",
        "Solar and green energy",
        "Employability and job readiness",
        "Vocational training",
        "Internships and apprenticeships",
        "Scholarships and stipends",
        "Entrepreneurship and self-employment",
        "Youth education and counseling",
        "Employer skill requirements",
        "Industrial IoT and PLC",
        "Green hydrogen",
        "Healthcare and tele-health",
        "Drones"
      ]);
    });
  }, []);

  // Load opportunities
  useEffect(() => {
    api.getOpportunities().then((res) => {
      setOpportunities(res.items);
      if (preselectedOppId) {
        setSelectedOppId(preselectedOppId);
        const opp = res.items.find((o) => o.id === preselectedOppId);
        if (opp) {
          const t = opp.topic || opp.title;
          setSelectedTopic(t);
          setSearchQuery(t);
        }
      } else if (topicParam) {
        const matched = res.items.find(
          (o) =>
            o.topic?.toLowerCase().includes(topicParam.toLowerCase()) ||
            o.title.toLowerCase().includes(topicParam.toLowerCase())
        );
        if (matched) {
          setSelectedOppId(matched.id);
        }
        setSelectedTopic(topicParam);
        setSearchQuery(topicParam);
      } else if (!selectedOppId && res.items.length > 0) {
        setSelectedOppId(res.items[0].id);
        const t = res.items[0].topic || res.items[0].title;
        setSelectedTopic(t);
        setSearchQuery(t);
      }
    });
  }, [preselectedOppId, topicParam]);

  // Close combobox when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch evidence pack whenever selectedTopic changes
  const loadEvidencePack = useCallback(async (topicToFetch: string) => {
    if (!topicToFetch) return;
    setLoadingEvidence(true);
    try {
      const pack = await api.getStudioEvidencePack(topicToFetch);
      setEvidencePack(pack);
      if (pack.is_off_topic) {
        setGenerateErrorCode("off_topic");
        setGenerateError(
          `The topic "${topicToFetch}" is outside the skilling and youth livelihood mission of Tata STRIVE. Please select an employability, vocational, or technical skill topic.`
        );
      } else {
        if (generateErrorCode === "off_topic") {
          setGenerateErrorCode(null);
          setGenerateError(null);
        }
      }
    } catch (err: any) {
      console.warn("Could not fetch evidence pack:", err);
    } finally {
      setLoadingEvidence(false);
    }
  }, [generateErrorCode]);

  useEffect(() => {
    if (selectedTopic) {
      loadEvidencePack(selectedTopic);
    }
  }, [selectedTopic, loadEvidencePack]);

  // Topic Selection Handler
  const handleSelectTopic = (topicName: string, oppId?: string) => {
    const clean = topicName.trim();
    if (!clean) return;
    setSelectedTopic(clean);
    setSearchQuery(clean);
    setIsComboboxOpen(false);
    setIsEditingCopy(false);
    setEditedBody("");
    setGenerateError(null);
    setGenerateErrorCode(null);

    // Auto-prefill audience suggestion based on topic
    setTargetAudience(getSuggestedAudience(clean));

    if (oppId) {
      setSelectedOppId(oppId);
    } else {
      const matched = opportunities.find(
        (o) =>
          o.id === oppId ||
          o.topic?.toLowerCase() === clean.toLowerCase() ||
          o.title.toLowerCase() === clean.toLowerCase() ||
          clean.toLowerCase().includes(o.topic?.toLowerCase() || "")
      );
      setSelectedOppId(matched ? matched.id : "");
    }

    // Update URL ?topic=... so it is shareable
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("topic", clean);
      if (oppId) url.searchParams.set("opportunity", oppId);
      else url.searchParams.delete("opportunity");
      window.history.replaceState(null, "", url.toString());
    }

    // Immediately fetch fresh evidence pack for this topic
    loadEvidencePack(clean);

    // Persist to recent searches (last 5, stored locally)
    setRecentSearches((prev) => {
      const updated = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem("social_pulse_recent_topics", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Load saved drafts from backend SQLite storage
  const loadDrafts = useCallback(() => {
    api.getRealCampaigns().then((res) => {
      if (res.items) {
        setSavedDrafts(res.items);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Handle draftId query param if passed
  useEffect(() => {
    if (draftIdParam && savedDrafts.length > 0) {
      const found = savedDrafts.find((d) => d.id === draftIdParam);
      if (found) {
        setGenerated({
          headline: found.title,
          body: found.body_copy || found.captions?.primary || "",
          hashtags: found.hashtags ? found.hashtags.split(" ") : ["#TataSTRIVE"],
          cta: found.call_to_action || "Enroll in Tata STRIVE",
          visual_suggestion: found.visual_suggestion || "",
          platform: found.platform || "linkedin",
        });
        setEditedBody(found.body_copy || found.captions?.primary || "");
        if (found.platform) setPlatform(found.platform);
        if (found.tone) setTone(found.tone);
        if (found.target_audience) setTargetAudience(found.target_audience);
        if (found.opportunity_id) setSelectedOppId(found.opportunity_id);
        if (found.topic) {
          setSelectedTopic(found.topic);
          setSearchQuery(found.topic);
        }
      }
    }
  }, [draftIdParam, savedDrafts]);

  const currentOpp = useMemo(
    () => opportunities.find((o) => o.id === selectedOppId),
    [opportunities, selectedOppId]
  );

  // Sync with PageContext
  useEffect(() => {
    updatePageContext({
      route: "/studio",
      page_name: "Content Studio",
      page_purpose:
        "AI campaign studio converting high-priority opportunities into actionable content ideas, captions, key messages, and measurable CTAs.",
      filters: {
        selected_opportunity_id: selectedOppId,
        selected_topic: selectedTopic,
        tone,
        platform_filter: platform || "All Platforms",
      },
      metrics: {
        opportunity_title: currentOpp?.title || selectedTopic || "N/A",
        opportunity_priority: currentOpp?.priority || "N/A",
        opportunity_score: currentOpp?.score || 0,
        content_formats_count: generated?.variants?.length || 1,
        captions_count: 1,
        target_cta: generated?.cta || "N/A",
      },
    });
  }, [
    generated,
    selectedOppId,
    selectedTopic,
    tone,
    platform,
    currentOpp,
    updatePageContext,
  ]);

  // Handle AI generation with Groq endpoint strictly grounded in evidence pack
  const handleGenerate = useCallback(async (customContextQuestion?: string) => {
    const activeTopic = searchQuery.trim() || selectedTopic;
    if (!activeTopic) return;

    // Synchronize selectedTopic with typed search query if user clicked Generate directly
    if (activeTopic.toLowerCase() !== selectedTopic.toLowerCase()) {
      setSelectedTopic(activeTopic);
      setTargetAudience(getSuggestedAudience(activeTopic));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("topic", activeTopic);
        window.history.replaceState(null, "", url.toString());
      }
    }

    setGenerating(true);
    setGenerateError(null);
    setGenerateErrorCode(null);
    setIsEditingCopy(false);

    try {
      // Ensure we have the fresh authentic evidence pack for THIS exact topic
      let activePack = evidencePack;
      if (!activePack || activePack.topic.toLowerCase() !== activeTopic.toLowerCase()) {
        try {
          activePack = await api.getStudioEvidencePack(activeTopic);
          setEvidencePack(activePack);
        } catch (e) {
          console.warn("Evidence pack fetch error:", e);
        }
      }

      // Check if any opportunity matches the active topic (do NOT pass unrelated EV context)
      const matchingOpp = opportunities.find(
        (o) =>
          o.topic?.toLowerCase() === activeTopic.toLowerCase() ||
          o.title.toLowerCase().includes(activeTopic.toLowerCase()) ||
          activeTopic.toLowerCase().includes(o.topic?.toLowerCase() || "")
      );

      // Build evidence context from real data only
      let contextData: any = {};

      if (activePack?.evidence_context_for_ai) {
        contextData = {
          ...activePack.evidence_context_for_ai,
          opportunity_score: matchingOpp?.score ? `${matchingOpp.score}/100` : undefined,
          strategic_rationale: matchingOpp?.why_it_matters || undefined,
        };
      } else {
        const evidenceSnippets = (matchingOpp?.evidence_posts || []).slice(0, 4).map((ep) => ({
          text: ep.text,
          author: ep.author || "Community Learner",
          url: ep.url || "",
        }));

        contextData = {
          opportunity_title: matchingOpp?.title || activeTopic,
          score: matchingOpp?.score ? `${matchingOpp.score}/100` : "High",
          topic: activeTopic,
          why_it_matters: matchingOpp?.why_it_matters || "",
          evidence_posts: evidenceSnippets,
          trend_telemetry: {
            post_count: matchingOpp?.post_count || matchingOpp?.supporting_post_ids?.length || 0,
            score_breakdown: matchingOpp?.score_breakdown || {},
          },
        };
      }

      if (customContextQuestion) {
        contextData.focal_learner_question = customContextQuestion;
      }

      const res = await api.generateAiContent({
        kind: "campaign",
        topic: activeTopic,
        audience: targetAudience,
        platform: platform || "linkedin",
        tone,
        language,
        context: contextData,
      });

      setGenerated(res);
      setEditedBody(res.body || "");
      if (customContextQuestion) {
        setFocusedQuestion(null);
      }
    } catch (err: any) {
      setGenerateError(err.message || "Failed to generate campaign. Check network or backend.");
      setGenerateErrorCode(err.code || null);
    } finally {
      setGenerating(false);
    }
  }, [currentOpp, selectedTopic, searchQuery, evidencePack, opportunities, targetAudience, platform, tone, language]);

  // "Use in post" trigger for real learner questions
  const handleUseQuestionInPost = (questionText: string) => {
    setFocusedQuestion(questionText);
    handleGenerate(questionText);
  };

  // Reset clears form, topic, URL and preview back to clean empty state
  const handleReset = () => {
    setGenerated(null);
    setEditedBody("");
    setIsEditingCopy(false);
    setGenerateError(null);
    setGenerateErrorCode(null);
    setUploadedImage(null);
    setPlatform("linkedin");
    setTone("Professional");
    setLanguage("English");
    setTargetAudience("Vocational Job Seekers & Students");
    setSelectedTopic("");
    setSearchQuery("");
    setSelectedOppId("");
    setEvidencePack(null);
    setFocusedQuestion(null);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/studio");
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const copyPublishingChecklist = () => {
    const checklistText = `Tata STRIVE Campaign Publishing Checklist:
1. Review facts against live learner evidence.
2. Add the real Tata STRIVE course enrolment link.
3. Check institutional tone and language.
4. Include a clear, unambiguous call to action.
5. Avoid guarantees about jobs or salary packages.`;
    navigator.clipboard.writeText(checklistText);
    setCopiedChecklist(true);
    setTimeout(() => setCopiedChecklist(false), 2000);
  };

  // Save draft to SQLite storage
  const handleSaveDraft = async () => {
    const activeBody = editedBody || generated?.body;
    if (!activeBody) return;

    try {
      await api.saveCampaign({
        opportunity_id: selectedOppId || "opp_custom",
        topic: selectedTopic || currentOpp?.topic || "Tata STRIVE Skilling",
        title: generated?.headline || selectedTopic || currentOpp?.title || "Youth Skilling Outreach Campaign",
        target_audience: targetAudience,
        platform,
        tone,
        body_copy: activeBody,
        call_to_action: generated?.cta || "Enroll in Tata STRIVE",
        hashtags: generated?.hashtags ? generated.hashtags.join(" ") : "#TataSTRIVE #SkillingIndia",
        visual_suggestion: generated?.visual_suggestion || "",
      });
      setDraftSavedNotice("Draft saved successfully to database!");
      loadDrafts();
      setTimeout(() => setDraftSavedNotice(null), 3000);
    } catch (err: any) {
      setDraftSavedNotice("Draft saved to current session.");
      setTimeout(() => setDraftSavedNotice(null), 3000);
    }
  };

  // Delete saved draft
  const handleDeleteDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteCampaign(draftId);
      loadDrafts();
      setDraftSavedNotice("Draft deleted successfully.");
      setTimeout(() => setDraftSavedNotice(null), 2500);
    } catch (err) {
      loadDrafts();
    }
  };

  // Open saved draft
  const handleOpenDraft = (draft: any) => {
    setGenerated({
      headline: draft.title,
      body: draft.body_copy || draft.captions?.primary || "",
      hashtags: draft.hashtags ? draft.hashtags.split(" ") : ["#TataSTRIVE"],
      cta: draft.call_to_action || "Enroll in Tata STRIVE",
      visual_suggestion: draft.visual_suggestion || "",
      platform: draft.platform || "linkedin",
    });
    setEditedBody(draft.body_copy || draft.captions?.primary || "");
    if (draft.platform) setPlatform(draft.platform);
    if (draft.tone) setTone(draft.tone);
    if (draft.target_audience) setTargetAudience(draft.target_audience);
    if (draft.opportunity_id) setSelectedOppId(draft.opportunity_id);
    if (draft.topic) {
      setSelectedTopic(draft.topic);
      setSearchQuery(draft.topic);
    }
    setIsEditingCopy(false);
  };

  // Handle user image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Active body copy for multi-channel tab switching
  const activeVariantBody = useMemo(() => {
    if (platform === "multi_channel" && generated?.variants && generated.variants.length > 0) {
      const variant = generated.variants.find((v) => v.platform === multiChannelTab);
      if (variant?.body) return variant.body;
    }
    return editedBody || generated?.body || "";
  }, [platform, multiChannelTab, generated, editedBody]);

  // Real feedback metrics calculated strictly from generated text
  const currentBodyText = activeVariantBody || generated?.body || "";
  const charCount = currentBodyText.length;
  const activePlatformKey = platform === "multi_channel" ? multiChannelTab : platform;
  const platformLimit = PLATFORM_LIMITS[activePlatformKey] || 1300;
  const wordCount = currentBodyText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedReadingTime = useMemo(() => {
    if (wordCount === 0) return "0 sec read";
    if (wordCount < 30) return "< 30 sec read";
    if (wordCount < 70) return "~45 sec read";
    return `~${Math.ceil(wordCount / 200)} min read`;
  }, [wordCount]);

  // Filtered Combobox Suggestions
  const qLower = searchQuery.trim().toLowerCase();

  const matchingOpportunities = useMemo(() => {
    if (!qLower) return opportunities.slice(0, 4);
    return opportunities.filter(
      (o) => o.title.toLowerCase().includes(qLower) || o.topic.toLowerCase().includes(qLower)
    );
  }, [opportunities, qLower]);

  const matchingTaxonomy = useMemo(() => {
    if (!qLower) return taxonomyTopics.slice(0, 4);
    return taxonomyTopics.filter((t) => t.toLowerCase().includes(qLower));
  }, [taxonomyTopics, qLower]);

  const matchingProgrammes = useMemo(() => {
    if (!qLower) return striveProgrammes.slice(0, 4);
    return striveProgrammes.filter(
      (p) => p.name.toLowerCase().includes(qLower) || p.category.toLowerCase().includes(qLower)
    );
  }, [striveProgrammes, qLower]);

  const matchingRecent = useMemo(() => {
    if (!qLower) return recentSearches;
    return recentSearches.filter((s) => s.toLowerCase().includes(qLower));
  }, [recentSearches, qLower]);

  // 3 most recent saved drafts for this topic from storage
  const savedDraftsForTopic = useMemo(() => {
    if (!savedDrafts || savedDrafts.length === 0) return [];
    if (!selectedTopic) return savedDrafts.slice(0, 3);
    const topicFiltered = savedDrafts.filter(
      (d) => d.topic?.toLowerCase().includes(selectedTopic.toLowerCase()) || selectedTopic.toLowerCase().includes(d.topic?.toLowerCase() || "")
    );
    return (topicFiltered.length > 0 ? topicFiltered : savedDrafts).slice(0, 3);
  }, [savedDrafts, selectedTopic]);

  return (
    <>
      <Topbar pageTitle="Content Studio" />

      <main className="pt-20 px-4 sm:px-6 md:px-8 pb-16 max-w-[1600px] mx-auto w-full space-y-8 animate-fade-in-up">
        {/* Top Context & Header Banner */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#dfec42] text-[#001e2d] uppercase tracking-wider">
                Groq AI Studio Engine
              </span>
              <span className="text-xs font-semibold text-[#3f4852] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#00629e]">bolt</span>
                Factually Grounded Communications
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#001e2d] tracking-tight">
              Content Studio
            </h1>
            <p className="text-sm md:text-base text-[#3f4852] leading-relaxed">
              Synthesize targeted institutional outreach, WhatsApp broadcasts, and platform-ready captions grounded strictly in verified learner evidence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 rounded-full bg-white text-[#00629e] hover:bg-[#eaf5ff] font-bold text-xs shadow-azure-card transition-all cursor-pointer flex items-center gap-2 border border-[#def0ff]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={generating || (!selectedTopic && !searchQuery.trim())}
              className="stitch-btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing with Groq...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{generated ? "Re-Generate Assets" : "Generate Campaign"}</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Status or Error Notifications */}
        {generateError && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">
                {generateErrorCode === "rate_limited"
                  ? "Rate Limit Exceeded"
                  : generateErrorCode === "off_topic"
                  ? "Off-Topic Scope Notice"
                  : "AI Generation Notice"}
              </strong>
              <p className="mt-0.5 leading-relaxed">{generateError}</p>
            </div>
          </div>
        )}

        {draftSavedNotice && (
          <div className="p-4 rounded-2xl bg-[#eaf5ff] border border-[#56c0ff] text-xs text-[#00629e] font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-[#0099f2]" />
            <span>{draftSavedNotice}</span>
          </div>
        )}

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Generator Parameters & Compact Evidence Info Cards (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            {/* Card 1: Campaign Parameters Form */}
            <div className="stitch-card p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#def0ff]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#eaf5ff] text-[#00629e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">tune</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#001e2d]">Campaign Parameters</h2>
                    <p className="text-xs text-[#3f4852] font-medium">Configure target audience and voice</p>
                  </div>
                </div>
              </div>

              <form
                className="flex flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim() && searchQuery.trim().toLowerCase() !== selectedTopic.toLowerCase()) {
                    handleSelectTopic(searchQuery.trim());
                  }
                  handleGenerate();
                }}
              >
                {/* 1. SEARCH ANY TOPIC (Searchable Combobox) */}
                <div className="flex flex-col gap-1.5" ref={comboboxRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#001e2d] flex items-center gap-1.5">
                      <span>Focus Topic or Opportunity</span>
                      {loadingEvidence && (
                        <Loader2 className="w-3 h-3 text-[#0099f2] animate-spin" />
                      )}
                    </label>
                    {topicParam && selectedTopic === topicParam && (
                      <span className="text-[11px] font-bold text-[#00629e] flex items-center gap-1 bg-[#eaf5ff] px-2.5 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-[#0099f2]" /> Prefilled from URL
                      </span>
                    )}
                  </div>

                  {/* Search Combobox Input */}
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-[#00629e] absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsComboboxOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (searchQuery.trim()) {
                              handleSelectTopic(searchQuery.trim());
                            }
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            if (searchQuery.trim() && searchQuery.trim().toLowerCase() !== selectedTopic.toLowerCase()) {
                              handleSelectTopic(searchQuery.trim());
                            }
                          }, 250);
                        }}
                        onFocus={() => setIsComboboxOpen(true)}
                        placeholder="Search opportunities, topics, or type custom topic..."
                        className="w-full bg-[#f5faff] text-[#001e2d] font-bold text-xs pl-10 pr-10 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0099f2] border border-[#def0ff]"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedTopic("");
                            setSelectedOppId("");
                            setEvidencePack(null);
                            setIsComboboxOpen(true);
                          }}
                          className="absolute right-3 p-1 text-[#3f4852] hover:text-[#001e2d] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Combobox Dropdown Suggestions */}
                    {isComboboxOpen && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-[#def0ff] max-h-80 overflow-y-auto z-50 p-2 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                        {/* A. Recent Searches */}
                        {matchingRecent.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-[#3f4852] uppercase tracking-wider px-3 py-1 block">
                              Recent Searches
                            </span>
                            <div className="space-y-1">
                              {matchingRecent.map((r, idx) => (
                                <button
                                  key={`recent-${idx}`}
                                  type="button"
                                  onClick={() => handleSelectTopic(r)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#001e2d] hover:bg-[#eaf5ff] transition-colors flex items-center justify-between group cursor-pointer"
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Clock className="w-3.5 h-3.5 text-[#00629e] shrink-0" />
                                    <span className="truncate">{r}</span>
                                  </span>
                                  <span className="text-[10px] text-[#3f4852] font-semibold">Recent</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* B. Real Opportunities */}
                        {matchingOpportunities.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-[#00629e] uppercase tracking-wider px-3 py-1 block">
                              Real Opportunities
                            </span>
                            <div className="space-y-1">
                              {matchingOpportunities.map((opp) => (
                                <button
                                  key={opp.id}
                                  type="button"
                                  onClick={() => handleSelectTopic(opp.topic || opp.title, opp.id)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#001e2d] hover:bg-[#eaf5ff] transition-colors flex items-center justify-between group cursor-pointer"
                                >
                                  <span className="truncate mr-2">{opp.title}</span>
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dfec42] text-[#001e2d]">
                                    Priority Score: {opp.score}/100
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* C. Taxonomy Topics */}
                        {matchingTaxonomy.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-[#00629e] uppercase tracking-wider px-3 py-1 block">
                              Taxonomy Topics
                            </span>
                            <div className="space-y-1">
                              {matchingTaxonomy.map((tax, idx) => (
                                <button
                                  key={`tax-${idx}`}
                                  type="button"
                                  onClick={() => handleSelectTopic(tax)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#001e2d] hover:bg-[#eaf5ff] transition-colors flex items-center justify-between group cursor-pointer"
                                >
                                  <span className="truncate mr-2">{tax}</span>
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#def0ff] text-[#00629e]">
                                    Taxonomy Topic
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* D. Tata STRIVE Programmes */}
                        {matchingProgrammes.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-[#00629e] uppercase tracking-wider px-3 py-1 block">
                              Tata STRIVE Programmes (tatastrive.com)
                            </span>
                            <div className="space-y-1">
                              {matchingProgrammes.map((prog, idx) => (
                                <button
                                  key={`prog-${idx}`}
                                  type="button"
                                  onClick={() => handleSelectTopic(prog.name)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#001e2d] hover:bg-[#eaf5ff] transition-colors flex items-center justify-between group cursor-pointer"
                                >
                                  <span className="truncate mr-2">{prog.name}</span>
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    Tata STRIVE Course
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* E. Custom Topic Option */}
                        {searchQuery.trim() && (
                          <div className="pt-2 border-t border-[#def0ff]">
                            <button
                              type="button"
                              onClick={() => handleSelectTopic(searchQuery.trim())}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#00629e] bg-[#eaf5ff] hover:bg-[#def0ff] transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex flex-col truncate mr-2">
                                <span className="truncate">Use custom topic: &quot;{searchQuery.trim()}&quot;</span>
                                <span className="text-[10px] text-[#3f4852] font-medium">
                                  Any skilling, training, placement or career topic
                                </span>
                              </div>
                              <span className="material-symbols-outlined text-[18px] text-[#0099f2]">arrow_forward</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* General Draft Notice Badge when no live data exists for a custom topic */}
                  {!loadingEvidence && evidencePack && !evidencePack.has_live_data && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>No live data found for this topic. Draft is general.</span>
                    </div>
                  )}

                  {/* LEGACY FOCUS OPPORTUNITY SELECTOR — KEPT COMMENTED OUT PER INSTRUCTIONS */}
                  {/*
                  <div className="relative">
                    <select
                      value={selectedOppId}
                      onChange={(e) => {
                        setSelectedOppId(e.target.value);
                        setIsEditingCopy(false);
                        setEditedBody("");
                      }}
                      className="w-full bg-[#f5faff] text-[#001e2d] font-bold text-xs px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0099f2] border border-[#def0ff] cursor-pointer"
                    >
                      {opportunities.map((opp) => (
                        <option key={opp.id} value={opp.id}>
                          {opp.title} (Priority Score: {opp.score}/100)
                        </option>
                      ))}
                    </select>
                  </div>
                  */}
                </div>

                {/* Target Audience Radio Selector Cards */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#001e2d]">Target Audience</label>
                  <div className="flex flex-col gap-2.5">
                    {[
                      {
                        title: "Vocational Job Seekers & Students",
                        desc: "Focus on placement security, hands-on lab time, tool stipends",
                      },
                      {
                        title: "Parents & Counselors",
                        desc: "Tata legacy, certified career stability, transparent fee-free models",
                      },
                      {
                        title: "Industry Placement Partners",
                        desc: "NSDC NSQF alignment, technical test bench rigor, immediate deployment",
                      },
                    ].map((aud) => {
                      const isSelected = targetAudience === aud.title;
                      return (
                        <label
                          key={aud.title}
                          onClick={() => setTargetAudience(aud.title)}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-[#eaf5ff] border-[#0099f2] shadow-xs"
                              : "bg-[#f5faff] border-[#def0ff] hover:bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="audience"
                            checked={isSelected}
                            onChange={() => setTargetAudience(aud.title)}
                            className="mt-0.5 w-4 h-4 text-[#0099f2] accent-[#0099f2]"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#001e2d]">{aud.title}</span>
                            <span className="text-[11px] text-[#3f4852] font-medium mt-0.5">{aud.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Platform Chips */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#001e2d]">Delivery Platform</label>
                    <span className="text-[11px] text-[#00629e] font-bold uppercase tracking-wider">
                      {platform === "multi_channel" ? "All 4 Platforms" : platform}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "linkedin", label: "LinkedIn", icon: "work" },
                      { id: "instagram", label: "Instagram", icon: "photo_camera" },
                      { id: "youtube_shorts", label: "YouTube Shorts", icon: "play_circle" },
                      { id: "whatsapp", label: "WhatsApp", icon: "chat" },
                      { id: "multi_channel", label: "Multi-Channel Broadcast", icon: "share" },
                    ].map((p) => {
                      const active = platform === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlatform(p.id)}
                          className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            active
                              ? "bg-[#0099f2] text-white shadow-xs"
                              : "bg-[#f5faff] text-[#3f4852] hover:bg-[#def0ff] border border-[#def0ff]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tone of Voice Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#001e2d]">Tone of Voice</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "Friendly", label: "Friendly & Welcoming" },
                      { id: "Professional", label: "Professional & Authoritative" },
                      { id: "Motivational", label: "Motivational & Inspiring" },
                      { id: "Informative", label: "Informative & Practical" },
                    ].map((t) => {
                      const active = tone === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTone(t.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                            active
                              ? "bg-[#dfec42] text-[#001e2d] border-[#909a00] shadow-xs"
                              : "bg-[#f5faff] text-[#3f4852] border-[#def0ff] hover:bg-white"
                          }`}
                        >
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#001e2d]">Output Language</label>
                  <div className="flex gap-2">
                    {[
                      { id: "English", label: "English" },
                      { id: "Hindi", label: "Hindi (हिंदी)" },
                      { id: "Marathi", label: "Marathi (मराठी)" },
                    ].map((l) => {
                      const active = language === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setLanguage(l.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            active
                              ? "bg-[#0099f2] text-white border-[#0099f2]"
                              : "bg-[#f5faff] text-[#3f4852] border-[#def0ff] hover:bg-white"
                          }`}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Generator Trigger */}
                <button
                  type="submit"
                  disabled={generating || (!selectedTopic && !searchQuery.trim())}
                  className="w-full mt-2 py-4 px-6 rounded-full stitch-btn-primary text-sm font-bold flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60 shadow-md"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Synthesizing Campaign with Groq...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                      <span>{generated ? "Re-Generate Assets" : "Generate Campaign Options"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 3. FILL EMPTY SPACE BELOW PARAMETERS: Compact Info Cards Stack */}
            <div className="flex flex-col gap-4">
              {/* Card a: Topic Snapshot */}
              {evidencePack?.snapshot && evidencePack.has_live_data && (
                <details className="stitch-card overflow-hidden group select-none" open>
                  <summary className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#f5faff] transition-colors list-none">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#0099f2]" />
                      <span className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider">
                        Topic Snapshot
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          evidencePack.snapshot.status === "Growing"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : evidencePack.snapshot.status === "Cooling"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-[#eaf5ff] text-[#00629e] border-[#def0ff]"
                        }`}
                      >
                        {evidencePack.snapshot.status}
                      </span>
                      <ChevronDown className="w-4 h-4 text-[#3f4852] group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-[#def0ff] pt-3 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#f5faff] border border-[#def0ff]">
                        <span className="text-[10px] text-[#3f4852] font-semibold block">Mentions (Last 7d)</span>
                        <span className="text-base font-extrabold text-[#001e2d]">
                          {formatCount(evidencePack.snapshot.mentions_7d)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#f5faff] border border-[#def0ff]">
                        <span className="text-[10px] text-[#3f4852] font-semibold block">vs Previous 7d</span>
                        <span
                          className={`text-base font-extrabold ${
                            evidencePack.snapshot.is_new
                              ? "text-[#00629e]"
                              : (evidencePack.snapshot.change_pct || 0) >= 0
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {formatChange(evidencePack.snapshot.change_pct, evidencePack.snapshot.is_new)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#3f4852] font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#00629e]" />
                      {evidencePack.snapshot.updated_at}
                    </span>
                  </div>
                </details>
              )}

              {/* Card b: What People Are Saying */}
              {evidencePack?.what_people_are_saying && evidencePack.has_live_data && (
                <details className="stitch-card overflow-hidden group select-none" open>
                  <summary className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#f5faff] transition-colors list-none">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#0099f2]" />
                      <span className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider">
                        What People Are Saying
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#3f4852] group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-[#def0ff] pt-3 flex flex-col gap-3">
                    {/* Thin Sentiment Stack Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-100">
                        <div
                          style={{ width: `${evidencePack.what_people_are_saying.positive_pct}%` }}
                          className="bg-emerald-500 h-full transition-all"
                          title={`Positive: ${evidencePack.what_people_are_saying.positive}`}
                        />
                        <div
                          style={{ width: `${evidencePack.what_people_are_saying.neutral_pct}%` }}
                          className="bg-[#0099f2] h-full transition-all"
                          title={`Neutral: ${evidencePack.what_people_are_saying.neutral}`}
                        />
                        <div
                          style={{ width: `${evidencePack.what_people_are_saying.negative_pct}%` }}
                          className="bg-rose-500 h-full transition-all"
                          title={`Negative: ${evidencePack.what_people_are_saying.negative}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-emerald-700">
                          {evidencePack.what_people_are_saying.positive_pct}% Pos ({evidencePack.what_people_are_saying.positive})
                        </span>
                        <span className="text-[#00629e]">
                          {evidencePack.what_people_are_saying.neutral_pct}% Neu ({evidencePack.what_people_are_saying.neutral})
                        </span>
                        <span className="text-rose-700">
                          {evidencePack.what_people_are_saying.negative_pct}% Neg ({evidencePack.what_people_are_saying.negative})
                        </span>
                      </div>
                    </div>

                    {/* Top 2 Themes */}
                    {evidencePack.what_people_are_saying.top_themes.length > 0 && (
                      <div className="pt-2 border-t border-[#def0ff]">
                        <span className="text-[10px] font-bold text-[#3f4852] uppercase tracking-wider block mb-1.5">
                          Top Themes
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {evidencePack.what_people_are_saying.top_themes.map((theme, idx) => (
                            <span
                              key={`theme-${idx}`}
                              className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#eaf5ff] text-[#00629e] border border-[#def0ff]"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Card c: Questions Learners Ask */}
              {evidencePack?.questions && evidencePack.questions.length > 0 && (
                <details className="stitch-card overflow-hidden group select-none" open>
                  <summary className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#f5faff] transition-colors list-none">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#0099f2]" />
                      <span className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider">
                        Questions Learners Ask
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#00629e] bg-[#eaf5ff] px-2 py-0.5 rounded-full">
                      {evidencePack.questions.length} real queries
                    </span>
                  </summary>
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-[#def0ff] pt-3 space-y-3">
                    {evidencePack.questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-xl bg-[#f5faff] border border-[#def0ff] flex flex-col gap-2 hover:bg-white transition-colors"
                      >
                        <p className="text-xs text-[#001e2d] font-semibold italic leading-relaxed">
                          &quot;{q.text}&quot;
                        </p>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#def0ff]/60">
                          <div className="flex items-center gap-1.5 text-[#3f4852]">
                            <span className="font-bold capitalize">{q.source}</span>
                            {q.url && (
                              <a
                                href={q.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0099f2] hover:underline flex items-center gap-0.5 font-bold"
                              >
                                <span>Source</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUseQuestionInPost(q.text)}
                            className="px-2.5 py-1 rounded-full bg-[#dfec42] text-[#001e2d] hover:bg-[#909a00] hover:text-white text-[10px] font-extrabold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Use in post</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Card d: Matching Tata STRIVE Programme */}
              {evidencePack?.matching_programme && (
                <div className="stitch-card p-5 flex flex-col gap-2.5 border-l-4 border-l-[#0099f2]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#00629e] uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#0099f2]" />
                      Matching Tata STRIVE Programme
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      tatastrive.com
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#001e2d]">
                    {evidencePack.matching_programme.name}
                  </h4>
                  <p className="text-xs text-[#3f4852] font-medium leading-relaxed">
                    {evidencePack.matching_programme.description}
                  </p>
                  <a
                    href={evidencePack.matching_programme.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0099f2] hover:underline pt-1"
                  >
                    <span>View course curriculum on tatastrive.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Card e: Best Time to Post (only if >= 20 posts) */}
              {evidencePack?.best_time_to_post && (evidencePack.post_count >= 20) && (
                <div className="stitch-card p-4 sm:p-5 flex flex-col gap-2 bg-[#f5faff] border border-[#def0ff]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#0099f2]" />
                      Best Time to Post
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dfec42] text-[#001e2d]">
                      IST Peak
                    </span>
                  </div>
                  <p className="text-xs text-[#001e2d] font-semibold leading-relaxed">
                    {evidencePack.best_time_to_post.sentence}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {evidencePack.best_time_to_post.windows.map((w, idx) => (
                      <span
                        key={`window-${idx}`}
                        className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-[#00629e] border border-[#def0ff] shadow-2xs"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Card f: Publishing Checklist (Static helper with no numbers) */}
              <div className="stitch-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Publishing Checklist
                  </span>
                  <button
                    type="button"
                    onClick={copyPublishingChecklist}
                    className="text-xs font-bold text-[#00629e] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedChecklist ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy checklist</span>
                      </>
                    )}
                  </button>
                </div>
                <ul className="text-xs text-[#3f4852] font-semibold space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
                    <span>Review facts and terminology against live learner evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
                    <span>Add the real Tata STRIVE course enrolment link</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
                    <span>Check institutional tone, language, and respectfulness</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
                    <span>Include a clear, unambiguous call to action for youth</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0099f2] shrink-0 mt-0.5" />
                    <span>Avoid any promises or guarantees about jobs or salaries</span>
                  </li>
                </ul>
              </div>

              {/* Card g: Saved Drafts for this Topic */}
              {savedDraftsForTopic.length > 0 && (
                <div className="stitch-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-[#001e2d] uppercase tracking-wider flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-[#0099f2]" />
                      Saved Drafts ({savedDraftsForTopic.length})
                    </h3>
                    <span className="text-[10px] text-[#3f4852] font-semibold">SQLite Store</span>
                  </div>
                  <div className="space-y-2">
                    {savedDraftsForTopic.map((d: any, idx: number) => (
                      <div
                        key={d.id || idx}
                        onClick={() => handleOpenDraft(d)}
                        className="p-3 rounded-xl bg-[#f5faff] hover:bg-[#eaf5ff] cursor-pointer transition-colors flex items-center justify-between group border border-[#def0ff]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#001e2d] block truncate">{d.title}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-white px-1.5 py-0.5 rounded text-[#00629e]">
                              {d.platform || "social"}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#3f4852] truncate block mt-0.5">
                            {d.topic}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDraft(d);
                            }}
                            className="px-2 py-0.5 rounded-full bg-white hover:bg-[#0099f2] text-[#0099f2] hover:text-white text-[10px] font-bold transition-colors cursor-pointer border border-[#def0ff]"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDraft(d.id, e)}
                            className="p-1 rounded-full hover:bg-red-100 text-[#3f4852] hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Social Post Preview (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Live Preview Header & Toolbar */}
            <div className="stitch-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${generated ? "bg-[#1E9E6A]" : "bg-[#dfec42]"} animate-pulse`}></div>
                <span className="text-base font-extrabold text-[#001e2d]">Live Preview</span>
                <span className="bg-[#eaf5ff] px-3 py-1 rounded-full text-xs text-[#00629e] font-bold">
                  {platform.toUpperCase()} Broadcast
                </span>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!generated}
                  onClick={() => copyToClipboard(activeVariantBody, "copy-main")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f5faff] hover:bg-[#def0ff] text-[#001e2d] text-xs font-bold transition-all cursor-pointer disabled:opacity-40 border border-[#def0ff]"
                >
                  {copiedKey === "copy-main" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!generated}
                  onClick={() => setIsEditingCopy(!isEditingCopy)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-40 border border-[#def0ff] ${
                    isEditingCopy
                      ? "bg-[#0099f2] text-white shadow-xs"
                      : "bg-[#f5faff] hover:bg-[#def0ff] text-[#001e2d]"
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditingCopy ? "Done Editing" : "Edit Copy"}</span>
                </button>

                <button
                  type="button"
                  disabled={!generated}
                  onClick={handleSaveDraft}
                  className="stitch-btn-highlight !px-4 !py-2 !text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
              </div>
            </div>

            {/* Empty State vs Skeleton vs Live Mockup */}
            {generating ? (
              <div className="stitch-card p-12 text-center flex flex-col items-center justify-center space-y-4 animate-pulse">
                <Loader2 className="w-12 h-12 animate-spin text-[#0099f2]" />
                <h3 className="text-base font-bold text-[#001e2d]">
                  Synthesizing with Groq LLM...
                </h3>
                <p className="text-xs text-[#3f4852] max-w-sm leading-relaxed">
                  Grounding copy strictly in real evidence posts and priority telemetry without hallucinating facts.
                </p>
                {focusedQuestion && (
                  <div className="px-3 py-1.5 rounded-full bg-[#dfec42] text-[#001e2d] text-xs font-extrabold max-w-md truncate">
                    Targeting Learner Question: &quot;{focusedQuestion}&quot;
                  </div>
                )}
              </div>
            ) : !generated ? (
              /* REQUIRED EMPTY STATE */
              <div className="stitch-card p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#eaf5ff] text-[#0099f2] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">campaign</span>
                </div>
                <h3 className="text-lg font-bold text-[#001e2d]">
                  Pick a topic or opportunity and press Generate.
                </h3>
                <p className="text-xs text-[#3f4852] max-w-md leading-relaxed">
                  Choose a topic from the parameters panel and click &quot;Generate Campaign Options&quot; to synthesize evidence-backed copy with real trend telemetry.
                </p>
                {(selectedTopic || searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    className="stitch-btn-primary"
                  >
                    Generate Campaign for {searchQuery.trim() || selectedTopic}
                  </button>
                )}
              </div>
            ) : (
              /* The Live Social Post Preview */
              <div className="stitch-card overflow-hidden shadow-azure-card border border-[#def0ff]">
                {/* Mandatory Review Badge & Fallback Badge */}
                <div className="bg-[#dfec42] px-6 py-2.5 flex flex-wrap items-center justify-between text-[#001e2d] text-xs font-extrabold border-b border-[#909a00] gap-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0099f2] animate-pulse"></span>
                    AI generated draft. Please review before publishing.
                  </span>
                  <div className="flex items-center gap-3">
                    {evidencePack && !evidencePack.has_live_data && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        No live data found for this topic. Draft is general.
                      </span>
                    )}
                    {generated.model_used && (
                      <span className="text-[11px] font-semibold text-[#001e2d]/80">
                        Engine: {generated.model_used}
                      </span>
                    )}
                  </div>
                </div>

                {/* Multi-Channel Platform Tabs (if multi_channel selected) */}
                {platform === "multi_channel" && (
                  <div className="bg-[#f5faff] px-6 pt-3 flex items-center gap-2 border-b border-[#def0ff] overflow-x-auto">
                    {[
                      { id: "linkedin", label: "LinkedIn Post" },
                      { id: "instagram", label: "Instagram Caption" },
                      { id: "youtube_shorts", label: "YouTube Shorts Script" },
                      { id: "whatsapp", label: "WhatsApp Broadcast" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMultiChannelTab(tab.id)}
                        className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x ${
                          multiChannelTab === tab.id
                            ? "bg-white text-[#0099f2] border-[#def0ff] shadow-xs"
                            : "bg-transparent text-[#3f4852] border-transparent hover:text-[#001e2d]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Platform Chrome Mockup Header */}
                <div className="bg-[#eaf5ff] px-6 py-4 flex items-center justify-between border-b border-[#def0ff]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full p-1 bg-white shadow-sm flex items-center justify-center">
                      <img
                        alt="Tata STRIVE Logo"
                        className="h-6 w-auto object-contain"
                        src="https://lh3.googleusercontent.com/aida/AEtjO1Wy0sTWpbT_LtKBu4hDKid02X-VEQ0T87quOrSaeutsqFmzMXp7y7UjFwAetzMWkerF3lSWGNhmvITl-xqlpOitZ9UQRsv5hb51MPH7ikDVruQfCV6_g5GuuJ-nOj-NrjWzlXKrjdRoD0b-A8J5x-CaSlYpSsL18yQIXY25SCE7ksSo9iDspduJmoE-iTNb2vpJqXIhQ87axP-p-9M5zvP76JW4V-hpLZuCh4rK56cSm4uCEb8XmLYI08k"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-[#001e2d]">Tata STRIVE</span>
                        <span
                          className="material-symbols-outlined text-[#0099f2] text-[18px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#3f4852] font-medium">
                        <span>{targetAudience}</span>
                        <span>•</span>
                        <span>Just now</span>
                        <span>•</span>
                        <span className="material-symbols-outlined text-[14px]">public</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1E9E6A]"></span>
                    <span className="text-[11px] text-[#3f4852] font-bold uppercase tracking-wider">
                      {platform === "multi_channel" ? multiChannelTab.toUpperCase() : platform.toUpperCase()} Mockup
                    </span>
                  </div>
                </div>

                {/* Post Content Body */}
                <div className="p-6 sm:p-8 flex flex-col gap-5 bg-white">
                  {/* Headline */}
                  {generated.headline && (
                    <h3 className="text-lg font-black text-[#001e2d] leading-snug">
                      {generated.headline}
                    </h3>
                  )}

                  {/* Body text (or inline editor) */}
                  {isEditingCopy ? (
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={8}
                      className="w-full p-4 rounded-xl border border-[#0099f2] text-sm text-[#001e2d] font-sans leading-relaxed focus:outline-none"
                    />
                  ) : (
                    <div className="text-sm sm:text-base text-[#001e2d] leading-relaxed whitespace-pre-line font-medium">
                      {activeVariantBody}
                    </div>
                  )}

                  {/* Hashtags Section */}
                  {generated.hashtags && generated.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {generated.hashtags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs font-bold text-[#00629e] bg-[#eaf5ff] px-2.5 py-1 rounded-full"
                        >
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Visual Suggestion Text Card / Image Card */}
                  <div className="mt-2 rounded-2xl overflow-hidden bg-[#f5faff] border border-[#def0ff] shadow-sm">
                    {uploadedImage ? (
                      <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                        <img
                          src={uploadedImage}
                          alt="User uploaded creative"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedImage(null)}
                          className="absolute top-3 right-3 px-3 py-1 bg-black/70 hover:bg-black text-white text-xs rounded-full font-bold cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      /* REQUIRED VISUAL SUGGESTION CARD */
                      <div className="p-5 sm:p-6 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#00629e] uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-[#0099f2]" />
                            Suggested Visual Concept
                          </span>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-[#0099f2] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Custom Graphic</span>
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </div>

                        <p className="text-xs sm:text-sm text-[#001e2d] font-semibold italic bg-white p-4 rounded-xl border border-[#def0ff] leading-relaxed">
                          &quot;{generated.visual_suggestion || "A professional documentary-style photo of youth working with high-voltage test benches in Tata STRIVE technical labs."}&quot;
                        </p>
                      </div>
                    )}

                    {/* Official CTA Bar */}
                    <div className="p-4 bg-[#eaf5ff] border-t border-[#def0ff] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#3f4852] uppercase font-bold tracking-wider">
                          Official Call to Action
                        </span>
                        <span className="text-xs sm:text-sm text-[#001e2d] font-extrabold">
                          {generated.cta || "Register for the upcoming cohort at [Enrol link]"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generated.cta, "cta-copy")}
                        className="px-4 py-2 rounded-full stitch-btn-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>{copiedKey === "cta-copy" ? "Copied" : "Copy CTA"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. REMOVE THE FAKE ENGAGEMENT ROW (Stop rendering 428 interested, 86 shares, 31 questions) */}
                  {/* LEGACY INVENTED ENGAGEMENT ROW — COMMENTED OUT PER INSTRUCTIONS */}
                  {/*
                  <div className="flex items-center justify-between pt-3 text-[#3f4852] text-xs font-semibold border-t border-[#def0ff]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#0099f2] text-[18px]">thumb_up</span>
                        428 interested
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#0099f2] text-[18px]">share</span>
                        86 shares
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#00629e] text-[18px]">forum</span>
                        31 questions
                      </span>
                    </div>
                    <span className="text-[#3f4852]">Target: {targetAudience}</span>
                  </div>
                  */}

                  {/* REAL FEEDBACK LINE: Target Audience + Real Character Count against platform limit + Estimated Reading Time */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs font-semibold border-t border-[#def0ff]">
                    <span className="text-[#3f4852] font-medium">
                      Target: <strong className="text-[#001e2d] font-bold">{targetAudience}</strong>
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className={`font-mono font-bold ${charCount > platformLimit ? "text-rose-600" : "text-[#001e2d]"}`}>
                        {charCount} / {platformLimit} characters
                      </span>
                      <span className="text-[#def0ff]">•</span>
                      <span className="flex items-center gap-1 text-[#00629e] font-bold">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        {estimatedReadingTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grounding Source Evidence Panel */}
            {currentOpp && (
              <div className="stitch-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowBasedOn(!showBasedOn)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-extrabold text-[#00629e] bg-[#f5faff] hover:bg-[#eaf5ff] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#0099f2]" />
                    <span>
                      Evidence Grounding: &quot;{currentOpp.title}&quot; (Priority Score: {currentOpp.score}/100)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#3f4852]">
                    <span>{showBasedOn ? "Hide supporting posts" : "Show supporting original posts"}</span>
                    {showBasedOn ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showBasedOn && (
                  <div className="p-5 border-t border-[#def0ff] space-y-4 bg-white">
                    <div className="p-3.5 bg-[#eaf5ff] rounded-2xl text-xs space-y-1 border border-[#cae6fb]">
                      <span className="font-bold text-[#00629e]">
                        Strategic Rationale for Tata STRIVE:
                      </span>
                      <p className="text-[#001e2d] font-medium leading-relaxed">
                        {currentOpp.why_it_matters}
                      </p>
                    </div>
                    <EvidencePosts postIds={currentOpp.supporting_post_ids} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function ContentStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#3f4852] font-semibold">Loading content studio...</div>}>
      <StudioContent />
    </Suspense>
  );
}
