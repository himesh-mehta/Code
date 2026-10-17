import {
  Post,
  Overview,
  PostsResponse,
  PostsQuery,
  Topic,
  AudienceResponse,
  Opportunity,
  Campaign,
  GenerateCampaignRequest,
  ApiSettings,
  GdeltNewsResponse,
} from "../types";
import { store } from "./data-store";
import { generateMockCampaign } from "./mock";
import { fetchYouTubePosts } from "./youtube";

export const api = {
  getOverview: async (query?: PostsQuery): Promise<Overview> => {
    return store.getOverview(query);
  },

  getPosts: async (query?: PostsQuery): Promise<PostsResponse> => {
    const { items, total } = store.queryPosts(query);
    return {
      items,
      total,
      page: query?.page || 1,
      page_size: query?.page_size || 20,
    };
  },

  getTrends: async (query?: PostsQuery): Promise<{ items: Topic[] }> => {
    const overview = store.getOverview(query);
    return { items: overview.top_topics };
  },

  getAudience: async (query?: PostsQuery): Promise<AudienceResponse> => {
    const { items: filtered } = store.queryPosts(query);
    const overview = store.getOverview(query);

    // Group by platform
    const platformMap: Record<string, { posts: number; totalEng: number }> = {};
    filtered.forEach((p) => {
      if (!platformMap[p.platform]) {
        platformMap[p.platform] = { posts: 0, totalEng: 0 };
      }
      platformMap[p.platform].posts++;
      const eng = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
      platformMap[p.platform].totalEng += eng;
    });

    const byPlatform = Object.entries(platformMap).map(([platform, data]) => ({
      platform: platform as any,
      posts: data.posts,
      avg_engagement: data.posts > 0 ? Math.round(data.totalEng / data.posts) : 0,
    }));

    return {
      questions: overview.top_questions,
      sentiment_breakdown: overview.sentiment_breakdown,
      engagement: {
        by_platform: byPlatform,
        by_hour: [
          { hour: 8, avg_engagement: 45 },
          { hour: 10, avg_engagement: 120 },
          { hour: 12, avg_engagement: 165 },
          { hour: 14, avg_engagement: 130 },
          { hour: 16, avg_engagement: 190 },
          { hour: 18, avg_engagement: 240 },
          { hour: 20, avg_engagement: 285 },
          { hour: 22, avg_engagement: 140 },
        ],
      },
    };
  },

  getOpportunities: async (query?: PostsQuery): Promise<{ items: Opportunity[] }> => {
    const { items: filtered } = store.queryPosts(query);
    return {
      items: store.getOpportunities(filtered),
    };
  },

  getOpportunity: async (id: string): Promise<Opportunity> => {
    const opps = store.getOpportunities();
    const found = opps.find((o) => o.id === id);
    if (!found) {
      if (opps.length > 0) return opps[0];
      throw new Error(`Opportunity ${id} not found`);
    }
    return found;
  },

  generateCampaign: async (req: GenerateCampaignRequest): Promise<Campaign> => {
    return generateMockCampaign(req);
  },

  importCsv: async (file: File): Promise<{ added: number; error?: string }> => {
    return store.importCsvFile(file);
  },

  searchYouTube: async (
    query: string,
    limit = 12,
    cursor?: string
  ): Promise<{
    items: Post[];
    posts: Post[];
    cursor: string | null;
    hits_total: number;
    relevant_count: number;
    totalFound: number;
    error?: string;
    status?: number;
  }> => {
    const settings = store.getSettings();
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (cursor) params.set("cursor", cursor);
    if (settings.youtubeApiKey) params.set("apiKey", settings.youtubeApiKey);

    try {
      const res = await fetch(`/api/connectors/youtube?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        return {
          items: [],
          posts: [],
          cursor: null,
          hits_total: 0,
          relevant_count: 0,
          totalFound: 0,
          error: data.error || `HTTP ${res.status}`,
          status: res.status,
        };
      }
      const items: Post[] = data.items || [];
      if (items.length > 0) {
        store.addPosts(items);
      }
      return {
        items,
        posts: items,
        cursor: data.cursor || null,
        hits_total: data.hits_total || items.length,
        relevant_count: data.relevant_count || items.length,
        totalFound: data.hits_total || items.length,
      };
    } catch (err: any) {
      return {
        items: [],
        posts: [],
        cursor: null,
        hits_total: 0,
        relevant_count: 0,
        totalFound: 0,
        error: err.message || "Failed to contact YouTube connector",
      };
    }
  },

  searchBluesky: async (
    query: string,
    limit = 15,
    cursor?: string
  ): Promise<{
    items: Post[];
    cursor: string | null;
    hits_total: number;
    relevant_count: number;
    error?: string;
    status?: number;
  }> => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (cursor) params.set("cursor", cursor);

    try {
      const res = await fetch(`/api/connectors/bluesky?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        return {
          items: [],
          cursor: null,
          hits_total: 0,
          relevant_count: 0,
          error: data.error || `HTTP ${res.status}`,
          status: res.status,
        };
      }
      return data;
    } catch (err: any) {
      return {
        items: [],
        cursor: null,
        hits_total: 0,
        relevant_count: 0,
        error: err.message || "Failed to contact Bluesky connector",
      };
    }
  },

  collectBlueskyPosts: (posts: Post[]): { added: number; total: number } => {
    const prevCount = store.getPosts().length;
    store.addPosts(posts);
    const newCount = store.getPosts().length;
    return {
      added: newCount - prevCount,
      total: newCount,
    };
  },

  collectPosts: (posts: Post[]): { added: number; total: number } => {
    const prevCount = store.getPosts().length;
    store.addPosts(posts);
    const newCount = store.getPosts().length;
    return {
      added: newCount - prevCount,
      total: newCount,
    };
  },

  searchGdelt: async (
    query: string,
    dateRange = "30d",
    limit = 25
  ): Promise<GdeltNewsResponse> => {
    const params = new URLSearchParams({
      q: query,
      date_range: dateRange,
      limit: limit.toString(),
    });

    try {
      const res = await fetch(`/api/social-listening?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`GDELT API error ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      return {
        articles: [],
        total_retrieved: 0,
        hits_estimate: 0,
        tone_distribution: { positive: 0, neutral: 0, negative: 0 },
        timeline: [],
        top_domains: [],
        top_topics: [],
        query,
        timespan: dateRange,
        is_rate_limited: true,
        notice: err.message || "Failed to contact GDELT Social Listening API",
        source: "gdelt",
      };
    }
  },

  getSettings: (): ApiSettings => {
    return store.getSettings();
  },

  saveSettings: (settings: Partial<ApiSettings>) => {
    store.saveSettings(settings);
  },

  resetData: () => {
    store.resetToDefault();
  },

  refresh: async (): Promise<{ status: string; last_updated: string }> => {
    return {
      status: "ok",
      last_updated: new Date().toISOString(),
    };
  },
};
