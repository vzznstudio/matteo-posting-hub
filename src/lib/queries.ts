import "server-only";
import { db } from "./db";
import { mediaUrl, PLATFORM_ORDER, type AccountDTO, type GroupDTO, type MediaDTO, type PostDTO, type Track } from "./types";

type AccountRow = { id: string; provider: string; platform: string; name: string; handle: string | null; avatar: string | null; status: string };
const toAccount = (a: AccountRow): AccountDTO => ({
  id: a.id, provider: a.provider, platform: a.platform, name: a.name, handle: a.handle, avatar: a.avatar, status: a.status,
});

type MediaRow = {
  id: string; fileName: string; mime: string; originalName: string; size: bigint; width: number | null; height: number | null;
  duration: number | null; createdAt: Date; trashedAt: Date | null;
};
export const toMedia = (m: MediaRow): MediaDTO => ({
  id: m.id, url: mediaUrl(m.id, m.fileName), mime: m.mime, originalName: m.originalName, size: Number(m.size),
  width: m.width, height: m.height, duration: m.duration, createdAt: m.createdAt.toISOString(),
  trashedAt: m.trashedAt?.toISOString() ?? null,
});

export async function getAccounts() {
  const rows = await db.account.findMany({ orderBy: [{ name: "asc" }] });
  return rows
    .map(toAccount)
    .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
}

export async function getGroups(): Promise<GroupDTO[]> {
  const groups = await db.group.findMany({
    orderBy: { position: "asc" },
    include: { accounts: { include: { account: true }, orderBy: { position: "asc" } } },
  });
  return groups.map((g) => ({ id: g.id, name: g.name, accounts: g.accounts.map((ga) => toAccount(ga.account)) }));
}

export async function getMedia(trashed: boolean) {
  const rows = await db.media.findMany({
    where: { trashedAt: trashed ? { not: null } : null },
    orderBy: trashed ? { trashedAt: "desc" } : { createdAt: "desc" },
  });
  return rows.map(toMedia);
}

export async function getPosts(): Promise<PostDTO[]> {
  const posts = await db.post.findMany({
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    include: {
      group: true,
      media: { include: { media: true }, orderBy: { position: "asc" } },
      targets: { include: { account: true } },
    },
  });
  return posts.map((p) => ({
    id: p.id,
    groupId: p.groupId,
    groupName: p.group?.name ?? null,
    format: p.format as PostDTO["format"],
    caption: p.caption,
    title: p.title,
    music: (p.music as Track | null) ?? null,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    enabled: p.enabled,
    status: p.status,
    media: p.media.map((pm) => toMedia(pm.media)),
    targets: p.targets
      .map((t) => ({ accountId: t.accountId, enabled: t.enabled, status: t.status, error: t.error, url: t.url, account: toAccount(t.account) }))
      .sort((a, b) => PLATFORM_ORDER.indexOf(a.account.platform) - PLATFORM_ORDER.indexOf(b.account.platform)),
  }));
}
