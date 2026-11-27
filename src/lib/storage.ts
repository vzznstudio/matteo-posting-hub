import path from "node:path";
import fs from "node:fs/promises";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");

export function filePath(fileName: string) {
  // fileName is generated server-side; basename guards against traversal anyway.
  return path.join(UPLOAD_DIR, path.basename(fileName));
}

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function publicMediaUrl(id: string, fileName: string) {
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  return `${base}/media/${id}${path.extname(fileName)}`;
}
