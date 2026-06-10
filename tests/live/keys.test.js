// ─── LIVE API-KEY HEALTH CHECKS ──────────────────────────────────────────────
// These hit the real football-data.org and Anthropic APIs to confirm the keys
// in .env actually work. They are NOT part of `npm test` (which stays offline).
//
//   Run with:  npm run test:keys
//   (loads .env via `node --env-file=.env`)
//
// The Anthropic check SKIPS automatically while ANTHROPIC_API_KEY is still the
// placeholder, so this command passes today with just the football-data key.

import { test } from "node:test";
import assert from "node:assert/strict";

const fdKey = process.env.FOOTBALL_DATA_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

const fdMissing = !fdKey || fdKey.startsWith("example");
const anthropicMissing = !anthropicKey || anthropicKey.startsWith("sk-ant-example");

async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

test("football-data.org API key is valid", {
  skip: fdMissing ? "FOOTBALL_DATA_API_KEY not set in .env" : false,
  timeout: 25000
}, async () => {
  const resp = await fetchWithTimeout(
    "https://api.football-data.org/v4/competitions/WC",
    { headers: { "X-Auth-Token": fdKey } }
  );
  assert.equal(resp.status, 200, `expected HTTP 200, got ${resp.status} — key likely invalid or lacks access`);
  const data = await resp.json();
  assert.equal(data.code, "WC", "expected the World Cup competition payload");
});

test("football-data.org returns the World Cup match list", {
  skip: fdMissing ? "FOOTBALL_DATA_API_KEY not set in .env" : false,
  timeout: 25000
}, async () => {
  const resp = await fetchWithTimeout(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": fdKey } }
  );
  assert.equal(resp.status, 200, `expected HTTP 200, got ${resp.status}`);
  const data = await resp.json();
  assert.ok(Array.isArray(data.matches) && data.matches.length > 0, "expected a non-empty matches array");
});

test("Anthropic API key is valid", {
  skip: anthropicMissing ? "ANTHROPIC_API_KEY not set yet (placeholder) — add a real key then re-run" : false,
  timeout: 25000
}, async () => {
  const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4,
      messages: [{ role: "user", content: "Reply with the word: ok" }]
    })
  });
  assert.equal(resp.status, 200, `expected HTTP 200, got ${resp.status} — key likely invalid`);
  const data = await resp.json();
  assert.equal(data.type, "message", "expected a Messages API response");
});
