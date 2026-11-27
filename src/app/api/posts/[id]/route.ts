import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deletePost, pushPost, unschedulePost } from "@/lib/publish";

type Ctx = { params: Promise<{ id: string }> };

const fail = (e: unknown) => NextResponse.json({ error: (e as Error).message }, { status: 400 });

// Body: { scheduledAt?, enabled?, caption?, title?, targets?: {accountId, enabled}[] }
// Any change to a live post is re-pushed to every platform.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = await req.json();
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status === "published") return NextResponse.json({ error: "Already published" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (b.scheduledAt !== undefined) data.scheduledAt = b.scheduledAt ? new Date(b.scheduledAt) : null;
  if (typeof b.caption === "string") data.caption = b.caption.slice(0, 5000);
  if (typeof b.title === "string") data.title = b.title.slice(0, 100);
  if (typeof b.enabled === "boolean") data.enabled = b.enabled;
  await db.post.update({ where: { id }, data });
  if (Array.isArray(b.targets)) {
    for (const t of b.targets) {
      await db.postTarget.updateMany({ where: { postId: id, accountId: t.accountId }, data: { enabled: !!t.enabled } });
    }
  }

  try {
    const fresh = await db.post.findUniqueOrThrow({ where: { id } });
    if (!fresh.enabled) {
      await unschedulePost(id);
      return NextResponse.json(await db.post.findUnique({ where: { id } }));
    }
    if (!fresh.scheduledAt) return NextResponse.json(fresh);
    return NextResponse.json(await pushPost(id, "schedule"));
  } catch (e) {
    return fail(e);
  }
}

// Publish now.
export async function POST(_: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await db.post.update({ where: { id }, data: { enabled: true } });
    return NextResponse.json(await pushPost(id, "now"));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
