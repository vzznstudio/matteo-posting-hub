import { Shell } from "@/components/Shell";
import { QueueClient } from "@/components/QueueClient";
import { getGroups, getPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const [posts, groups] = await Promise.all([getPosts(), getGroups()]);
  return (
    <Shell>
      <QueueClient posts={posts} groups={groups} />
    </Shell>
  );
}
