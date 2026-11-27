import fs from "node:fs/promises";
import { db, getSettings } from "./db";
import { filePath } from "./storage";

const DAY = 864e5;
// Media still needed by a post that has not finished publishing (Postforme fetches files at publish time).
const pendingUse = { posts: { some: { post: { status: { in: ["scheduled", "partial"] } } } } };

/** Auto-trash old files, then permanently delete files that sat in the bin past the purge window. */
export async function runCleanup() {
  const s = await getSettings();
  let trashed = 0;
  if (s.autoTrashDays > 0) {
    const r = await db.media.updateMany({
      where: { trashedAt: null, createdAt: { lt: new Date(Date.now() - s.autoTrashDays * DAY) }, NOT: pendingUse },
      data: { trashedAt: new Date() },
    });
    trashed = r.count;
  }
  const expired = await db.media.findMany({
    where: { trashedAt: { lt: new Date(Date.now() - s.purgeDays * DAY) }, NOT: pendingUse },
  });
  for (const m of expired) await purgeMedia(m.id, m.fileName);
  return { trashed, purged: expired.length };
}

export async function purgeMedia(id: string, fileName: string) {
  await db.postMedia.deleteMany({ where: { mediaId: id } });
  await db.media.delete({ where: { id } });
  await fs.rm(filePath(fileName), { force: true });
}
