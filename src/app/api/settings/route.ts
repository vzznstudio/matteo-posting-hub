import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const clampDays = (v: unknown, min: number) => Math.max(min, Math.min(3650, Math.round(Number(v))));
const PRIVACY = { youtube: ["public", "unlisted", "private"], tiktok: ["public", "followers", "friends", "private"] };

export async function PATCH(req: Request) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (b.autoTrashDays !== undefined && Number.isFinite(Number(b.autoTrashDays))) data.autoTrashDays = clampDays(b.autoTrashDays, 0);
  if (b.purgeDays !== undefined && Number.isFinite(Number(b.purgeDays))) data.purgeDays = clampDays(b.purgeDays, 1);
  if (PRIVACY.youtube.includes(b.youtubePrivacy)) data.youtubePrivacy = b.youtubePrivacy;
  if (PRIVACY.tiktok.includes(b.tiktokPrivacy)) data.tiktokPrivacy = b.tiktokPrivacy;
  if (/^\d{2}:\d{2}$/.test(b.defaultPostTime ?? "")) data.defaultPostTime = b.defaultPostTime;
  if (typeof b.timezone === "string" && b.timezone.length < 60) data.timezone = b.timezone;
  return NextResponse.json(await db.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } }));
}
