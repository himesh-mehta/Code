import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract client IP to pass through for rate-limiting
    const clientIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const backendRes = await fetch(`${BACKEND_URL}/api/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": clientIp,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    const data = await backendRes.json().catch(() => ({
      error: "invalid_backend_response",
      message: "The backend returned an unexpected response format.",
    }));

    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json(
        {
          error: "timeout",
          message: "AI generation timed out after 25 seconds. Please try again.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: "proxy_error",
        message:
          "Unable to reach Social Pulse AI backend service. Please ensure the backend is running on port 8000.",
      },
      { status: 503 }
    );
  }
}
