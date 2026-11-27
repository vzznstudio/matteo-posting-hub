import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushPost } from "@/lib/publish";
import { reassignSlots } from "@/lib/rules";

// Body: { ids: string[] } in the new queue order. Posts keep the same set of time slots;
// each post takes the slot of its new position, and moved posts are re-pushed to every platform.
export async function POST(req: Request) {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: "Nothing to reorder" }, { status: 400 });
  const posts = await db.post.findMany({ where: { id: { in: ids }, scheduledAt: { not: null }, status: { not: "published" } } });
  const byId = new Map(posts.map((p) => [p.id, p]));
  const ordered = ids
    .filter((id: string) => byId.has(id))
    .map((id: string) => ({ id, at: byId.get(id)!.scheduledAt!.getTime() }));
  const errors: string[] = [];
  for (const { id, at } of reassignSlots(ordered)) {
    const p = byId.get(id)!;
    if (p.scheduledAt!.getTime() === at) continue;
    await db.post.update({ where: { id }, data: { scheduledAt: new Date(at) } });
    if (p.enabled && at > Date.now()) {
      try {
        await pushPost(id, "schedule");
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
  }
  return NextResponse.json({ ok: true, errors });
}
