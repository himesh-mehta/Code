"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { PageContextData } from "@/lib/assistant-api";

interface PageContextType {
  context: PageContextData;
  suggestedQuestions: string[];
  updatePageContext: (updates: Partial<PageContextData>) => void;
  setSuggestedQuestions: (questions: string[]) => void;
}

const DEFAULT_QUESTIONS_BY_ROUTE: Record<string, string[]> = {
  "/": [
    "Explain this overview dashboard",
    "What does the sentiment breakdown mean for Tata STRIVE?",
    "Why are positive and negative discussions split?",
    "What are the top emerging topics?",
  ],
  "/feed": [
    "Summarize conversations matching the current filters",
    "What are students asking most in comments?",
    "Explain the difference between YouTube and GDELT coverage",
    "Why is negative sentiment detected in some posts?",
  ],
  "/trends": [
    "Which skill topics are gaining momentum?",
    "What could grow over the next 90 days?",
    "How reliable is this forecast?",
    "Which topics should Tata STRIVE create content about next?",
  ],
  "/opportunities": [
    "How is the priority score calculated?",
    "Why should Tata STRIVE act on the top opportunity?",
    "Explain the 'unmet need' (sentiment gap) metric",
    "Which opportunity has the highest relevance for youth?",
  ],
  "/studio": [
    "Evaluate this campaign strategy for Tata STRIVE",
    "Suggest a high-engagement Instagram caption",
    "How can we adapt this message for LinkedIn professionals?",
    "What measurable targets should we track for this campaign?",
  ],
};

const DEFAULT_METADATA_BY_ROUTE: Record<
  string,
  { name: string; purpose: string }
> = {
  "/": {
    name: "Overview Dashboard",
    purpose:
      "Executive high-level summary of social listening telemetry, volume trends, sentiment distribution, and strategic priorities for Tata STRIVE.",
  },
  "/feed": {
    name: "Social Listening Feed",
    purpose:
      "Filterable multi-source feed of collected student feedback, reviews, discussions, and ratings across YouTube, Bluesky, GDELT, and CSV imports.",
  },
  "/trends": {
    name: "Insights & Trends",
    purpose:
      "Longitudinal topic growth, sentiment trajectories, top recurring audience questions, and engagement patterns.",
  },
  "/opportunities": {
    name: "Opportunity Centre",
    purpose:
      "Prioritized conversation-to-campaign opportunities with transparent scoring breakdown (volume, growth, relevance, engagement, and unmet need).",
  },
  "/studio": {
    name: "Content Studio",
    purpose:
      "AI campaign studio converting high-priority opportunities into actionable content ideas, captions, key messages, and measurable CTAs.",
  },
};

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  const getBaseContext = useCallback(
    (path: string): PageContextData => {
      const matched =
        DEFAULT_METADATA_BY_ROUTE[path] || {
          name: "Social Pulse",
          purpose: "Tata STRIVE Social Listening & Intelligence",
        };

      return {
        route: path,
        page_name: matched.name,
        page_purpose: matched.purpose,
        sample_data_status: "Verified Authentic Feed (Sample-labeled where simulated)",
        data_freshness: "Live Synced",
        filters: {},
        metrics: {},
      };
    },
    []
  );

  const [context, setContext] = useState<PageContextData>(() =>
    getBaseContext(pathname)
  );
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    () => DEFAULT_QUESTIONS_BY_ROUTE[pathname] || DEFAULT_QUESTIONS_BY_ROUTE["/"]
  );

  // When pathname changes, refresh base context & default questions
  useEffect(() => {
    setContext((prev) => ({
      ...getBaseContext(pathname),
      // preserve filters/metrics if same page
      filters: prev.route === pathname ? prev.filters : {},
      metrics: prev.route === pathname ? prev.metrics : {},
    }));

    setSuggestedQuestions(
      DEFAULT_QUESTIONS_BY_ROUTE[pathname] || DEFAULT_QUESTIONS_BY_ROUTE["/"]
    );
  }, [pathname, getBaseContext]);

  const updatePageContext = useCallback(
    (updates: Partial<PageContextData>) => {
      setContext((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  return (
    <PageContext.Provider
      value={{
        context,
        suggestedQuestions,
        updatePageContext,
        setSuggestedQuestions,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const ctx = useContext(PageContext);
  if (!ctx) {
    throw new Error(
      "usePageContext must be used within a PageContextProvider"
    );
  }
  return ctx;
}
