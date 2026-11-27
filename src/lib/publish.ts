import { db, getSettings } from "./db";
import { postiz } from "./postiz";
import { postforme } from "./postforme";
import { publicMediaUrl } from "./storage";
import { aggregateStatus, musicApplies, supports, type Format } from "./rules";

type FullPost = NonNullable<Awaited<ReturnType<typeof loadPost>>>;
type Target = FullPost["targets"][number];

export function loadPost(id: string) {
  return db.post.findUnique({
    where: { id },
    include: {
      media: { include: { media: true }, orderBy: { position: "asc" } },
      targets: { include: { account: true } },
    },
  });
}

async function postizMedia(post: FullPost) {
  const out: { id: string; path: string }[] = [];
  for (const { media } of post.media) {
    if (!media.postizPath) {
      const up = await postiz.upload(media.fileName, media.originalName, media.mime);
      await db.media.update({ where: { id: media.id }, data: { postizId: up.id, postizPath: up.path } });
      media.postizId = up.id;
      media.postizPath = up.path;
    }
    out.push({ id: media.postizId ?? media.id, path: media.postizPath! });
  }
  return out;
}

function postizSettings(post: FullPost, platform: string, privacy: string) {
  if (platform === "instagram") {
    const s: Record<string, unknown> = { __type: "instagram", post_type: "post", collaborators: [] };
    if (post.music && musicApplies(platform, post.format as Format)) s.audio = post.music;
    return s;
  }
  if (platform === "facebook") return { __type: "facebook", post_type: "post" };
  if (platform === "youtube") {
    const title = (post.title || post.caption.split("\n")[0] || "New video").slice(0, 100).padEnd(2, ".");
    return { __type: "youtube", title, type: privacy, selfDeclaredMadeForKids: "no", tags: [] };
  }
  return {};
}

function pfmBody(post: FullPost, accountExternalId: string, privacy: string, when: Date | null) {
  return {
    caption: post.caption,
    social_accounts: [accountExternalId],
    media: post.media.map(({ media }) => ({ url: publicMediaUrl(media.id, media.fileName) })),
    scheduled_at: when ? when.toISOString() : null,
    platform_configurations: {
      tiktok: { privacy_status: privacy, is_draft: false, ...(post.title ? { title: post.title.slice(0, 90) } : {}) },
    },
  };
}

async function removeRemote(t: Target) {
  if (!t.remoteId) return;
  try {
    if (t.account.provider === "postiz") await postiz.deletePost(t.remoteId);
    else await postforme.deletePost(t.remoteId);
  } catch (e) {
    // Already gone upstream is fine; anything else surfaces on the target.
    if (!/ 404/.test((e as Error).message)) throw e;
  }
}

/**
 * Push a post to every enabled target. "schedule" uses post.scheduledAt; "now" publishes immediately.
 * Existing remote copies are replaced, which is how schedule edits reach every platform.
 */
export async function pushPost(postId: string, mode: "schedule" | "now" = "schedule") {
  const post = await loadPost(postId);
  if (!post) throw new Error("Post not found");
  const settings = await getSettings();
  const when = mode === "now" ? null : post.scheduledAt;
  if (mode === "schedule" && (!when || when.getTime() < Date.now() - 60_000)) throw new Error("Pick a time in the future");
  const mimes = post.media.map((m) => m.media.mime);
  let cachedPostizMedia: { id: string; path: string }[] | null = null;

  for (const t of post.targets) {
    if (t.status === "published") continue;
    const fit = supports(t.account.platform, post.format as Format, mimes);
    if (!t.enabled || !fit.ok) {
      await removeRemote(t).catch(() => {});
      await db.postTarget.update({
        where: { id: t.id },
        data: { remoteId: null, status: fit.ok ? "pending" : "skipped", error: fit.ok ? null : fit.reason },
      });
      continue;
    }
    try {
      if (t.account.provider === "postiz") {
        await removeRemote(t);
        cachedPostizMedia ??= await postizMedia(post);
        const res = await postiz.createPost({
          type: mode === "now" ? "now" : "schedule",
          date: (when ?? new Date()).toISOString(),
          shortLink: false,
          tags: [],
          posts: [
            {
              integration: { id: t.account.externalId },
              value: [{ content: post.caption, image: cachedPostizMedia }],
              settings: postizSettings(post, t.account.platform, settings.youtubePrivacy),
            },
          ],
        });
        await db.postTarget.update({
          where: { id: t.id },
          data: { remoteId: res[0]?.postId ?? null, status: "scheduled", error: null },
        });
      } else {
        const body = pfmBody(post, t.account.externalId, settings.tiktokPrivacy, when);
        let res: { id: string };
        if (t.remoteId && mode === "schedule") {
          try {
            res = await postforme.updatePost(t.remoteId, body);
          } catch {
            await removeRemote(t);
            res = await postforme.createPost(body);
          }
        } else {
          await removeRemote(t);
          res = await postforme.createPost(body);
        }
        await db.postTarget.update({ where: { id: t.id }, data: { remoteId: res.id, status: "scheduled", error: null } });
      }
    } catch (e) {
      await db.postTarget.update({
        where: { id: t.id },
        data: { status: "failed", error: (e as Error).message.slice(0, 500) },
      });
    }
  }
  return refreshAggregate(postId, mode === "now" ? new Date() : undefined);
}

/** Pull a post off every platform but keep it locally (queue toggle off). */
export async function unschedulePost(postId: string) {
  const post = await loadPost(postId);
  if (!post) return;
  for (const t of post.targets) {
    if (t.status === "published") continue;
    await removeRemote(t);
    await db.postTarget.update({ where: { id: t.id }, data: { remoteId: null, status: "pending", error: null } });
  }
  await db.post.update({ where: { id: postId }, data: { enabled: false, status: "draft" } });
}

export async function deletePost(postId: string) {
  const post = await loadPost(postId);
  if (!post) return;
  for (const t of post.targets) if (t.status !== "published") await removeRemote(t).catch(() => {});
  await db.post.delete({ where: { id: postId } });
}

async function refreshAggregate(postId: string, publishedAt?: Date) {
  const post = await loadPost(postId);
  if (!post) return null;
  const status = aggregateStatus(post.targets, post.enabled);
  return db.post.update({
    where: { id: postId },
    data: { status, ...(publishedAt ? { scheduledAt: publishedAt } : {}) },
  });
}

/** Ask both providers what happened to targets whose time has passed. */
export async function syncStatuses() {
  const due = await db.postTarget.findMany({
    where: {
      status: "scheduled",
      remoteId: { not: null },
      post: { scheduledAt: { lte: new Date(Date.now() + 5 * 60_000) } },
    },
    include: { account: true, post: true },
    take: 50,
  });
  const touched = new Set<string>();
  for (const t of due) {
    try {
      if (t.account.provider === "postiz") {
        const at = t.post.scheduledAt ?? new Date();
        const { posts } = await postiz.listPosts(new Date(at.getTime() - 864e5), new Date(at.getTime() + 864e5));
        const p = posts.find((x) => x.id === t.remoteId);
        if (!p) continue;
        if (p.state === "PUBLISHED") {
          await db.postTarget.update({ where: { id: t.id }, data: { status: "published", url: p.releaseURL } });
        } else if (p.state === "ERROR") {
          await db.postTarget.update({
            where: { id: t.id },
            data: { status: "failed", error: p.error || "The platform rejected the post" },
          });
        } else continue;
      } else {
        const { data } = await postforme.results(t.remoteId!);
        if (!data.length) continue;
        const r = data[0];
        await db.postTarget.update({
          where: { id: t.id },
          data: r.success
            ? { status: "published", url: r.platform_data?.url ?? null }
            : { status: "failed", error: JSON.stringify(r.error).slice(0, 500) },
        });
      }
      touched.add(t.postId);
    } catch {
      // Provider hiccup: retried on the next sync.
    }
  }
  for (const id of touched) await refreshAggregate(id);
  return touched.size;
}
