import { Shell } from "@/components/Shell";
import { SetupClient } from "@/components/SetupClient";
import { syncAccounts } from "@/lib/accounts";
import { db } from "@/lib/db";
import { getAccounts, getGroups } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // First visit: pull accounts so the page is never empty on day one.
  if ((await db.account.count()) === 0) await syncAccounts();
  const [groups, accounts] = await Promise.all([getGroups(), getAccounts()]);
  return (
    <Shell>
      <SetupClient groups={groups} accounts={accounts} />
    </Shell>
  );
}
