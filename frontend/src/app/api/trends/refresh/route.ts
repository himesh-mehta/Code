import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/trends/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(errData, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message || "Failed to trigger pipeline refresh" },
      { status: 500 }
    );
  }
}
