import { NextRequest, NextResponse } from "next/server";
import { getPagePosts } from "@/lib/meta";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> | { pageId: string } }
) {
  const params = await Promise.resolve(context.params);
  const pageId = params?.pageId?.trim();

  if (!pageId) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Page ID is required" },
      },
      { status: 400 }
    );
  }

  const result = await getPagePosts(pageId);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        posts: [],
        error: result.error,
      },
      { status: result.error?.code === 190 ? 401 : 400 }
    );
  }

  return NextResponse.json({
    success: true,
    page_id: pageId,
    count: result.posts.length,
    posts: result.posts,
  });
}
