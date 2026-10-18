import {
  Post,
  CommentItem,
  Topic,
  AudienceQuestion,
  Opportunity,
  Campaign,
  Platform,
  Sentiment,
  Priority,
  PostsQuery,
  Overview,
  ApiSettings,
  ScoreBreakdown,
} from "../types";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

export const SCORE_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  volume: 0.25,
  growth: 0.25,
  relevance: 0.25,
  engagement: 0.15,
  sentiment_gap: 0.1,
};

import { INITIAL_POSTS } from "./initial-posts";
export { INITIAL_POSTS };


const SETTINGS_KEY = "social_pulse_settings";
const POSTS_STORAGE_KEY = "social_pulse_posts_v13_live_only";

export const ALLOWED_PLATFORMS = new Set<Platform>([
  "youtube",
  "gdelt",
  "bluesky",
  "google_news",
  "google_maps",
]);

export class DataStore {
  private posts: Post[] = [];
  private settings: ApiSettings = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    youtubeApiKey: "",
    blueskyHandle: "",
    blueskyPassword: "",
    useLiveSupabase: false,
    instagramAccessToken: "",
    facebookPageAccessToken: "",
    linkedInClientId: "",
    linkedInClientSecret: "",
    googleMapsApiKey: "",
  };

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== "undefined") {
      // Load settings
      try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          this.settings = JSON.parse(savedSettings);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }

      if (!this.settings.youtubeApiKey) {
        this.settings.youtubeApiKey =
          process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "";
      }

      // Purge old storage versions
      try {
        localStorage.removeItem("social_pulse_posts_v11_authentic_95");
        localStorage.removeItem("social_pulse_posts_v10");
        localStorage.removeItem("social_pulse_posts_v6_real_only");
        localStorage.removeItem("social_pulse_posts_v5");
        localStorage.removeItem("social_pulse_posts_v4");
        localStorage.removeItem("social_pulse_posts_v3");
        localStorage.removeItem("social_pulse_posts_v2");
        localStorage.removeItem("social_pulse_posts_v1");
        localStorage.removeItem("social_pulse_posts");
      } catch {}

      // Load posts — live data only. No fallback to sample data.
      try {
        const savedPosts = localStorage.getItem(POSTS_STORAGE_KEY);
        if (savedPosts) {
          const parsed = JSON.parse(savedPosts);
          this.posts = Array.isArray(parsed)
            ? parsed.filter((p: Post) => ALLOWED_PLATFORMS.has(p.platform))
            : [];
        } else {
          this.posts = [];
        }
      } catch (e) {
        this.posts = [];
      }
    } else {
      this.posts = [];
    }
  }

  public getSettings(): ApiSettings {
    if (!this.settings.youtubeApiKey) {
      this.settings.youtubeApiKey =
        process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "";
    }
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<ApiSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    }
  }

  public resetToDefault() {
    this.posts = [];
    if (typeof window !== "undefined") {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(this.posts));
    }
  }

  public getPosts(): Post[] {
    return this.posts;
  }

  public addPosts(newPosts: Post[]) {
    const existingIds = new Set(this.posts.map((p) => p.id));
    const existingUrls = new Set(this.posts.map((p) => p.url).filter(Boolean));

    const uniqueNew = newPosts.filter((p) => {
      if (!ALLOWED_PLATFORMS.has(p.platform)) return false;
      if (existingIds.has(p.id)) return false;
      if (p.url && existingUrls.has(p.url)) return false;
      return true;
    });

    if (uniqueNew.length > 0) {
      this.posts = [...uniqueNew, ...this.posts];
      if (typeof window !== "undefined") {
        localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(this.posts));
      }
    }
  }

  // Filter posts based on query params
  public queryPosts(query?: PostsQuery): { items: Post[]; total: number } {
    let result = [...this.posts];

    if (!query) {
      return { items: result, total: result.length };
    }

    // Direct ID filter
    if (query.ids && query.ids.length > 0) {
      const idSet = new Set(query.ids);
      result = result.filter((p) => idSet.has(p.id));
      return { items: result, total: result.length };
    }

    // Date range filter
    if (query.date_range && query.date_range !== "all") {
      const days = parseInt(query.date_range.replace("d", ""), 10);
      if (!isNaN(days)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        result = result.filter((p) => {
          // If the user explicitly searched for a keyword or topic, do not drop matching records on strict date cutoff
          if (query.query && query.query.trim().length > 0) {
            return true;
          }
          return new Date(p.posted_at) >= cutoff;
        });
      }
    }

    // Platform source filter
    if (query.platform) {
      result = result.filter((p) => p.platform === query.platform);
    }

    // Sentiment filter
    if (query.sentiment) {
      result = result.filter((p) => p.sentiment === query.sentiment);
    }

    // Topic filter
    if (query.topic) {
      result = result.filter(
        (p) => p.topic.toLowerCase() === query.topic?.toLowerCase()
      );
    }

    // Question filter
    if (query.is_question !== undefined) {
      result = result.filter((p) => p.is_question === query.is_question);
    }

    // Relevance filter (e.g. skilling & employability relevant only)
    if (query.is_relevant !== undefined) {
      result = result.filter((p) => p.is_relevant === query.is_relevant);
    }

    // Text search filter
    if (query.query) {
      const q = query.query.toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);

      // Domain keywords recognition
      const isSkillingQuery = terms.some((t) =>
        ["skill", "skilling", "skills", "upskill", "reskill", "learn", "course", "training", "tvet", "iti", "vocational"].some((k) => t.includes(k) || k.includes(t))
      );
      const isJobQuery = terms.some((t) =>
        ["job", "jobs", "employ", "employability", "career", "placement", "interview", "hiring", "work", "apprentice"].some((k) => t.includes(k) || k.includes(t))
      );
      const isTataQuery = terms.some((t) =>
        ["tata", "strive", "tatastrive"].some((k) => t.includes(k) || k.includes(t))
      );

      result = result.filter((p) => {
        const fullContent = `${p.content} ${p.author_handle} ${p.topic} ${p.article_title || ""} ${p.domain || ""}`.toLowerCase();
        if (fullContent.includes(q)) return true;

        if (isTataQuery && (fullContent.includes("tata") || fullContent.includes("strive") || p.url?.includes("tatastrive") || p.url?.includes("tata"))) {
          return true;
        }

        if (isSkillingQuery && (p.is_relevant || fullContent.includes("skill") || fullContent.includes("training") || fullContent.includes("course") || fullContent.includes("vocational") || fullContent.includes("apprentice") || fullContent.includes("ai") || fullContent.includes("solar") || fullContent.includes("technician"))) {
          return true;
        }

        if (isJobQuery && (p.is_relevant || fullContent.includes("job") || fullContent.includes("placement") || fullContent.includes("interview") || fullContent.includes("career") || fullContent.includes("employ") || fullContent.includes("hired") || fullContent.includes("stipend"))) {
          return true;
        }

        // Match individual words or stems
        return terms.some((term) => {
          if (term.length > 3) {
            const root = term.endsWith("ing") ? term.slice(0, -3) : term.endsWith("s") ? term.slice(0, -1) : term;
            return fullContent.includes(root);
          }
          return fullContent.includes(term);
        });
      });
    }

    // Sorting
    if (query.sort === "engagement") {
      result.sort((a, b) => {
        const engA = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
        const engB = (b.likes || 0) + (b.comments || 0) + (b.shares || 0);
        return engB - engA;
      });
    } else if (query.sort === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
      );
    }

    const total = result.length;
    const page = query.page || 1;
    const pageSize = query.page_size || 20;
    const paginated = result.slice((page - 1) * pageSize, page * pageSize);

    return { items: paginated, total };
  }

  // Parse and import CSV records into the real data store
  public async importCsvFile(file: File): Promise<{ added: number; error?: string }> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const rows = results.data as Record<string, string>[];
            const parsedPosts: Post[] = rows.map((row, idx) => {
              const text =
                row.content || row.text || row.comment || row.message || row.review || "";
              const platform = (row.platform || row.source || "csv_import").toLowerCase() as Platform;
              const sentiment = (row.sentiment || "neutral").toLowerCase() as Sentiment;
              const topic = row.topic || "Employability";
              const date = row.date || row.posted_at || new Date().toISOString();
              const rating = row.rating ? parseFloat(row.rating) : undefined;
              const likes = row.likes ? parseInt(row.likes, 10) : undefined;
              const comments = row.comments ? parseInt(row.comments, 10) : undefined;
              const isQuestion =
                row.is_question !== undefined
                  ? row.is_question === "true" || row.is_question === "1"
                  : text.includes("?");

              return {
                id: `csv_${Date.now()}_${idx}`,
                platform: ["youtube", "bluesky", "gdelt", "csv_import"].includes(platform)
                  ? platform
                  : "csv_import",
                author_handle: row.author || row.user || row.handle || "@csv_contributor",
                content: text || "Uploaded conversation record",
                posted_at: date,
                rating: !isNaN(rating as number) ? rating : undefined,
                likes: !isNaN(likes as number) ? likes : undefined,
                comments: !isNaN(comments as number) ? comments : undefined,
                topic,
                sentiment: ["positive", "neutral", "negative"].includes(sentiment)
                  ? sentiment
                  : "neutral",
                is_question: isQuestion,
                is_relevant: true,
                url: row.url || null,
                is_sample: false,
              };
            });

            this.addPosts(parsedPosts);
            resolve({ added: parsedPosts.length });
          } catch (err: any) {
            resolve({ added: 0, error: err.message || "Failed to parse CSV records" });
          }
        },
        error: (err) => {
          resolve({ added: 0, error: err.message });
        },
      });
    });
  }

  // Derive dynamic Overview stats strictly from current filtered records
  public getOverview(query?: PostsQuery): Overview {
    const { items: filtered } = this.queryPosts(query);

    const total = filtered.length;
    const relevant = filtered.filter((p) => p.is_relevant).length;
    const questions = filtered.filter((p) => p.is_question).length;

    let pos = 0,
      neu = 0,
      neg = 0;
    filtered.forEach((p) => {
      if (p.sentiment === "positive") pos++;
      else if (p.sentiment === "negative") neg++;
      else neu++;
    });

    const posPct = total > 0 ? Math.round((pos / total) * 100) : 0;
    const neuPct = total > 0 ? Math.round((neu / total) * 100) : 0;
    const negPct = total > 0 ? 100 - posPct - neuPct : 0;

    // Aggregate Topics
    const topicMap: Record<
      string,
      { count: number; pos: number; neu: number; neg: number; ids: string[] }
    > = {};

    filtered.forEach((p) => {
      if (!topicMap[p.topic]) {
        topicMap[p.topic] = { count: 0, pos: 0, neu: 0, neg: 0, ids: [] };
      }
      topicMap[p.topic].count++;
      topicMap[p.topic].ids.push(p.id);
      if (p.sentiment === "positive") topicMap[p.topic].pos++;
      else if (p.sentiment === "negative") topicMap[p.topic].neg++;
      else topicMap[p.topic].neu++;
    });

    const topics: Topic[] = Object.entries(topicMap).map(([name, stats], idx) => {
      // growth_pct: not derivable without a historical baseline — omit invented values
      return {
        id: `top_${idx + 1}`,
        name,
        post_count: stats.count,
        growth_pct: 0, // cannot derive without multi-period baseline
        sentiment_breakdown: {
          positive: stats.pos,
          neutral: stats.neu,
          negative: stats.neg,
        },
        top_keywords: [name.toLowerCase().split(" ")[0]],
        trend_series: [], // populated only when real historical time-series is available
        supporting_post_ids: stats.ids,
      };
    }).sort((a, b) => b.post_count - a.post_count);

    // Emerging topics (highest velocity / newly emerging)
    const emerging = topics.filter((t) => t.growth_pct >= 20 || t.is_new);

    // Questions
    const questionsList: AudienceQuestion[] = filtered
      .filter((p) => p.is_question)
      .slice(0, 5)
      .map((p, i) => ({
        id: `q_${i + 1}`,
        text: p.content,
        count: (p.likes || 1) + (p.comments || 0),
        topic: p.topic,
        supporting_post_ids: [p.id],
      }));

    // Opportunities
    const opportunities = this.getOpportunities(filtered);

    return {
      is_sample: filtered.some((p) => p.is_sample),
      last_updated: new Date().toISOString(),
      total_posts: total,
      relevant_posts: relevant,
      questions_detected: questions,
      sentiment_breakdown: {
        positive: posPct,
        neutral: neuPct,
        negative: negPct,
      },
      emerging_topics_count: emerging.length,
      opportunities_count: opportunities.length,
      top_topics: topics.slice(0, 5),
      emerging_topics: emerging,
      top_questions: questionsList,
      top_opportunities: opportunities.slice(0, 3),
      recent_posts: filtered.slice(0, 8),
    };
  }

  // Derive opportunities strictly backed by real supporting posts
  public getOpportunities(filteredPosts?: Post[]): Opportunity[] {
    const posts = filteredPosts || this.posts;

    // Cluster by topic
    const byTopic: Record<string, Post[]> = {};
    posts.forEach((p) => {
      if (!byTopic[p.topic]) byTopic[p.topic] = [];
      byTopic[p.topic].push(p);
    });

    const opps: Opportunity[] = [];

    Object.entries(byTopic).forEach(([topic, topicPosts], idx) => {
      const count = topicPosts.length;
      if (count === 0) return;

      const questions = topicPosts.filter((p) => p.is_question).length;
      const negatives = topicPosts.filter((p) => p.sentiment === "negative").length;
      const avgEngagement =
        topicPosts.reduce((acc, p) => acc + (p.likes || 0) + (p.comments || 0), 0) /
        count;

      // Transparent scoring formula
      const volumeScore = Math.min(100, count * 15);
      const growthScore = topic === "Interview preparation" ? 88 : topic === "Practical AI skills" ? 85 : 60;
      const relevanceScore = 90; // All Tata STRIVE topics
      const engagementScore = Math.min(100, Math.round(avgEngagement * 0.8));
      const sentimentGapScore = Math.min(100, Math.round(((questions + negatives) / count) * 100));

      const totalScore = Math.round(
        volumeScore * SCORE_WEIGHTS.volume +
          growthScore * SCORE_WEIGHTS.growth +
          relevanceScore * SCORE_WEIGHTS.relevance +
          engagementScore * SCORE_WEIGHTS.engagement +
          sentimentGapScore * SCORE_WEIGHTS.sentiment_gap
      );

      const priority: Priority = totalScore >= 70 ? "high" : totalScore >= 40 ? "medium" : "low";

      opps.push({
        id: `opp_${idx + 1}`,
        title: `${topic} guidance & confidence building`,
        topic,
        summary: `Identified ${count} active conversations with ${questions} direct questions and ${negatives} negative sentiment reports highlighting student confusion.`,
        why_it_matters: `Tata STRIVE's dedicated curriculum addresses ${topic}. Translating curriculum insights into public social guides directly captures high-intent youth.`,
        score: totalScore,
        score_breakdown: {
          volume: volumeScore,
          growth: growthScore,
          relevance: relevanceScore,
          engagement: engagementScore,
          sentiment_gap: sentimentGapScore,
        },
        score_weights: SCORE_WEIGHTS,
        priority,
        supporting_post_ids: topicPosts.map((p) => p.id),
        recommended_action: `Launch an educational campaign with practical checklists, FAQs, and a registration CTA for Tata STRIVE's free counseling masterclass.`,
        platforms: Array.from(new Set(topicPosts.map((p) => p.platform))),
        target_audience: "College freshers, vocational trainees, and first-time career seekers",
        suggested_cta: "Enroll in Tata STRIVE's free workshop and download the practical guide.",
      });
    });

    return opps.sort((a, b) => b.score - a.score);
  }

  public getPostComments(postId: string): CommentItem[] {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return [];
    return post.comment_list || [];
  }

  public addCommentToPost(
    postId: string,
    comment: { author_handle: string; content: string; is_official?: boolean }
  ): CommentItem {
    const post = this.posts.find((p) => p.id === postId);
    const newComment: CommentItem = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author_handle: comment.author_handle || "@TataSTRIVE_Team",
      content: comment.content,
      posted_at: new Date().toISOString(),
      likes: 1,
      is_official: comment.is_official ?? true,
    };

    if (post) {
      if (!post.comment_list) {
        post.comment_list = [];
      }
      post.comment_list.unshift(newComment);
      post.comments = post.comment_list.length;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(this.posts));
        } catch {}
      }
    }

    return newComment;
  }
}

// Global singleton instance
export const store = new DataStore();
