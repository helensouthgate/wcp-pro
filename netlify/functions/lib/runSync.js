// Shared sync runner used by both the manual /api/sync endpoint and the
// scheduled sync function. Pulls fixtures + results from football-data.org,
// transforms them, and persists to Blobs. Dependencies are injectable so this
// can be unit-tested without network or a live Blobs store.

import { transformApiMatches } from "../../../lib/fixtures.js";
import { FOOTBALL_DATA_COMPETITION } from "../../../lib/data.js";
import * as store from "./store.js";

const API_BASE = "https://api.football-data.org/v4";

export async function runSync({
  apiKey = process.env.FOOTBALL_DATA_API_KEY,
  fetchImpl = fetch,
  readState = store.readState,
  writeState = store.writeState,
  writeFixtures = store.writeFixtures
} = {}) {
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY not configured");

  const resp = await fetchImpl(
    `${API_BASE}/competitions/${FOOTBALL_DATA_COMPETITION}/matches`,
    { headers: { "X-Auth-Token": apiKey } }
  );
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`football-data API error ${resp.status}: ${detail}`.trim());
  }

  const payload = await resp.json();
  const fixtures = transformApiMatches(payload);
  await writeFixtures(fixtures);

  const state = await readState();
  state.lastSync = new Date().toISOString();
  await writeState(state);

  const played = fixtures.filter((f) => f.played).length;
  return { total: fixtures.length, played, syncedAt: state.lastSync };
}
