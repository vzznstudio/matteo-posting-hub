import { Shell } from "@/components/Shell";
import { GalleryClient } from "@/components/GalleryClient";
import { getSettings } from "@/lib/db";
import { getMedia } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [library, bin, s] = await Promise.all([getMedia(false), getMedia(true), getSettings()]);
  return (
    <Shell>
      <GalleryClient library={library} bin={bin} autoTrashDays={s.autoTrashDays} purgeDays={s.purgeDays} />
    </Shell>
  );
}
