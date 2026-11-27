import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { postiz } from "@/lib/postiz";

// Instagram audio search through Postiz. Query: accountId (an Instagram account), q (empty = trending).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const account = await db.account.findUnique({ where: { id: q.get("accountId") || "" } });
  if (!account || account.platform !== "instagram" || account.provider !== "postiz") {
    return NextResponse.json({ error: "Music needs an Instagram account in this group" }, { status: 400 });
  }
  try {
    const res = await postiz.audioSearch(account.externalId, q.get("q") || "");
    if (res.msg) {
      const msg = /expired token|disconnected/i.test(res.msg)
        ? `${account.name}'s Instagram connection has expired. Reconnect it in Postiz, then press Refresh in Setup.`
        : res.msg;
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const raw = Array.isArray(res.output) ? res.output : ((res.output as { data?: unknown[] })?.data ?? []);
    const tracks = (raw as Record<string, unknown>[])
      .map((t) => ({
        id: String(t.id ?? t.audio_id ?? ""),
        title: String(t.title ?? t.name ?? "Untitled"),
        artist: String(t.artist ?? t.display_artist ?? t.artist_name ?? ""),
        image: String(t.image ?? t.cover_artwork_uri ?? t.thumbnail ?? ""),
      }))
      .filter((t) => t.id);
    return NextResponse.json({ tracks });
  } catch (e) {
    const raw = (e as Error).message;
    const msg = /expired token|disconnected/i.test(raw)
      ? `${account.name}'s Instagram connection has expired. Reconnect it in Postiz, then press Refresh in Setup.`
      : raw;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
