"use client";

import React, { useState, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { AppSettings } from "@/types";
import {
  Database,
  Radio,
  Sparkles,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Save,
  Undo2,
  Sliders,
  Layers,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"sources" | "collection" | "ai" | "account">("sources");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    account: {
      display_name: "STRIVE Analyst",
      email: "analyst@tatastrive.org",
      organization: "Tata STRIVE",
      role: "Lead Skill Strategist",
      avatar_initials: "AS",
      session_status: "Active Local Session",
      auth_configured: false,
      auth_note: "Single-Tenant Local Session (OAuth / SSO not configured in environment)",
    },
    appearance: {
      theme: "light",
      density: "comfortable",
    },
    data_collection: {
      refresh_interval_minutes: 60,
      auto_sync_enabled: true,
      monitored_topics: [
        "ai-and-digital-skills",
        "ev-diagnostics",
        "solar-pv",
        "vocational-training",
        "employability",
        "internships-and-placements",
        "entrepreneurship",
        "youth-education",
        "industrial-iot-plc",
        "green-hydrogen",
        "tele-health-gda",
        "drone-technology",
      ],
      keywords: [
        "Tata STRIVE",
        "skill development",
        "vocational training",
        "placement guarantee",
        "EV technician training",
        "solar rooftop installation",
        "apprentice stipend scheme",
      ],
      sentiment_threshold: 0.65,
    },
    ai_analysis: {
      model_name: "qwen/qwen3.8-27b",
      default_tone: "inspirational",
      default_language: "en",
      strict_factual_grounding: true,
      zero_hallucination_mode: true,
      api_configured: true,
    },
  });

  const [initialSettings, setInitialSettings] = useState<AppSettings | null>(null);
  const [sourcesHealth, setSourcesHealth] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, healthRes] = await Promise.allSettled([
        api.getSettings(),
        api.getSourcesHealth(),
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value?.settings) {
        setSettings(settingsRes.value.settings);
        setInitialSettings(settingsRes.value.settings);
      }
      if (healthRes.status === "fulfilled" && healthRes.value?.integrations) {
        setSourcesHealth(healthRes.value.integrations);
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check hash anchor
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "sources" || hash === "collection" || hash === "ai" || hash === "account") {
        setActiveTab(hash);
      }
    }
  }, []);

  const handleTestHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.getSourcesHealth();
      if (res?.integrations) {
        setSourcesHealth(res.integrations);
        setSaveMessage({ type: "success", text: "Source health status updated successfully." });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Failed to query live source health." });
    } finally {
      setHealthLoading(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.saveSettings(settings);
      setSaveMessage({ type: "success", text: res.message || "Settings saved and persisted to database." });
      setInitialSettings(JSON.parse(JSON.stringify(settings)));
    } catch (e: any) {
      setSaveMessage({ type: "error", text: e?.message || "Failed to persist settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleReset = () => {
    if (initialSettings) {
      setSettings(JSON.parse(JSON.stringify(initialSettings)));
      setSaveMessage({ type: "success", text: "Reverted unsaved changes." });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !settings.data_collection.keywords.includes(trimmed)) {
      setSettings((prev) => ({
        ...prev,
        data_collection: {
          ...prev.data_collection,
          keywords: [...prev.data_collection.keywords, trimmed],
        },
      }));
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setSettings((prev) => ({
      ...prev,
      data_collection: {
        ...prev.data_collection,
        keywords: prev.data_collection.keywords.filter((k) => k !== kw),
      },
    }));
  };

  const toggleTopic = (topicId: string) => {
    setSettings((prev) => {
      const exists = prev.data_collection.monitored_topics.includes(topicId);
      const updated = exists
        ? prev.data_collection.monitored_topics.filter((t) => t !== topicId)
        : [...prev.data_collection.monitored_topics, topicId];
      return {
        ...prev,
        data_collection: {
          ...prev.data_collection,
          monitored_topics: updated,
        },
      };
    });
  };

  const ALL_TAXONOMY_TOPICS = [
    { id: "ai-and-digital-skills", name: "AI & Digital Skills" },
    { id: "ev-diagnostics", name: "Electric Vehicles (EV)" },
    { id: "solar-pv", name: "Solar PV Installation" },
    { id: "vocational-training", name: "Vocational & Trade Training" },
    { id: "employability", name: "Employability & Career Prep" },
    { id: "internships-and-placements", name: "Apprenticeships & NAPS" },
    { id: "entrepreneurship", name: "Micro-Entrepreneurship (Mudra)" },
    { id: "youth-education", name: "Youth Guidance & Counseling" },
    { id: "industrial-iot-plc", name: "Industrial IoT & Automation" },
    { id: "green-hydrogen", name: "Green Hydrogen Technology" },
    { id: "tele-health-gda", name: "Healthcare & General Duty Asst" },
    { id: "drone-technology", name: "Drone Assembly & Pilot Training" },
  ];

  if (loading) {
    return (
      <>
        <Topbar pageTitle="Settings" />
        <main className="pt-24 px-6 md:px-8 pb-16 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-[#eaf5ff] flex items-center justify-center mb-4 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0099f2]" />
          </div>
          <h3 className="font-bold text-lg text-[#001e2d]">Loading Workspace Settings</h3>
          <p className="mt-1 text-xs text-[#3f4852]">
            Reading connector health status, taxonomy configurations &amp; stored settings...
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar pageTitle="Settings" />

      <main className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto w-full space-y-6 animate-fade-in-up">
        {/* Header Title Banner */}
        <section className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2ecff] text-[#001e2d] text-xs font-bold">
                <Sliders className="w-3.5 h-3.5 text-[#0099f2]" />
                System Preferences
              </span>
              <span className="text-xs text-[#3f4852] font-semibold">
                Single Source of Truth Configuration
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#001e2d] tracking-tight">
              Settings &amp; Integration Hub
            </h1>
            <p className="text-sm text-[#3f4852] mt-1 max-w-2xl leading-relaxed">
              Manage live data connector integrations, polling cadences, factual AI guardrails, and your analyst workspace credentials.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#3f4852] hover:text-[#001e2d] border border-[#0099f2]/15 text-xs font-bold transition-all shadow-2xs hover:bg-[#f5fafd] cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSettings}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-bold transition-all shadow-azure-card hover:shadow-azure-hover cursor-pointer ${
                saving ? "bg-[#0099f2]/70 cursor-wait" : "bg-[#0099f2] hover:bg-[#0088d8]"
              }`}
            >
              <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
            </button>
          </div>
        </section>

        {/* Status Toast Banner */}
        {saveMessage && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
              saveMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {saveMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#0099f2]/10 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "sources"
                ? "bg-[#0099f2] text-white shadow-sm"
                : "bg-[#eaf5ff] text-[#00629e] hover:bg-[#def0ff]"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>A. Data Sources</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("collection")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "collection"
                ? "bg-[#0099f2] text-white shadow-sm"
                : "bg-[#eaf5ff] text-[#00629e] hover:bg-[#def0ff]"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>B. Data Collection &amp; Polling</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "ai"
                ? "bg-[#0099f2] text-white shadow-sm"
                : "bg-[#eaf5ff] text-[#00629e] hover:bg-[#def0ff]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>C. AI Analysis (Groq)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "account"
                ? "bg-[#0099f2] text-white shadow-sm"
                : "bg-[#eaf5ff] text-[#00629e] hover:bg-[#def0ff]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>D. Account &amp; Appearance</span>
          </button>
        </div>

        {/* SECTION A: Data Sources */}
        {activeTab === "sources" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#0099f2]/10 shadow-azure-card">
              <div>
                <h3 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#0099f2]" />
                  Active Data Connectors &amp; Health Checks
                </h3>
                <p className="text-xs text-[#3f4852] mt-1">
                  Live status and authentication states for connected social, video, and news platforms.
                </p>
              </div>
              <button
                type="button"
                disabled={healthLoading}
                onClick={handleTestHealth}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eaf5ff] hover:bg-[#def0ff] text-[#00629e] text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin text-[#0099f2]" : ""}`} />
                <span>{healthLoading ? "Checking Health..." : "Re-test Connection Health"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sourcesHealth.map((src) => (
                <div
                  key={src.id}
                  className="bg-white p-5 rounded-2xl border border-[#0099f2]/10 shadow-azure-card flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-[#001e2d] text-sm">{src.name}</h4>
                        <span className="text-[11px] text-[#6f7883] font-medium block mt-0.5">
                          {src.type}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          src.status === "online"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            src.status === "online" ? "bg-emerald-600" : "bg-amber-600"
                          }`}
                        ></span>
                        {src.status_label || (src.status === "online" ? "Online" : "Config Required")}
                      </span>
                    </div>

                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px] bg-[#f5fafd] p-3 rounded-xl border border-[#0099f2]/10">
                      <div>
                        <span className="text-[#6f7883] block">Polling Support:</span>
                        <span className="font-bold text-[#001e2d]">
                          {src.supports_polling ? "Supported (Hourly)" : "On-Demand"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6f7883] block">Records Ingested:</span>
                        <span className="font-bold text-[#001e2d]">
                          {(src.stored_records || 0).toLocaleString()} stored
                        </span>
                      </div>
                      <div className="col-span-2 mt-1 pt-1 border-t border-[#0099f2]/10">
                        <span className="text-[#6f7883] block">Rate Limit / Policy:</span>
                        <span className="font-medium text-[#00629e]">{src.rate_limit_info}</span>
                      </div>
                    </div>

                    {src.error_message && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{src.error_message}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#0099f2]/10 flex items-center justify-between text-[11px] text-[#6f7883]">
                    <span>
                      Last Synced:{" "}
                      <strong className="text-[#001e2d]">
                        {src.last_sync
                          ? new Date(src.last_sync).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Pending Sync"}
                      </strong>
                    </span>
                    <span className="font-bold text-[#0099f2] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Read-only Public Ingest
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION B: Data Collection & Polling */}
        {activeTab === "collection" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#0099f2]/10 shadow-azure-card space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                  <Radio className="w-5 h-5 text-[#0099f2]" />
                  Scheduled Synchronization &amp; Polling Rules
                </h3>
                <p className="text-xs text-[#3f4852] mt-1">
                  Configure refresh intervals compliant with YouTube API quota budgets and public news RSS limitations.
                </p>
              </div>

              {/* Refresh Interval Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Background Refresh Interval
                  </label>
                  <select
                    value={settings.data_collection.refresh_interval_minutes}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        data_collection: {
                          ...prev.data_collection,
                          refresh_interval_minutes: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  >
                    <option value={15}>Every 15 Minutes (Active Event Mode)</option>
                    <option value={30}>Every 30 Minutes</option>
                    <option value={60}>Every 1 Hour (Recommended Default)</option>
                    <option value={360}>Every 6 Hours</option>
                    <option value={0}>Manual Only (No background polling)</option>
                  </select>
                  <p className="mt-1.5 text-[11px] text-[#6f7883]">
                    YouTube v3 provides 10,000 units/day. 1-hour cadence consumes ~1,440 units/day (well within safe limits).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Sentiment Sensitivity Threshold
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={0.9}
                    step={0.05}
                    value={settings.data_collection.sentiment_threshold}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        data_collection: {
                          ...prev.data_collection,
                          sentiment_threshold: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full h-2 bg-[#eaf5ff] rounded-lg appearance-none cursor-pointer accent-[#0099f2] mt-3"
                  />
                  <div className="flex justify-between text-[11px] text-[#6f7883] mt-1 font-semibold">
                    <span>Balanced (0.50)</span>
                    <span className="text-[#0099f2] font-bold">
                      Current: {settings.data_collection.sentiment_threshold}
                    </span>
                    <span>High Precision (0.90)</span>
                  </div>
                </div>
              </div>

              {/* Polling Capability Notice */}
              <div className="p-4 rounded-xl bg-[#eaf5ff] border border-[#0099f2]/15 text-xs text-[#00629e] space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-[#001e2d]">
                  <Clock className="w-4 h-4 text-[#0099f2]" />
                  Connector Polling Behavior
                </span>
                <p className="text-[11px] text-[#3f4852] leading-relaxed">
                  <strong>YouTube, Google News, and Bluesky</strong> support continuous polling via public endpoints. <strong>Google Places</strong> is queried on-demand when inspecting specific Tata STRIVE physical training institutes to prevent unnecessary billing.
                </p>
              </div>
            </div>

            {/* Monitored Search Keywords */}
            <div className="bg-white p-6 rounded-2xl border border-[#0099f2]/10 shadow-azure-card space-y-4">
              <h3 className="text-base font-bold text-[#001e2d]">
                Monitored Query Keywords
              </h3>
              <p className="text-xs text-[#3f4852]">
                These phrases are monitored across connected public feeds to ingest relevant skilling discussions.
              </p>

              <div className="flex flex-wrap gap-2">
                {settings.data_collection.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d]"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="w-4 h-4 rounded-full bg-[#eaf5ff] hover:bg-[#def0ff] text-[#00629e] inline-flex items-center justify-center text-[10px] cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 max-w-md pt-2">
                <input
                  type="text"
                  placeholder="Add new keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="px-4 py-2 rounded-xl bg-[#0099f2] text-white text-xs font-bold hover:bg-[#0088d8] transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Monitored Topic Categories */}
            <div className="bg-white p-6 rounded-2xl border border-[#0099f2]/10 shadow-azure-card space-y-4">
              <h3 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0099f2]" />
                Monitored Taxonomy Topics (12 Active Domains)
              </h3>
              <p className="text-xs text-[#3f4852]">
                Active categories classified into the Social Pulse database. Toggle topics to customize ingestion focus.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_TAXONOMY_TOPICS.map((topic) => {
                  const isChecked = settings.data_collection.monitored_topics.includes(topic.id);
                  return (
                    <label
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isChecked
                          ? "bg-[#eaf5ff] border-[#0099f2]/30 text-[#001e2d]"
                          : "bg-white border-slate-200 text-[#6f7883] opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-[#0099f2] focus:ring-[#0099f2]"
                      />
                      <span>{topic.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SECTION C: AI Analysis */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#0099f2]/10 shadow-azure-card space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0099f2]" />
                  Groq High-Speed Inference Engine Configuration
                </h3>
                <p className="text-xs text-[#3f4852] mt-1">
                  Configured AI model and strict factual grounding parameters used by the Campaign Studio and Opportunity Radar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Primary Inference Model
                  </label>
                  <select
                    value={settings.ai_analysis.model_name}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        ai_analysis: { ...prev.ai_analysis, model_name: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  >
                    <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (Fastest, High Adherence - Active)</option>
                    <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Complex Strategy Reasoning)</option>
                  </select>
                  <span className="text-[11px] text-[#6f7883] mt-1 block">
                    Execution speed: ~1.2s per campaign draft with strict JSON validation.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Default Copywriting Tone
                  </label>
                  <select
                    value={settings.ai_analysis.default_tone}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        ai_analysis: { ...prev.ai_analysis, default_tone: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  >
                    <option value="inspirational">Inspirational &amp; Empowering</option>
                    <option value="professional">Professional &amp; Authoritative</option>
                    <option value="friendly">Friendly &amp; Accessible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Default Campaign Language
                  </label>
                  <select
                    value={settings.ai_analysis.default_language}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        ai_analysis: { ...prev.ai_analysis, default_language: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  >
                    <option value="en">English (Official)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="mr">Marathi (मराठी)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="block text-xs font-bold text-[#001e2d] mb-2">
                    Factual Grounding Rules
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="strict_factual"
                      checked={settings.ai_analysis.strict_factual_grounding}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          ai_analysis: {
                            ...prev.ai_analysis,
                            strict_factual_grounding: e.target.checked,
                          },
                        }))
                      }
                      className="rounded text-[#0099f2] focus:ring-[#0099f2]"
                    />
                    <label htmlFor="strict_factual" className="text-xs font-bold text-[#001e2d]">
                      Enforce Zero-Hallucination Guardrail (Recommended)
                    </label>
                  </div>
                  <span className="text-[11px] text-[#6f7883] mt-1 ml-6">
                    Zero invented dates, fees, or metrics. Replaces unknown URLs with [Enrol link].
                  </span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Credential Security Guarantee</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    API keys (such as GROQ_API_KEY) are loaded exclusively by the backend server from gitignored environment files. No secrets or tokens are ever sent to or exposed within the client browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION D: Account & Appearance */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#0099f2]/10 shadow-azure-card space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#001e2d] flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0099f2]" />
                  Analyst Profile &amp; Session Identity
                </h3>
                <p className="text-xs text-[#3f4852] mt-1">
                  Manage display credentials shown in generated strategy briefs, downloaded reports, and the top navigation avatar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={settings.account.display_name}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        account: {
                          ...prev.account,
                          display_name: e.target.value,
                          avatar_initials: e.target.value
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "AS",
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.account.email}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        account: { ...prev.account, email: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={settings.account.organization}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        account: { ...prev.account, organization: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001e2d] mb-1.5">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={settings.account.role}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        account: { ...prev.account, role: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5fafd] border border-[#0099f2]/20 text-xs font-bold text-[#001e2d] focus:outline-none focus:ring-2 focus:ring-[#0099f2]"
                  />
                </div>
              </div>

              {/* Honest Auth State Pill */}
              <div className="p-4 rounded-xl bg-[#f5fafd] border border-[#0099f2]/15 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#001e2d]">Authentication Provider Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    {settings.account.session_status}
                  </span>
                </div>
                <p className="text-[11px] text-[#6f7883] leading-relaxed pt-1">
                  {settings.account.auth_note}
                </p>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-white p-6 rounded-2xl border border-[#0099f2]/10 shadow-azure-card space-y-4">
              <h3 className="text-base font-bold text-[#001e2d]">
                Visual Theme &amp; Density
              </h3>
              <p className="text-xs text-[#3f4852]">
                Customized for the Tata STRIVE Azure Light Design System.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#0099f2]/30 bg-[#eaf5ff] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-[#001e2d] block">
                      Azure Light Mode (Default)
                    </span>
                    <span className="text-[11px] text-[#3f4852]">
                      High contrast, accessible, compliant with Tata STRIVE brand guidelines.
                    </span>
                  </div>
                  <span className="w-4 h-4 rounded-full bg-[#0099f2] ring-4 ring-[#cfe5ff]"></span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between opacity-60">
                  <div>
                    <span className="font-bold text-xs text-slate-700 block">
                      Dark Mode (Preview)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      High-contrast dark mode for low-light command centres.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded text-slate-600">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
