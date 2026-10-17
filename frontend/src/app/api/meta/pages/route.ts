import { NextResponse } from "next/server";
import { getUserPages } from "@/lib/meta";

export const runtime = "nodejs";

export async function GET() {
  const result = await getUserPages();
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        pages: [],
        error: result.error,
      },
      { status: result.error?.code === 190 ? 401 : 400 }
    );
  }

  return NextResponse.json({
    success: true,
    count: result.pages.length,
    pages: result.pages,
  });
}
