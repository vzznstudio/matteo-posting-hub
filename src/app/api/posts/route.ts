import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushPost } from "@/lib/publish";
import { CAROUSEL_MAX } from "@/lib/rules";

// Body: { groupId, format, caption, title, music, mediaIds[], scheduledAt|null, mode: "schedule"|"now"|"draft", excludedAccountIds[] }
export async function POST(req: Request) {
  const b = await req.json();
  if (b.format !== "reel" && b.format !== "carousel") return NextResponse.json({ error: "Choose Reel or Carousel" }, { status: 400 });
  const mediaIds: string[] = Array.isArray(b.mediaIds) ? b.mediaIds : [];
  if (!mediaIds.length) return NextResponse.json({ error: "Add at least one file" }, { status: 400 });
  if (mediaIds.length > CAROUSEL_MAX) return NextResponse.json({ error: `Up to ${CAROUSEL_MAX} files` }, { status: 400 });
  const files = await db.media.findMany({ where: { id: { in: mediaIds }, trashedAt: null }, select: { mime: true } });
  if (files.length !== mediaIds.length) return NextResponse.json({ error: "Some files are missing or in the bin" }, { status: 400 });
  const videos = files.filter((f) => f.mime.startsWith("video/")).length;
  if (b.format === "reel" && (files.length !== 1 || videos !== 1)) return NextResponse.json({ error: "A reel needs exactly one video" }, { status: 400 });
  if (b.format === "carousel" && files.length < 2) return NextResponse.json({ error: "A carousel needs at least 2 items" }, { status: 400 });
  const group = await db.group.findUnique({ where: { id: String(b.groupId) }, include: { accounts: true } });
  if (!group || !group.accounts.length) return NextResponse.json({ error: "Pick a group with accounts in it" }, { status: 400 });

  const excluded = new Set<string>(b.excludedAccountIds ?? []);
  const scheduledAt = b.scheduledAt ? new Date(b.scheduledAt) : null;
  if (b.mode === "schedule" && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    return NextResponse.json({ error: "Pick a date and time" }, { status: 400 });
  }

  const post = await db.post.create({
    data: {
      groupId: group.id,
      format: b.format,
      caption: String(b.caption ?? "").slice(0, 5000),
      title: String(b.title ?? "").slice(0, 100),
      music: b.format === "carousel" && b.music ? b.music : undefined,
      scheduledAt,
      enabled: b.mode !== "draft",
      media: { create: mediaIds.map((mediaId, position) => ({ mediaId, position })) },
      targets: { create: group.accounts.map((a) => ({ accountId: a.accountId, enabled: !excluded.has(a.accountId) })) },
    },
  });

  if (b.mode === "draft") return NextResponse.json(post);
  try {
    return NextResponse.json(await pushPost(post.id, b.mode === "now" ? "now" : "schedule"));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, id: post.id }, { status: 400 });
  }
}
