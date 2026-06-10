// ─── NETLIFY BLOBS STORE ─────────────────────────────────────────────────────
// Thin persistence layer over Netlify Blobs. Two keys in one store:
//   state    — the small mutable document (manual scores, predictions, overrides)
//   fixtures — the synced fixture list from football-data.org
// This module is the only place that touches Blobs; everything else is pure.

import { getStore } from "@netlify/blobs";
import { DEFAULT_STATE, DEFAULT_FIXTURES, withDefaults } from "../../../lib/state.js";

const STORE_NAME = "wcp";
const STATE_KEY = "state";
const FIXTURES_KEY = "fixtures";

function store() {
  return getStore(STORE_NAME);
}

export async function readState() {
  const raw = await store().get(STATE_KEY, { type: "json" });
  return withDefaults(raw);
}

export async function writeState(state) {
  const next = { ...state, lastUpdated: new Date().toISOString() };
  await store().setJSON(STATE_KEY, next);
  return next;
}

export async function readFixtures() {
  const raw = await store().get(FIXTURES_KEY, { type: "json" });
  return Array.isArray(raw) ? raw : DEFAULT_FIXTURES;
}

export async function writeFixtures(fixtures) {
  await store().setJSON(FIXTURES_KEY, fixtures);
  return fixtures;
}

export { DEFAULT_STATE };
