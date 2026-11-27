import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { name } = await req.json();
  const clean = String(name ?? "").trim().slice(0, 60);
  if (!clean) return NextResponse.json({ error: "Give the group a name" }, { status: 400 });
  const count = await db.group.count();
  return NextResponse.json(await db.group.create({ data: { name: clean, position: count } }));
}
