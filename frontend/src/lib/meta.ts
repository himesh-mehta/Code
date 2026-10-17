// Server-side Meta Graph API utilities
// Security: Reads credentials strictly on the server from environment variables.
// NEVER logs or returns access tokens or secrets to client-side code.

export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export interface MetaConfigStatus {
  configured: boolean;
  hasAppId: boolean;
  hasAppSecret: boolean;
  hasAccessToken: boolean;
  appIdMasked?: string;
  version: string;
}

export interface MetaUser {
  id: string;
  name: string;
}

export interface MetaPage {
  id: string;
  name: string;
  category?: string;
  tasks?: string[];
}

export interface MetaPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
}

export interface MetaApiError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  missingPermission?: string;
  helpGuidance?: string;
}

// Internal server-only type that holds page access tokens securely
interface InternalMetaPageItem extends MetaPage {
  access_token?: string;
}

/**
 * Checks server-side environment variables without leaking values.
 */
export function getMetaConfigStatus(): MetaConfigStatus {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = process.env.META_ACCESS_TOKEN;

  const hasAppId = Boolean(appId && appId.trim().length > 0);
  const hasAppSecret = Boolean(appSecret && appSecret.trim().length > 0);
  const hasAccessToken = Boolean(accessToken && accessToken.trim().length > 0);

  let appIdMasked: string | undefined = undefined;
  if (hasAppId && appId) {
    appIdMasked = appId.length > 8 ? `${appId.slice(0, 4)}...${appId.slice(-4)}` : "Configured";
  }

  return {
    configured: hasAppId && hasAccessToken,
    hasAppId,
    hasAppSecret,
    hasAccessToken,
    appIdMasked,
    version: META_GRAPH_VERSION,
  };
}

/**
 * Sanitizes any Meta API error response to prevent leaking tokens or query strings.
 */
export function sanitizeMetaError(rawError: any): MetaApiError {
  const err = rawError?.error || rawError;
  const message = typeof err?.message === "string" ? err.message : "An unknown Meta Graph API error occurred";
  const code = typeof err?.code === "number" ? err.code : undefined;
  const subcode = typeof err?.error_subcode === "number" ? err.error_subcode : undefined;
  const type = typeof err?.type === "string" ? err.type : undefined;

  let missingPermission: string | undefined = undefined;
  let helpGuidance: string | undefined = undefined;

  // Detect specific permission or token errors
  if (code === 190) {
    helpGuidance = "The Access Token is expired, invalidated, or lacks required user session permissions. Generate a fresh User Access Token in the Meta Graph API Explorer.";
  } else if (code === 200 || code === 10 || message.toLowerCase().includes("permission") || message.toLowerCase().includes("pages_read")) {
    if (message.includes("pages_read_engagement")) {
      missingPermission = "pages_read_engagement";
      helpGuidance = "This endpoint requires the 'pages_read_engagement' permission. Add this permission in Meta Graph API Explorer (or App Review) and regenerate your User Access Token.";
    } else if (message.includes("pages_read_user_content")) {
      missingPermission = "pages_read_user_content";
      helpGuidance = "This endpoint requires the 'pages_read_user_content' permission to read user-submitted posts on your Page. Add this permission in Meta Graph API Explorer.";
    } else if (message.includes("pages_show_list")) {
      missingPermission = "pages_show_list";
      helpGuidance = "The 'pages_show_list' permission is required to list your Facebook Pages.";
    } else {
      missingPermission = "pages_read_engagement";
      helpGuidance = "Your token currently has 'pages_show_list', which allows discovering Page names and IDs. To read posts and engagement data, add 'pages_read_engagement' in the Meta Developer Portal or Graph API Explorer.";
    }
  } else if (code === 100) {
    helpGuidance = "The requested Page ID could not be loaded or is not accessible with the current permissions. Verify your Page access in Meta for Developers.";
  }

  return {
    message,
    type,
    code,
    error_subcode: subcode,
    missingPermission,
    helpGuidance,
  };
}

/**
 * Test 1: Verify current user token via GET /me?fields=id,name
 */
export async function verifyUserToken(): Promise<{ success: boolean; user?: MetaUser; error?: MetaApiError }> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return {
      success: false,
      error: {
        message: "META_ACCESS_TOKEN is not configured in .env.local",
        helpGuidance: "Add META_ACCESS_TOKEN to .env.local in the project root.",
      },
    };
  }

  try {
    const url = new URL(`${META_GRAPH_BASE}/me`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", token);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, error: sanitizeMetaError(data) };
    }

    return {
      success: true,
      user: {
        id: data.id,
        name: data.name,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        message: err.message || "Network error while connecting to Meta Graph API",
        helpGuidance: "Check your internet connection and verify graph.facebook.com is reachable.",
      },
    };
  }
}

/**
 * Server-only helper: fetches accounts including page access tokens, never exposed to client.
 */
async function fetchInternalUserAccounts(): Promise<{ success: boolean; pages: InternalMetaPageItem[]; error?: MetaApiError }> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return {
      success: false,
      pages: [],
      error: {
        message: "META_ACCESS_TOKEN is not configured in .env.local",
        helpGuidance: "Add META_ACCESS_TOKEN to .env.local in the project root.",
      },
    };
  }

  try {
    const url = new URL(`${META_GRAPH_BASE}/me/accounts`);
    url.searchParams.set("fields", "name,id,category,tasks,access_token");
    url.searchParams.set("access_token", token);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, pages: [], error: sanitizeMetaError(data) };
    }

    const pages: InternalMetaPageItem[] = Array.isArray(data.data)
      ? data.data.map((item: any) => ({
          id: String(item.id),
          name: String(item.name || "Untitled Page"),
          category: item.category,
          tasks: Array.isArray(item.tasks) ? item.tasks : undefined,
          access_token: item.access_token,
        }))
      : [];

    return {
      success: true,
      pages,
    };
  } catch (err: any) {
    return {
      success: false,
      pages: [],
      error: {
        message: err.message || "Network error while fetching Facebook Pages",
        helpGuidance: "Check your network connection and verify graph.facebook.com is reachable.",
      },
    };
  }
}

/**
 * Test 2: List accessible Facebook Pages via GET /me/accounts?fields=name,id,category
 * Strips all internal tokens before returning safe data to caller.
 */
export async function getUserPages(): Promise<{ success: boolean; pages: MetaPage[]; error?: MetaApiError }> {
  const internal = await fetchInternalUserAccounts();
  if (!internal.success) {
    return {
      success: false,
      pages: [],
      error: internal.error,
    };
  }

  // Strip access_token so it NEVER enters client-facing data structures
  const safePages: MetaPage[] = internal.pages.map(({ id, name, category, tasks }) => ({
    id,
    name,
    category,
    tasks,
  }));

  return {
    success: true,
    pages: safePages,
  };
}

/**
 * Test 3: Read up to 10 posts for an accessible Page via GET /{PAGE_ID}/posts?fields=message,created_time,permalink_url&limit=10
 * Strictly validates that pageId is authorized in /me/accounts.
 */
export async function getPagePosts(pageId: string): Promise<{ success: boolean; posts: MetaPost[]; error?: MetaApiError }> {
  const userToken = process.env.META_ACCESS_TOKEN;
  if (!userToken) {
    return {
      success: false,
      posts: [],
      error: {
        message: "META_ACCESS_TOKEN is not configured in .env.local",
        helpGuidance: "Add META_ACCESS_TOKEN to .env.local in the project root.",
      },
    };
  }

  // 1. Validate pageId format (strict alphanumeric ID)
  if (!pageId || !/^[0-9A-Za-z_]+$/.test(pageId)) {
    return {
      success: false,
      posts: [],
      error: {
        message: "Invalid Page ID format. Page IDs must be numeric or valid Meta identifiers.",
      },
    };
  }

  // 2. Security validation: Verify access before requesting Page data
  const accountsResult = await fetchInternalUserAccounts();
  if (!accountsResult.success) {
    return {
      success: false,
      posts: [],
      error: accountsResult.error,
    };
  }

  const matchedPage = accountsResult.pages.find((p) => p.id === pageId);
  if (!matchedPage) {
    return {
      success: false,
      posts: [],
      error: {
        message: `Page ID "${pageId}" is not in your authorized Facebook Pages list.`,
        helpGuidance:
          accountsResult.pages.length === 0
            ? "Your authenticated Facebook account does not currently manage any Facebook Pages under the 'pages_show_list' permission. In Meta for Developers, create a Facebook Page or add your account as an Admin of a Page to read its posts."
            : `Accessible Pages for your account: ${accountsResult.pages.map((p) => `${p.name} (${p.id})`).join(", ")}.`,
      },
    };
  }

  // Use the Page-specific access token returned by /me/accounts if present, else fallback to User token
  const queryToken = matchedPage.access_token || userToken;

  try {
    const url = new URL(`${META_GRAPH_BASE}/${pageId}/posts`);
    url.searchParams.set("fields", "message,created_time,permalink_url");
    url.searchParams.set("limit", "10");
    url.searchParams.set("access_token", queryToken);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, posts: [], error: sanitizeMetaError(data) };
    }

    const posts: MetaPost[] = Array.isArray(data.data)
      ? data.data.map((item: any) => ({
          id: String(item.id),
          message: item.message,
          created_time: item.created_time,
          permalink_url: item.permalink_url,
        }))
      : [];

    return {
      success: true,
      posts,
    };
  } catch (err: any) {
    return {
      success: false,
      posts: [],
      error: {
        message: err.message || "Network error while reading Page posts",
        helpGuidance: "Check your network connection and verify graph.facebook.com is reachable.",
      },
    };
  }
}
