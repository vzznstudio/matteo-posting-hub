import fs from "node:fs";
import { Readable } from "node:stream";
import { db } from "@/lib/db";
import { filePath } from "@/lib/storage";

type Ctx = { params: Promise<{ file: string }> };

// Public, unguessable URL (/media/<cuid>.<ext>) so Postforme can fetch files. Range support for video scrubbing.
export async function GET(req: Request, { params }: Ctx) {
  const { file } = await params;
  const id = file.replace(/\.[a-z0-9]+$/i, "");
  const m = await db.media.findUnique({ where: { id } });
  if (!m) return new Response("Not found", { status: 404 });
  const p = filePath(m.fileName);
  if (!fs.existsSync(p)) return new Response("Gone", { status: 410 });
  const size = fs.statSync(p).size;
  const headers: Record<string, string> = {
    "Content-Type": m.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(p, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(p)) as ReadableStream, {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
