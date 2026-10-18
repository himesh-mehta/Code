import { NextRequest, NextResponse } from "next/server";
import { CommentItem } from "@/types";

export const runtime = "nodejs";

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ||
  "AIzaSyBrEppqTLIpnffQKaapzWOih9dzn7zdRRc";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const videoId = searchParams.get("videoId");
  const postUrl = searchParams.get("url");

  const realComments: CommentItem[] = [];

  // 1. REAL YOUTUBE COMMENTS via YouTube Data API v3
  if (platform === "youtube" && videoId) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url, { next: { revalidate: 60 } });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];

        items.forEach((it: any) => {
          const top = it.snippet?.topLevelComment?.snippet;
          if (top) {
            realComments.push({
              id: it.id || `yt_c_${Date.now()}_${Math.random()}`,
              author_handle: top.authorDisplayName ? `@${top.authorDisplayName.replace(/^@+/, "").replace(/\s+/g, "")}` : "@YouTubeUser",
              content: (top.textDisplay || "").replace(/<[^>]+>/g, "").trim(),
              posted_at: top.publishedAt || new Date().toISOString(),
              likes: top.likeCount || 0,
              is_official: false,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Failed to fetch real YouTube comments:", err);
    }
  }

  // 2. REAL BLUESKY REPLIES via AT Protocol
  if (platform === "bluesky" && postUrl) {
    try {
      // Extract handle and rkey from URL: https://bsky.app/profile/:handle/post/:rkey
      const match = postUrl.match(/profile\/([^/]+)\/post\/([^/?#]+)/);
      if (match) {
        const [, handle, rkey] = match;
        // Resolve DID if handle is not did
        let did = handle;
        if (!did.startsWith("did:")) {
          const resolveRes = await fetch(
            `https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
          );
          if (resolveRes.ok) {
            const resData = await resolveRes.json();
            did = resData.did || handle;
          }
        }

        const atUri = `at://${did}/app.bsky.feed.post/${rkey}`;
        const threadUrl = `https://api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(atUri)}`;
        const threadRes = await fetch(threadUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent": "SocialPulse-TataSTRIVE/1.0",
          },
          next: { revalidate: 30 },
        });

        if (threadRes.ok) {
          const threadData = await threadRes.json();
          const replies = threadData.thread?.replies || [];

          replies.forEach((rep: any) => {
            const p = rep.post;
            if (p) {
              const repHandle = p.author?.handle || "user.bsky.social";
              const repText = p.record?.text || "";
              realComments.push({
                id: p.cid || `bsky_c_${Date.now()}`,
                author_handle: `@${repHandle}`,
                content: repText,
                posted_at: p.record?.createdAt || p.indexedAt || new Date().toISOString(),
                likes: p.likeCount || 0,
                is_official: false,
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch real Bluesky replies:", err);
    }
  }

  return NextResponse.json({
    items: realComments,
    total: realComments.length,
    source: platform,
    is_live: realComments.length > 0,
  });
}
