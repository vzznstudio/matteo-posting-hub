import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purgeMedia } from "@/lib/cleanup";

type Ctx = { params: Promise<{ id: string }> };

// { action: "trash" | "restore" }
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { action } = await req.json();
  await db.media.update({ where: { id }, data: { trashedAt: action === "trash" ? new Date() : null } });
  return NextResponse.json({ ok: true });
}

// Permanent delete, only from the bin.
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  const m = await db.media.findUnique({ where: { id } });
  if (!m) return NextResponse.json({ ok: true });
  if (!m.trashedAt) return NextResponse.json({ error: "Move it to the bin first" }, { status: 400 });
  const pending = await db.postMedia.count({
    where: { mediaId: id, post: { status: { in: ["scheduled", "partial"] } } },
  });
  if (pending) return NextResponse.json({ error: "A scheduled post still uses this file" }, { status: 409 });
  await purgeMedia(m.id, m.fileName);
  return NextResponse.json({ ok: true });
}
