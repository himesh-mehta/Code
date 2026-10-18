import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, text, parentId } = body;

    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json(
        { error: "videoId is required." },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Comment text must not be empty." },
        { status: 400 }
      );
    }

    if (text.trim().length > 10000) {
      return NextResponse.json(
        { error: "Comment text exceeds maximum allowed length of 10,000 characters." },
        { status: 400 }
      );
    }

    // Check for YouTube OAuth 2.0 Access Token
    // YouTube Data API v3 requires OAuth 2.0 with youtube.force-ssl scope for comment creation
    const oauthToken = process.env.YOUTUBE_OAUTH_ACCESS_TOKEN;

    if (!oauthToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "OAuth 2.0 authorization required to post directly to YouTube.",
          requires_oauth: true,
          scope_required: "https://www.googleapis.com/auth/youtube.force-ssl",
          configuration_required: {
            variables: [
              "YOUTUBE_OAUTH_CLIENT_ID",
              "YOUTUBE_OAUTH_CLIENT_SECRET",
              "YOUTUBE_OAUTH_ACCESS_TOKEN",
            ],
            documentation:
              "Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth 2.0 Client ID (Web Application). Add redirect URI and authorize with 'https://www.googleapis.com/auth/youtube.force-ssl' scope.",
          },
          message:
            "Live YouTube comments require an authenticated channel session via OAuth 2.0. The public API Key only supports read-only access (search.list, videos.list, commentThreads.list).",
        },
        { status: 401 }
      );
    }

    // If OAuth token is present, perform genuine commentThreads.insert
    const endpoint = parentId
      ? "https://www.googleapis.com/youtube/v3/comments?part=snippet"
      : "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet";

    const payload = parentId
      ? {
          snippet: {
            parentId,
            textOriginal: text.trim(),
          },
        }
      : {
          snippet: {
            videoId,
            topLevelComment: {
              snippet: {
                textOriginal: text.trim(),
              },
            },
          },
        };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauthToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.error?.message || `YouTube API comment insertion failed (HTTP ${res.status})`,
          details: data.error,
        },
        { status: res.status }
      );
    }

    const top = data.snippet?.topLevelComment?.snippet || data.snippet;
    return NextResponse.json({
      ok: true,
      comment: {
        id: data.id,
        author_handle: `@${top.authorDisplayName || "TataSTRIVE"}`,
        content: top.textOriginal || text.trim(),
        posted_at: top.publishedAt || new Date().toISOString(),
        likes: top.likeCount || 0,
        is_official: true,
      },
      message: "Comment successfully published to YouTube video thread.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process comment submission." },
      { status: 500 }
    );
  }
}
