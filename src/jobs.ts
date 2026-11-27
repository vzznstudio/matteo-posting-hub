// Background jobs inside the single Node server: recycle-bin cleanup hourly, publish-status sync every 5 minutes.
import { runCleanup } from "./lib/cleanup";
import { syncStatuses } from "./lib/publish";

const safe = (fn: () => Promise<unknown>, label: string) => () =>
  fn().catch((e) => console.error(`[${label}]`, (e as Error).message));

if (process.env.DATABASE_URL) {
  setInterval(safe(runCleanup, "cleanup"), 60 * 60 * 1000);
  setInterval(safe(syncStatuses, "status-sync"), 5 * 60 * 1000);
  setTimeout(safe(runCleanup, "cleanup"), 30_000);
}
