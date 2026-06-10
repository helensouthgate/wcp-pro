import { test } from "node:test";
import assert from "node:assert/strict";
import { runSync } from "../netlify/functions/lib/runSync.js";

const payload = {
  matches: [
    {
      id: 1, utcDate: "2026-06-11T19:00:00Z", status: "FINISHED", stage: "GROUP_STAGE",
      homeTeam: { name: "Mexico" }, awayTeam: { name: "South Africa" },
      score: { winner: "HOME_TEAM", fullTime: { home: 2, away: 1 } }
    },
    {
      id: 2, utcDate: "2026-06-12T02:00:00Z", status: "TIMED", stage: "GROUP_STAGE",
      homeTeam: { name: "Korea Republic" }, awayTeam: { name: "Czechia" },
      score: { winner: null, fullTime: { home: null, away: null } }
    }
  ]
};

function harness(fetchImpl) {
  const captured = { fixtures: null, state: null };
  return {
    captured,
    deps: {
      apiKey: "test-key",
      fetchImpl,
      readState: async () => ({ lastSync: null, predictions: {} }),
      writeState: async (s) => { captured.state = s; },
      writeFixtures: async (f) => { captured.fixtures = f; }
    }
  };
}

test("runSync transforms the API payload and persists fixtures", async () => {
  let authHeader = null;
  const fetchImpl = async (url, opts) => {
    authHeader = opts.headers["X-Auth-Token"];
    assert.match(url, /competitions\/WC\/matches/);
    return { ok: true, json: async () => payload };
  };
  const { captured, deps } = harness(fetchImpl);
  const result = await runSync(deps);

  assert.equal(authHeader, "test-key");
  assert.equal(result.total, 2);
  assert.equal(result.played, 1);
  assert.equal(captured.fixtures.length, 2);
  assert.equal(captured.fixtures[0].home, "Mexico");
  assert.equal(captured.fixtures[1].away, "Czech Republic"); // name-mapped
  assert.ok(captured.state.lastSync, "lastSync timestamp recorded");
});

test("runSync throws without an API key", async () => {
  await assert.rejects(() => runSync({ apiKey: "" }), /not configured/);
});

test("runSync surfaces API errors", async () => {
  const fetchImpl = async () => ({ ok: false, status: 403, text: async () => "forbidden" });
  const { deps } = harness(fetchImpl);
  await assert.rejects(() => runSync(deps), /403/);
});

test("runSync does not write when the API call fails", async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => "rate limited" });
  const { captured, deps } = harness(fetchImpl);
  await assert.rejects(() => runSync(deps));
  assert.equal(captured.fixtures, null);
  assert.equal(captured.state, null);
});
