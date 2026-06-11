// /api/state
//   GET  (public) → everything the UI needs to render (read-only)
//   POST (admin)  → mutate manual scores / elimination overrides
//
// Eliminations are recomputed from results on every read, so the public view is
// always derived & consistent; admin overrides are layered on top.

import { json, error, isAdmin } from "./lib/respond.js";
import { readState, writeState, readFixtures } from "./lib/store.js";
import { computeEliminated } from "../../lib/standings.js";
import { mergeManualScores, sortByDate } from "../../lib/fixtures.js";
import { applyOverrides, parseScoreAction } from "../../lib/state.js";
import { GROUPS, DRAW } from "../../lib/data.js";

export const config = { path: "/api/state" };

export default async function handler(req) {
  if (req.method === "GET") return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  return error("Method not allowed", 405);
}

async function buildView(req) {
  const [state, rawFixtures] = await Promise.all([readState(), readFixtures()]);
  const fixtures = sortByDate(mergeManualScores(rawFixtures, state.manualScores));
  const { eliminated, tables, thirdsRanked, allGroupsComplete } = computeEliminated(fixtures);
  const view = {
    groups: GROUPS,
    draw: DRAW,
    fixtures,
    predictions: state.predictions,
    eliminated: applyOverrides(eliminated, state),
    tables,
    thirdsRanked,
    allGroupsComplete,
    lastUpdated: state.lastUpdated,
    lastSync: state.lastSync,
    lastPrediction: state.lastPrediction
  };
  if (req && isAdmin(req)) {
    view.lastPredictionCost = state.lastPredictionCost ?? null;
    view.predictionJob = state.predictionJob ?? null;
  }
  return view;
}

async function handleGet(req) {
  try {
    return json(await buildView(req));
  } catch (e) {
    return error("Failed to load state: " + e.message, 500);
  }
}

async function handlePost(req) {
  if (!isAdmin(req)) return error("Unauthorized", 401);

  let body;
  try { body = await req.json(); } catch { return error("Invalid JSON body"); }
  const action = body?.action;
  const state = await readState();

  try {
    switch (action) {
      case "setScore": {
        const { id, home, away } = parseScoreAction(body);
        state.manualScores = { ...state.manualScores, [id]: { home, away } };
        break;
      }
      case "clearScore": {
        if (typeof body.id !== "string") return error("Invalid fixture id");
        const next = { ...state.manualScores };
        delete next[body.id];
        state.manualScores = next;
        break;
      }
      case "eliminate": {
        if (typeof body.team !== "string") return error("Invalid team");
        state.manualOut = [...new Set([...(state.manualOut || []), body.team])];
        state.manualIn = (state.manualIn || []).filter((t) => t !== body.team);
        break;
      }
      case "restore": {
        if (typeof body.team !== "string") return error("Invalid team");
        state.manualIn = [...new Set([...(state.manualIn || []), body.team])];
        state.manualOut = (state.manualOut || []).filter((t) => t !== body.team);
        break;
      }
      case "clearOverride": {
        if (typeof body.team !== "string") return error("Invalid team");
        state.manualOut = (state.manualOut || []).filter((t) => t !== body.team);
        state.manualIn = (state.manualIn || []).filter((t) => t !== body.team);
        break;
      }
      default:
        return error("Unknown action");
    }
  } catch (e) {
    return error(e.message);
  }

  await writeState(state);
  return json(await buildView(req));
}
