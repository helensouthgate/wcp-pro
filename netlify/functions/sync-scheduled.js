// Scheduled function — syncs fixtures + results from football-data.org every
// 15 minutes. This auto-populates the site shortly after a deploy and keeps
// scores and (derived) eliminations fresh during live matches. Invoked by
// Netlify's scheduler, so no auth is involved.

import { runSync } from "./lib/runSync.js";

export const config = { schedule: "*/15 * * * *" };

export default async function handler() {
  try {
    const r = await runSync();
    console.log(`[sync-scheduled] ${r.total} fixtures (${r.played} played) at ${r.syncedAt}`);
  } catch (e) {
    console.error("[sync-scheduled] failed:", e.message);
  }
  return new Response("ok");
}
