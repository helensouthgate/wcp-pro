// /api/sync  (admin only) — manual "Sync now" button.
// Pulls the real fixture list + results from football-data.org via the shared
// runSync(). The API key never leaves the server. The same logic also runs on
// a 15-minute schedule (see sync-scheduled.js).

import { json, error, isAdmin } from "./lib/respond.js";
import { runSync } from "./lib/runSync.js";

export const config = { path: "/api/sync" };

export default async function handler(req) {
  if (req.method !== "POST") return error("Method not allowed", 405);
  if (!isAdmin(req)) return error("Unauthorized", 401);

  try {
    const result = await runSync();
    return json({ ok: true, ...result });
  } catch (e) {
    return error(e.message, 502);
  }
}
