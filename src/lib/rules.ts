// Pure rules: which platform can take which post shape. Shared by server and composer UI.
export type Platform = "instagram" | "facebook" | "youtube" | "tiktok";
export type Format = "reel" | "carousel";
export type Support = { ok: true } | { ok: false; reason: string };

export const CAROUSEL_MAX = 10;

export function supports(platform: string, format: Format, mimes: string[]): Support {
  const videos = mimes.filter((m) => m.startsWith("video/")).length;
  if (format === "reel") {
    if (mimes.length !== 1 || videos !== 1) return { ok: false, reason: "A reel needs exactly one video" };
    return { ok: true };
  }
  if (mimes.length < 2) return { ok: false, reason: "A carousel needs at least 2 items" };
  if (mimes.length > CAROUSEL_MAX) return { ok: false, reason: `A carousel takes up to ${CAROUSEL_MAX} items` };
  if (platform === "youtube") return { ok: false, reason: "YouTube only takes a single video (reel)" };
  if (videos && platform === "facebook") return { ok: false, reason: "Facebook carousels must be photos only" };
  if (videos && platform === "tiktok") return { ok: false, reason: "TikTok photo posts can't include videos" };
  return { ok: true };
}

/** Music is attached to Instagram carousels only. */
export const musicApplies = (platform: string, format: Format) => platform === "instagram" && format === "carousel";

/** Re-assign existing time slots to posts in their new order (queue drag & drop). */
export function reassignSlots(ordered: { id: string; at: number }[]) {
  const slots = ordered.map((p) => p.at).sort((a, b) => a - b);
  return ordered.map((p, i) => ({ id: p.id, at: slots[i] }));
}

export function aggregateStatus(targets: { enabled: boolean; status: string }[], enabled: boolean) {
  const live = targets.filter((t) => t.enabled && t.status !== "skipped");
  if (!enabled || live.length === 0) return "draft";
  const pub = live.filter((t) => t.status === "published").length;
  const fail = live.filter((t) => t.status === "failed").length;
  if (pub === live.length) return "published";
  if (fail === live.length) return "failed";
  if (fail) return "partial";
  if (pub) return "partial";
  return live.some((t) => t.status === "scheduled") ? "scheduled" : "draft";
}
