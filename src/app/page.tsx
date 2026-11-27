import { Shell } from "@/components/Shell";
import { Composer } from "@/components/Composer";
import { getSettings } from "@/lib/db";
import { getGroups, getMedia } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const [groups, library, settings] = await Promise.all([getGroups(), getMedia(false), getSettings()]);
  return (
    <Shell>
      <Composer groups={groups} library={library} defaultTime={settings.defaultPostTime} />
    </Shell>
  );
}
