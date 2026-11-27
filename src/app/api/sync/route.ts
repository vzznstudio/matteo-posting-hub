import { NextResponse } from "next/server";
import { syncStatuses } from "@/lib/publish";

export async function POST() {
  return NextResponse.json({ updated: await syncStatuses() });
}
