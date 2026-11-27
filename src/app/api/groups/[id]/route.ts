import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// Body: { name?, accountIds? } — accountIds is the full ordered membership.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { name, accountIds } = await req.json();
  await db.$transaction(async (tx) => {
    if (typeof name === "string" && name.trim()) {
      await tx.group.update({ where: { id }, data: { name: name.trim().slice(0, 60) } });
    }
    if (Array.isArray(accountIds)) {
      await tx.groupAccount.deleteMany({ where: { groupId: id } });
      await tx.groupAccount.createMany({
        data: accountIds.map((accountId: string, position: number) => ({ groupId: id, accountId, position })),
      });
    }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  await db.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
