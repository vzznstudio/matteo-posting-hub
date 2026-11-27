import { NextResponse } from "next/server";
import { runCleanup } from "@/lib/cleanup";

export async function POST() {
  return NextResponse.json(await runCleanup());
}
