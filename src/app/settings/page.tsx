import { Shell } from "@/components/Shell";
import { SettingsClient } from "@/components/SettingsClient";
import { db, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [s, accounts, groups, media, posts] = await Promise.all([
    getSettings(),
    db.account.count(),
    db.group.count(),
    db.media.count({ where: { trashedAt: null } }),
    db.post.count(),
  ]);
  return (
    <Shell>
      <SettingsClient
        settings={{
          autoTrashDays: s.autoTrashDays,
          purgeDays: s.purgeDays,
          youtubePrivacy: s.youtubePrivacy,
          tiktokPrivacy: s.tiktokPrivacy,
          defaultPostTime: s.defaultPostTime,
        }}
        stats={{ accounts, groups, media, posts }}
      />
    </Shell>
  );
}
