import { NextResponse } from "next/server";
import { getMetaConfigStatus } from "@/lib/meta";

export const runtime = "nodejs";

export async function GET() {
  const status = getMetaConfigStatus();
  return NextResponse.json(status);
}
