import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL ||
  process.env.PYTHON_SENTIMENT_API ||
  "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Message is required and must not be empty." },
        { status: 400 }
      );
    }

    // Limit message length and history turns server-side
    const cleanMessage = body.message.trim().slice(0, 2000);
    const cleanHistory = Array.isArray(body.history)
      ? body.history.slice(-10).map((h: any) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: String(h.content || "").slice(0, 2000),
        }))
      : [];

    const payload = {
      message: cleanMessage,
      history: cleanHistory,
      context: body.context || null,
    };

    // Forward to FastAPI Assistant Service
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000);

      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (pyRes.ok) {
        const data = await pyRes.json();
        return NextResponse.json(data);
      } else {
        const errJson = await pyRes.json().catch(() => null);
        console.warn("Backend assistant returned non-200:", pyRes.status, errJson);
      }
    } catch (netErr: any) {
      console.warn("Could not reach Python assistant backend:", netErr.message);
    }

    // Standby fallback if backend is offline or starting
    const pageName = body.context?.page_name || "Overview";
    return NextResponse.json({
      reply: `**Pulse AI (${pageName})**\n\nI have reviewed your inquiry regarding **${pageName}**.\n\n*Live Python Assistant service is currently starting on \`${PYTHON_BACKEND_URL}\`.*\n\n**Current Context Insights:**\n- **Target Entity**: Tata STRIVE Employability & Skilling Ecosystem\n- **Active Route**: \`${body.context?.route || "/"}\`\n- **Active Scope**: Verified listening feed covering YouTube, Bluesky, and GDELT News.\n\nTo view full LLM inferences, please verify that the FastAPI backend is running via \`uvicorn app.main:app --port 8000\` with \`XAI_API_KEY\` set.`,
      suggested_followups: [
        "What are the top student questions?",
        "Explain the sentiment breakdown",
        "Which opportunity is highest priority?",
      ],
      provider: "standby-analyst",
      model: "fallback-mode",
      status: "standby",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process assistant request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/assistant/status`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  return NextResponse.json({
    status: "standby",
    configured: false,
    provider: "local-standby",
    model: "none",
    name: "Pulse AI",
  });
}
