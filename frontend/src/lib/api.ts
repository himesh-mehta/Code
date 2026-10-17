import {
  Post,
  CommentItem,
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

// Client-side cache for sub-second repeat queries
const clientCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_TTL = 3 * 60 * 1000;

function withClientTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch(() => {
      clearTimeout(timer);
      return fallback;
    }),
    timeoutPromise,
  ]);
}

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
    const cacheKey = `yt:${query.toLowerCase()}:${limit}:${cursor || ""}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const settings = store.getSettings();
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (cursor) params.set("cursor", cursor);
    if (settings.youtubeApiKey) params.set("apiKey", settings.youtubeApiKey);

    const fallback = {
      items: store.getPosts().filter((p) => p.platform === "youtube").slice(0, limit),
      posts: store.getPosts().filter((p) => p.platform === "youtube").slice(0, limit),
      cursor: null,
      hits_total: 4,
      relevant_count: 4,
      totalFound: 4,
    };

    const fetchPromise = async () => {
      try {
        const res = await fetch(`/api/connectors/youtube?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          return {
            items: fallback.items,
            posts: fallback.posts,
            cursor: null,
            hits_total: fallback.hits_total,
            relevant_count: fallback.relevant_count,
            totalFound: fallback.totalFound,
            error: data.error,
          };
        }
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        const result = {
          items,
          posts: items,
          cursor: data.cursor || null,
          hits_total: data.hits_total || items.length,
          relevant_count: data.relevant_count || items.length,
          totalFound: data.hits_total || items.length,
        };
        clientCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 2400, fallback);
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
    const cacheKey = `bsky:${query.toLowerCase()}:${limit}:${cursor || ""}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (cursor) params.set("cursor", cursor);

    const fallback = {
      items: store.getPosts().filter((p) => p.platform === "bluesky").slice(0, limit),
      cursor: null,
      hits_total: 3,
      relevant_count: 3,
    };

    const fetchPromise = async () => {
      try {
        const res = await fetch(`/api/connectors/bluesky?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          return {
            items: fallback.items,
            cursor: null,
            hits_total: fallback.hits_total,
            relevant_count: fallback.relevant_count,
            error: data.error,
          };
        }
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 2400, fallback);
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
    const cacheKey = `gdelt:${query.toLowerCase()}:${dateRange}:${limit}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const params = new URLSearchParams({
      q: query,
      date_range: dateRange,
      limit: limit.toString(),
    });

    const fallbackArticles = store.getPosts().filter((p) => p.platform === "gdelt");
    const fallback: GdeltNewsResponse = {
      articles: fallbackArticles,
      total_retrieved: fallbackArticles.length,
      hits_estimate: 240,
      tone_distribution: { positive: 3, neutral: 2, negative: 1 },
      timeline: [
        { date: "2026-10-12", count: 1 },
        { date: "2026-10-14", count: 1 },
        { date: "2026-10-16", count: 2 },
      ],
      top_domains: [{ domain: "tatatrusts.org", count: 1 }],
      top_topics: [{ topic: "Vocational training access", count: 1 }],
      query,
      timespan: dateRange,
      source: "gdelt",
    };

    const fetchPromise = async () => {
      try {
        const res = await fetch(`/api/social-listening?${params.toString()}`);
        if (!res.ok) {
          return fallback;
        }
        const data = await res.json();
        if (data.articles?.length > 0) {
          store.addPosts(data.articles);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 2400, fallback);
  },

  searchGooglePlaces: async (
    query: string,
    limit = 15
  ): Promise<{ items: Post[]; total: number; notice?: string }> => {
    const cacheKey = `gplaces:${query.toLowerCase()}:${limit}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const fallbackItems = store.getPosts().filter((p) => p.platform === "google_maps").slice(0, limit);
    const fallback = {
      items: fallbackItems,
      total: fallbackItems.length,
    };

    const fetchPromise = async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: limit.toString() });
        const res = await fetch(`/api/connectors/google-places?${params.toString()}`);
        if (!res.ok) return fallback;
        const data = await res.json();
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 2400, fallback);
  },

  searchGoogleNews: async (
    query: string,
    limit = 20
  ): Promise<{ items: Post[]; total: number; notice?: string }> => {
    const cacheKey = `gnews:${query.toLowerCase()}:${limit}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const fallbackItems = store.getPosts().filter((p) => p.platform === "google_news").slice(0, limit);
    const fallback = {
      items: fallbackItems,
      total: fallbackItems.length,
    };

    const fetchPromise = async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: limit.toString() });
        const res = await fetch(`/api/connectors/google-news?${params.toString()}`);
        if (!res.ok) return fallback;
        const data = await res.json();
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 2400, fallback);
  },

  getComments: (postId: string): CommentItem[] => {
    return store.getPostComments(postId);
  },

  addComment: (
    postId: string,
    comment: { author_handle: string; content: string; is_official?: boolean }
  ): CommentItem => {
    return store.addCommentToPost(postId, comment);
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
