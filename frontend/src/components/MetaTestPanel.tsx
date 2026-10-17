"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Key,
  Layers,
  FileText,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MetaConfigStatus, MetaUser, MetaPage, MetaPost, MetaApiError } from "@/lib/meta";

interface MetaTestPanelProps {
  onClose?: () => void;
  initiallyExpanded?: boolean;
}

export function MetaTestPanel({ onClose, initiallyExpanded = true }: MetaTestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Status State
  const [statusLoading, setStatusLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<MetaConfigStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Test 1: Verify Token State
  const [test1Loading, setTest1Loading] = useState(false);
  const [test1User, setTest1User] = useState<MetaUser | null>(null);
  const [test1Error, setTest1Error] = useState<MetaApiError | null>(null);

  // Test 2: List Pages State
  const [test2Loading, setTest2Loading] = useState(false);
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [test2Run, setTest2Run] = useState(false);
  const [test2Error, setTest2Error] = useState<MetaApiError | null>(null);

  // Test 3: Read Posts State
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [test3Loading, setTest3Loading] = useState(false);
  const [posts, setPosts] = useState<MetaPost[]>([]);
  const [test3Run, setTest3Run] = useState(false);
  const [test3Error, setTest3Error] = useState<MetaApiError | null>(null);

  // 1. Fetch Configuration Status
  const checkStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/meta/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MetaConfigStatus = await res.json();
      setConfigStatus(data);
    } catch (err: any) {
      setStatusError(err.message || "Failed to query /api/meta/status");
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // 2. Test 1: Verify User Token via GET /me
  const runTest1 = async () => {
    setTest1Loading(true);
    setTest1Error(null);
    setTest1User(null);
    try {
      const res = await fetch("/api/meta/test");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTest1Error(data.error || { message: "Failed to verify token" });
      } else {
        setTest1User(data.user);
      }
    } catch (err: any) {
      setTest1Error({ message: err.message || "Network request failed" });
    } finally {
      setTest1Loading(false);
    }
  };

  // 3. Test 2: List Accessible Pages via GET /me/accounts
  const runTest2 = async () => {
    setTest2Loading(true);
    setTest2Error(null);
    setTest2Run(true);
    try {
      const res = await fetch("/api/meta/pages");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTest2Error(data.error || { message: "Failed to fetch pages" });
        setPages([]);
      } else {
        setPages(data.pages || []);
        if (data.pages && data.pages.length > 0 && !selectedPageId) {
          setSelectedPageId(data.pages[0].id);
        }
      }
    } catch (err: any) {
      setTest2Error({ message: err.message || "Network request failed" });
      setPages([]);
    } finally {
      setTest2Loading(false);
    }
  };

  // 4. Test 3: Read Page Posts via GET /{PAGE_ID}/posts
  const runTest3 = async () => {
    if (!selectedPageId) return;
    setTest3Loading(true);
    setTest3Error(null);
    setTest3Run(true);
    try {
      const res = await fetch(`/api/meta/pages/${encodeURIComponent(selectedPageId)}/posts`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTest3Error(data.error || { message: "Failed to fetch page posts" });
        setPosts([]);
      } else {
        setPosts(data.posts || []);
      }
    } catch (err: any) {
      setTest3Error({ message: err.message || "Network request failed" });
      setPosts([]);
    } finally {
      setTest3Loading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#008FD3]/30 shadow-md overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#0067A5] to-[#008FD3] text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight">Meta Graph API Test & Diagnostics Panel</h3>
              <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                {configStatus?.version || "v21.0"}
              </span>
            </div>
            <p className="text-[11px] text-blue-100">
              Secure server-side diagnostic suite for Facebook Page access and permission verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 cursor-pointer transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* SECTION 1: Connection & Credentials Status */}
          <section className="bg-[#F5F7F9] rounded-xl p-4 border border-[#E5E7EB] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#0067A5]" />
                <h4 className="text-xs font-bold text-[#252525] uppercase tracking-wide">
                  1. Server-Side Credentials & Connection Status
                </h4>
              </div>
              <button
                onClick={checkStatus}
                disabled={statusLoading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0067A5] hover:text-[#005588] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${statusLoading ? "animate-spin" : ""}`} />
                <span>Recheck Status</span>
              </button>
            </div>

            {configStatus ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* META_APP_ID */}
                <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#666666]">META_APP_ID</span>
                    {configStatus.hasAppId ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded">
                        <AlertCircle className="w-2.5 h-2.5" /> Missing
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono font-semibold text-[#252525] mt-1">
                    {configStatus.appIdMasked || "Not Set"}
                  </p>
                </div>

                {/* META_APP_SECRET */}
                <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#666666]">META_APP_SECRET</span>
                    {configStatus.hasAppSecret ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Secured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                        <AlertCircle className="w-2.5 h-2.5" /> Optional
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[#666666] mt-1">
                    {configStatus.hasAppSecret ? "•••••••••••••••• (Hidden)" : "Not Configured"}
                  </p>
                </div>

                {/* META_ACCESS_TOKEN */}
                <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#666666]">META_ACCESS_TOKEN</span>
                    {configStatus.hasAccessToken ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded">
                        <AlertCircle className="w-2.5 h-2.5" /> Missing
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[#666666] mt-1">
                    {configStatus.hasAccessToken ? "•••••••••••••••• (Server-only)" : "Not Configured"}
                  </p>
                </div>
              </div>
            ) : statusLoading ? (
              <div className="flex items-center gap-2 text-xs text-[#666666] py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0067A5]" />
                <span>Checking server environment variables...</span>
              </div>
            ) : statusError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {statusError}
              </div>
            ) : null}

            {!configStatus?.configured && (
              <div className="bg-[#DCEFF7] border border-[#008FD3]/40 rounded-lg p-3 text-xs text-[#0067A5] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-3.5 h-3.5" />
                  <span>Missing Credentials Setup Instructions</span>
                </div>
                <p className="text-[11px] text-[#252525]">
                  Add your Meta credentials to <code className="bg-white px-1.5 py-0.5 rounded text-[#0067A5] font-mono">.env.local</code>:
                </p>
                <pre className="bg-white p-2 rounded text-[10px] font-mono text-[#252525] border border-[#008FD3]/20 overflow-x-auto">
{`META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_user_access_token`}
                </pre>
              </div>
            )}
          </section>

          {/* SECTION 2: TEST 1 - Verify User Token */}
          <section className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0067A5] text-white flex items-center justify-center text-[11px] font-bold">
                    1
                  </span>
                  <h4 className="text-xs font-bold text-[#252525]">
                    Test 1: Verify User Token via Graph API
                  </h4>
                </div>
                <p className="text-[11px] text-[#666666] ml-7">
                  Calls official Meta Graph endpoint <code className="font-mono text-[#0067A5]">GET /me?fields=id,name</code>.
                </p>
              </div>

              <button
                id="btn-meta-verify-token"
                type="button"
                onClick={runTest1}
                disabled={test1Loading || !configStatus?.hasAccessToken}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A5] hover:bg-[#005588] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                {test1Loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify Token (/me)</span>
                  </>
                )}
              </button>
            </div>

            {test1User && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>User Token Verified Successfully!</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-emerald-200/60">
                  <div>
                    <span className="text-[10px] text-emerald-700 font-medium">User Name:</span>
                    <p className="font-bold text-[#252525] text-sm">{test1User.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 font-medium">Facebook User ID:</span>
                    <p className="font-mono font-semibold text-[#252525] text-xs">{test1User.id}</p>
                  </div>
                </div>
              </div>
            )}

            {test1Error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-red-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Token Verification Failed</span>
                </div>
                <p className="text-red-700 text-[11px]">{test1Error.message}</p>
                {test1Error.helpGuidance && (
                  <p className="text-[11px] text-red-900 bg-red-100/60 p-2 rounded">
                    <strong>Resolution:</strong> {test1Error.helpGuidance}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* SECTION 3: TEST 2 - List Accessible Pages */}
          <section className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0067A5] text-white flex items-center justify-center text-[11px] font-bold">
                    2
                  </span>
                  <h4 className="text-xs font-bold text-[#252525]">
                    Test 2: List Accessible Facebook Pages
                  </h4>
                </div>
                <p className="text-[11px] text-[#666666] ml-7">
                  Calls <code className="font-mono text-[#0067A5]">GET /me/accounts?fields=name,id</code> to discover managed Pages.
                </p>
              </div>

              <button
                id="btn-meta-fetch-pages"
                type="button"
                onClick={runTest2}
                disabled={test2Loading || !configStatus?.hasAccessToken}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A5] hover:bg-[#005588] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                {test2Loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching Pages...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    <span>Fetch Pages (/me/accounts)</span>
                  </>
                )}
              </button>
            </div>

            {test2Run && !test2Loading && (
              <>
                {pages.length > 0 ? (
                  <div className="space-y-2 animate-in fade-in">
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Found {pages.length} authorized Page{pages.length > 1 ? "s" : ""}:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pages.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPageId(p.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedPageId === p.id
                              ? "bg-[#DCEFF7] border-[#008FD3] ring-1 ring-[#008FD3]"
                              : "bg-white border-[#E5E7EB] hover:border-[#008FD3]/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#252525]">{p.name}</span>
                            {selectedPageId === p.id && (
                              <span className="text-[10px] font-bold text-[#0067A5] bg-white px-1.5 py-0.2 rounded border border-[#008FD3]/30">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#666666] block mt-1">
                            Page ID: {p.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                      <Info className="w-4 h-4 text-amber-600" />
                      <span>0 Managed Pages Returned (Expected with New Test App)</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Your User Token is authenticated and includes the <code className="font-semibold bg-white px-1 rounded">pages_show_list</code> permission, but no Pages are managed by this account.
                    </p>
                    <p className="text-[11px] text-amber-800 pt-1">
                      <strong>To test Page post reading:</strong> Create a test Page on Facebook or add this user as an Admin of a Page in <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-[#0067A5]">Meta for Developers</a>.
                    </p>
                  </div>
                )}
              </>
            )}

            {test2Error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-red-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Failed to Retrieve Pages</span>
                </div>
                <p className="text-red-700 text-[11px]">{test2Error.message}</p>
                {test2Error.helpGuidance && (
                  <p className="text-[11px] text-red-900 bg-red-100/60 p-2 rounded">
                    <strong>Resolution:</strong> {test2Error.helpGuidance}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* SECTION 4: TEST 3 - Read Page Posts */}
          <section className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0067A5] text-white flex items-center justify-center text-[11px] font-bold">
                    3
                  </span>
                  <h4 className="text-xs font-bold text-[#252525]">
                    Test 3: Read Page Posts
                  </h4>
                </div>
                <p className="text-[11px] text-[#666666] ml-7">
                  Calls <code className="font-mono text-[#0067A5]">GET /&#123;PAGE_ID&#125;/posts?fields=message,created_time,permalink_url&amp;limit=10</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <input
                  id="input-meta-page-id"
                  type="text"
                  placeholder="Enter or select Page ID"
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-mono w-48 focus:outline-none focus:ring-1 focus:ring-[#0067A5]"
                />
                <button
                  id="btn-meta-read-posts"
                  type="button"
                  onClick={runTest3}
                  disabled={test3Loading || !selectedPageId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0067A5] hover:bg-[#005588] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {test3Loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reading...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>Read Posts</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {test3Run && !test3Loading && (
              <>
                {posts.length > 0 ? (
                  <div className="space-y-2 animate-in fade-in">
                    <p className="text-[11px] font-semibold text-[#252525]">
                      Retrieved {posts.length} post{posts.length > 1 ? "s" : ""}:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className="p-3 bg-white rounded-lg border border-[#E5E7EB] text-xs space-y-1.5"
                        >
                          <p className="text-[#252525] line-clamp-3">
                            {post.message || <span className="italic text-[#666666]">No text content (Media post)</span>}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-[#666666] pt-1 border-t border-gray-100">
                            <span>{new Date(post.created_time).toLocaleString()}</span>
                            {post.permalink_url && (
                              <a
                                href={post.permalink_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#0067A5] font-semibold hover:underline"
                              >
                                <span>View on Facebook</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !test3Error ? (
                  <p className="text-xs text-[#666666] italic">0 posts found on this Page.</p>
                ) : null}
              </>
            )}

            {test3Error && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Permission or Authorization Required for Page Posts</span>
                </div>
                <p className="text-amber-900 text-[11px] leading-relaxed">{test3Error.message}</p>
                {test3Error.helpGuidance && (
                  <div className="bg-white p-2.5 rounded border border-amber-200/80 text-[11px] text-[#252525] space-y-1">
                    <p className="font-semibold text-amber-900">How to Configure in Meta for Developers:</p>
                    <p>{test3Error.helpGuidance}</p>
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href="https://developers.facebook.com/tools/explorer/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0067A5] underline"
                      >
                        <span>Open Graph API Explorer</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="text-gray-300">|</span>
                      <a
                        href="https://developers.facebook.com/docs/graph-api/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0067A5] underline"
                      >
                        <span>Official Graph API Docs</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECTION 5: Permissions & Platform Limitations Notice */}
          <section className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100 text-[11px] text-[#666666] space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#0067A5] font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Facebook Graph API Scope & Limitations Guide</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[#252525]">
              <li>
                <strong>Current Token Scope:</strong> Your User Token includes <code className="font-semibold text-[#0067A5] bg-white px-1 py-0.2 rounded border border-blue-200">pages_show_list</code>, allowing discovery of Page names and IDs.
              </li>
              <li>
                <strong>Page Post Access:</strong> Reading Page feed messages and reactions requires <code className="font-semibold text-[#0067A5] bg-white px-1 py-0.2 rounded border border-blue-200">pages_read_engagement</code> and/or <code className="font-semibold text-[#0067A5] bg-white px-1 py-0.2 rounded border border-blue-200">pages_read_user_content</code>.
              </li>
              <li>
                <strong>No Public Post Scraping:</strong> Meta Graph API strictly prevents open web-wide public keyword search across private user timelines (unlike AT Protocol Bluesky or GDELT). It is designed for authorized Page administration and business intelligence.
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
