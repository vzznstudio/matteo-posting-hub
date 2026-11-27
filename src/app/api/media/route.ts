import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { ensureUploadDir, filePath } from "@/lib/storage";

const ALLOWED = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/;

// Raw streamed upload (no multipart buffering) so large reels don't sit in memory.
// Query: name, type, w, h, d (dimensions/duration measured in the browser).
export async function PUT(req: Request) {
  const q = new URL(req.url).searchParams;
  const mime = q.get("type") || "";
  const originalName = (q.get("name") || "upload").slice(0, 200);
  if (!ALLOWED.test(mime)) {
    return NextResponse.json({ error: "Only images (JPG, PNG, WEBP, GIF) and videos (MP4, MOV, WEBM)" }, { status: 415 });
  }
  if (!req.body) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  await ensureUploadDir();
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "") || "." + mime.split("/")[1];
  const fileName = randomUUID() + ext;
  const dest = filePath(fileName);
  try {
    await pipeline(Readable.fromWeb(req.body as never), fs.createWriteStream(dest));
  } catch {
    fs.rmSync(dest, { force: true });
    return NextResponse.json({ error: "Upload interrupted, try again" }, { status: 400 });
  }
  const size = fs.statSync(dest).size;
  const num = (k: string) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const w = num("w"), h = num("h");
  const media = await db.media.create({
    data: {
      fileName, originalName, mime, size: BigInt(size),
      width: w ? Math.round(w) : null, height: h ? Math.round(h) : null, duration: num("d"),
    },
  });
  return NextResponse.json({ ...media, size });
}
