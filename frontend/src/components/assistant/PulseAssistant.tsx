"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePageContext } from "@/context/PageContext";
import {
  assistantApi,
  AssistantChatMessage,
  AssistantChatResponse,
} from "@/lib/assistant-api";
import { ChatMessageItem } from "./ChatMessageItem";
import { SuggestedQuestionsBar } from "./SuggestedQuestionsBar";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Activity,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Info,
  Layers,
  HelpCircle,
} from "lucide-react";

export function PulseAssistant() {
  const { context, suggestedQuestions } = usePageContext();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);

  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => {
    // Initial welcome message from Pulse AI
    return [
      {
        id: "msg_welcome",
        role: "assistant",
        content: `👋 Hello! I am **Pulse AI**, your strategic social intelligence analyst and executive guide for **Tata STRIVE**.\n\nI monitor public student discussions, employer demands, and skilling trends across YouTube, Bluesky, and GDELT News.\n\nI am currently context-aware of **${context.page_name}**. Ask me to explain any chart, analyze sentiment drivers, or generate high-impact youth campaigns!`,
        timestamp: "Just now",
        status: "sent",
      },
    ];
  });

  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeEngine, setActiveEngine] = useState<string>("Grok-ready AI");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch backend assistant engine status on mount
  useEffect(() => {
    assistantApi.getStatus().then((st) => {
      if (st.configured) {
        const prov = st.provider === "xai-grok" ? "xAI Grok" : "Groq Fast Inference";
        setActiveEngine(`${prov} (${st.model})`);
      } else {
        setActiveEngine("Pulse AI Analyst (Context-grounded)");
      }
    });
  }, []);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Adjust textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!text || loading) return;

    const userMessageId = `user_${Date.now()}`;
    const userMsg: AssistantChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res: AssistantChatResponse = await assistantApi.sendChat(
        text,
        [...messages, userMsg],
        context
      );

      const assistantMsg: AssistantChatMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "sent",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AssistantChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an issue processing that query.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "error",
        error: err.message || "Failed to reach AI Assistant service.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: `Conversation cleared. I am ready to analyze **${context.page_name}** with you. What would you like to explore?`,
        timestamp: "Just now",
        status: "sent",
      },
    ]);
  };

  const retryLastMessage = () => {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const text = messages[i].content;
        // Remove trailing error message
        setMessages((prev) => prev.slice(0, i));
        handleSendMessage(text);
        break;
      }
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          type="button"
          aria-label="Open Pulse AI Assistant"
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 bg-[#0067A5] hover:bg-[#005588] text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-white/20 select-none animate-in fade-in"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute -inset-1 rounded-full bg-sky-300 opacity-40 animate-ping"></span>
            <div className="w-7 h-7 rounded-full bg-white text-[#0067A5] flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-[#0067A5]" />
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-tight tracking-tight flex items-center gap-1">
              <span>Pulse AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </span>
            <span className="text-[10px] text-[#DCEFF7] font-medium leading-none">
              Context: {context.page_name.split(" ")[0]}
            </span>
          </div>
        </button>
      )}

      {/* Floating Assistant Drawer / Panel */}
      {isOpen && (
        <aside
          role="complementary"
          aria-label="Pulse AI Assistant Panel"
          className={`fixed z-50 transition-all duration-200 select-none flex flex-col bg-white border border-[#E5E7EB] shadow-2xl rounded-2xl overflow-hidden ${
            isMinimized
              ? "bottom-6 right-6 w-80 h-14"
              : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[450px] h-[calc(100vh-2rem)] sm:h-[680px] max-h-[92vh]"
          }`}
        >
          {/* Header */}
          <div className="h-14 px-4 bg-[#0067A5] border-b border-[#005588] flex items-center justify-between text-white flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white text-[#0067A5] flex items-center justify-center flex-shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 text-[#0067A5]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white leading-tight truncate">
                    Pulse AI
                  </span>
                  <span className="text-[9px] font-semibold bg-white/20 text-white px-1.5 py-0.2 rounded uppercase tracking-wider">
                    Tata STRIVE
                  </span>
                </div>
                <span className="text-[10px] text-[#DCEFF7] truncate">
                  {activeEngine}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/90">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                title="Clear conversation history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                title={isMinimized ? "Expand drawer" : "Minimize drawer"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                title="Close Pulse AI"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Context Status Banner (Shows active page & telemetry state) */}
              <div className="bg-[#F5F7F9] border-b border-[#E5E7EB] px-3.5 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#252525] truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                    <span className="font-semibold truncate">
                      {context.page_name}
                    </span>
                    <span className="text-[#666666] text-[10px] hidden sm:inline">
                      ({context.route})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowContextDetails(!showContextDetails)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0067A5] hover:underline cursor-pointer flex-shrink-0 ml-2"
                  >
                    <span>{showContextDetails ? "Hide Data" : "Inspect Data"}</span>
                    {showContextDetails ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Collapsible live telemetry inspector */}
                {showContextDetails && (
                  <div className="mt-2 pt-2 border-t border-[#E5E7EB] text-[11px] space-y-1.5 text-[#666666] max-h-40 overflow-y-auto bg-white p-2.5 rounded-lg border">
                    <div>
                      <span className="font-semibold text-[#252525]">Purpose: </span>
                      <span>{context.page_purpose}</span>
                    </div>
                    {context.filters && Object.keys(context.filters).length > 0 && (
                      <div>
                        <span className="font-semibold text-[#252525]">Active Filters: </span>
                        <code className="text-[#0067A5]">
                          {JSON.stringify(context.filters)}
                        </code>
                      </div>
                    )}
                    {context.metrics && Object.keys(context.metrics).length > 0 && (
                      <div>
                        <span className="font-semibold text-[#252525]">Visible Metrics: </span>
                        <span>{JSON.stringify(context.metrics)}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-[#252525]">Data Mode: </span>
                      <span>{context.sample_data_status || "Live Verified"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
                {messages.map((msg) => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    onRetry={retryLastMessage}
                  />
                ))}

                {/* Animated Typing Indicator */}
                {loading && (
                  <div className="flex items-start gap-2.5 my-3 animate-in fade-in">
                    <div className="w-7 h-7 rounded-lg bg-[#0067A5] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-[#666666]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0067A5]" />
                      <span>Pulse AI is analyzing page data &amp; telemetry...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Contextual Suggested Questions Bar */}
              <SuggestedQuestionsBar
                questions={suggestedQuestions}
                onSelect={(q) => handleSendMessage(q)}
                disabled={loading}
              />

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-[#E5E7EB] flex flex-col gap-1.5 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-2 bg-[#F5F7F9] border border-[#E5E7EB] focus-within:border-[#0067A5] focus-within:ring-1 focus-within:ring-[#0067A5]/20 rounded-xl px-3 py-2 transition-all"
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputVal}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder={`Ask Pulse AI about ${context.page_name}...`}
                    className="w-full bg-transparent resize-none text-xs text-[#252525] placeholder:text-[#666666] focus:outline-none max-h-28 scrollbar-none leading-relaxed"
                  />

                  <button
                    type="submit"
                    disabled={!inputVal.trim() || loading}
                    className="w-7 h-7 rounded-lg bg-[#0067A5] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#005588] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                    title="Send message (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10px] text-[#666666] px-1">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <span>{inputVal.length}/1000</span>
                </div>
              </div>
            </>
          )}
        </aside>
      )}
    </>
  );
}
