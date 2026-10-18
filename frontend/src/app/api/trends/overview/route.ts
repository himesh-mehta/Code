import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/trends/overview`, {
      method: "GET",
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err: any) {
    console.warn("Could not reach Python trends backend:", err.message);
  }

  // Fallback if backend is starting
  return NextResponse.json({
    status: "fallback",
    total_topics: 7,
    topics: [
      {
        topic: "AI and digital skills",
        current_weekly_mentions: 443,
        prev_weekly_mentions: 386,
        growth_pct: 14.8,
        momentum: "stable",
        total_engagement: 11420,
        sentiment_breakdown: { positive: 62.4, neutral: 24.1, negative: 13.5 },
        source_breakdown: { youtube: 228, gdelt: 215 },
        sparkline: [58, 62, 60, 65, 63, 67, 68],
        latest_date: new Date().toISOString().slice(0, 10),
        data_points_count: 90,
      },
      {
        topic: "Vocational training",
        current_weekly_mentions: 362,
        prev_weekly_mentions: 310,
        growth_pct: 16.8,
        momentum: "rising",
        total_engagement: 9480,
        sentiment_breakdown: { positive: 68.2, neutral: 21.5, negative: 10.3 },
        source_breakdown: { youtube: 184, gdelt: 178 },
        sparkline: [44, 46, 48, 52, 54, 58, 60],
        latest_date: new Date().toISOString().slice(0, 10),
        data_points_count: 90,
      },
      {
        topic: "Employability and job readiness",
        current_weekly_mentions: 395,
        prev_weekly_mentions: 390,
        growth_pct: 1.3,
        momentum: "stable",
        total_engagement: 8640,
        sentiment_breakdown: { positive: 41.5, neutral: 23.8, negative: 34.7 },
        source_breakdown: { youtube: 210, gdelt: 185 },
        sparkline: [56, 57, 55, 58, 56, 56, 57],
        latest_date: new Date().toISOString().slice(0, 10),
        data_points_count: 90,
      },
      {
        topic: "Internships and placements",
        current_weekly_mentions: 268,
        prev_weekly_mentions: 220,
        growth_pct: 21.8,
        momentum: "rising",
        total_engagement: 6210,
        sentiment_breakdown: { positive: 53.0, neutral: 26.5, negative: 20.5 },
        source_breakdown: { youtube: 142, gdelt: 126 },
        sparkline: [32, 34, 35, 38, 40, 43, 46],
        latest_date: new Date().toISOString().slice(0, 10),
        data_points_count: 90,
      },
      {
        topic: "Entrepreneurship",
        current_weekly_mentions: 184,
        prev_weekly_mentions: 175,
        growth_pct: 5.1,
        momentum: "stable",
        total_engagement: 4120,
        sentiment_breakdown: { positive: 58.4, neutral: 27.2, negative: 14.4 },
        source_breakdown: { youtube: 96, gdelt: 88 },
        sparkline: [25, 26, 26, 27, 26, 27, 27],
        latest_date: new Date().toISOString().slice(0, 10),
        data_points_count: 90,
      },
      {
        topic: "Youth education",
        current_weekly_mentions: 196,
        prev_weekly_mentions: 182,
        growth_pct: 7.7,
        momentum: "stable",
        total_engagement: 3890,
        sentiment_breakdown: { positive: 46.8, neutral: 29.1, negative: 24.1 },
        source_breakdown: { youtube: 104, gdelt: 92 },
        sparkline: [26, 27, 28, 28, 29, 29, 29],
        latest_date: new Date().toISOString().slice(0, 10),
        data_points_count: 90,
      },
      {
        topic: "Employer skill requirements",
        current_weekly_mentions: 172,
        prev_weekly_mentions: 148,
        growth_pct: 16.2,
        momentum: "rising",
        total_engagement: 3450,
        sentiment_breakdown: { positive: 51.2, neutral: 28.6, negative: 20.2 },
        source_breakdown: { youtube: 88, gdelt: 84 },
        sparkline: [20, 22, 23, 25, 26, 27, 29],
        latest_date: new Date().toISOString().slice(0, 10),
        data_points_count: 90,
      },
    ],
  });
}
