import { NextResponse } from "next/server";
import { verifyUserToken } from "@/lib/meta";

export const runtime = "nodejs";

export async function GET() {
  const result = await verifyUserToken();
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: result.error?.code === 190 ? 401 : 400 }
    );
  }

  return NextResponse.json({
    success: true,
    user: result.user,
  });
}
