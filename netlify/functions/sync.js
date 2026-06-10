// /api/sync  (admin only)
// Pull the real fixture list + results from football-data.org, transform them
// to our model, and persist to Blobs. The API key never leaves the server.

import { json, error, isAdmin } from "./lib/respond.js";
import { readState, writeState, writeFixtures } from "./lib/store.js";
import { transformApiMatches } from "../../lib/fixtures.js";
import { FOOTBALL_DATA_COMPETITION } from "../../lib/data.js";

export const config = { path: "/api/sync" };

const API_BASE = "https://api.football-data.org/v4";

export default async function handler(req) {
  if (req.method !== "POST") return error("Method not allowed", 405);
  if (!isAdmin(req)) return error("Unauthorized", 401);

  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return error("FOOTBALL_DATA_API_KEY not configured", 500);

  let payload;
  try {
    const resp = await fetch(
      `${API_BASE}/competitions/${FOOTBALL_DATA_COMPETITION}/matches`,
      { headers: { "X-Auth-Token": key } }
    );
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return error(`football-data API error ${resp.status}: ${detail}`.trim(), 502);
    }
    payload = await resp.json();
  } catch (e) {
    return error("Could not reach football-data API: " + e.message, 502);
  }

  const fixtures = transformApiMatches(payload);
  await writeFixtures(fixtures);

  const state = await readState();
  state.lastSync = new Date().toISOString();
  await writeState(state);

  const played = fixtures.filter((f) => f.played).length;
  return json({ ok: true, total: fixtures.length, played, syncedAt: state.lastSync });
}
