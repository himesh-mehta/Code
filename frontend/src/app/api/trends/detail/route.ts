import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "";
  const days = searchParams.get("days") || "30";
  const horizon = searchParams.get("horizon") || "30";

  if (!topic) {
    return NextResponse.json({ error: "Missing required topic parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/trends/detail?topic=${encodeURIComponent(topic)}&days=${days}&horizon=${horizon}`,
      {
        method: "GET",
        next: { revalidate: 0 },
      }
    );

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (res.status === 404) {
      return NextResponse.json({ error: `Topic '${topic}' not found` }, { status: 404 });
    }
  } catch (err: any) {
    console.warn("Could not reach Python backend for topic detail:", err.message);
  }

  return NextResponse.json(
    { error: "Could not retrieve topic details from intelligence service" },
    { status: 502 }
  );
}
