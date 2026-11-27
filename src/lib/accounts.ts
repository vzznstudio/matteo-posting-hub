import { db } from "./db";
import { postiz } from "./postiz";
import { postforme } from "./postforme";

const POSTIZ_PLATFORMS = new Set(["instagram", "instagram-standalone", "facebook", "youtube"]);

/** Pull channels from both providers into the Account table. Missing ones are marked disconnected, never deleted. */
export async function syncAccounts() {
  const seen = new Set<string>();
  const errors: string[] = [];

  try {
    for (const i of await postiz.integrations()) {
      if (!POSTIZ_PLATFORMS.has(i.identifier)) continue;
      const platform = i.identifier.startsWith("instagram") ? "instagram" : i.identifier;
      const data = {
        provider: "postiz",
        platform,
        name: i.name.trim(),
        handle: i.profile || null,
        avatar: i.picture || null,
        status: i.disabled ? "disconnected" : "connected",
        lastSyncedAt: new Date(),
      };
      await db.account.upsert({ where: { externalId: i.id }, update: data, create: { externalId: i.id, ...data } });
      seen.add(i.id);
    }
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    const { data } = await postforme.accounts();
    for (const a of data) {
      if (a.platform !== "tiktok") continue;
      const row = {
        provider: "postforme",
        platform: "tiktok",
        name: a.username ?? "TikTok",
        handle: a.username,
        avatar: a.profile_photo_url,
        status: a.status === "connected" ? "connected" : "disconnected",
        lastSyncedAt: new Date(),
      };
      await db.account.upsert({ where: { externalId: a.id }, update: row, create: { externalId: a.id, ...row } });
      seen.add(a.id);
    }
  } catch (e) {
    errors.push((e as Error).message);
  }

  // Only mark missing when both providers answered, so an outage never hides accounts.
  if (!errors.length) {
    await db.account.updateMany({ where: { externalId: { notIn: [...seen] } }, data: { status: "disconnected" } });
  }
  return { count: seen.size, errors };
}
