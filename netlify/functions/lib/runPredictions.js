// Shared prediction runner used by both the manual /api/predict endpoint and
// the hourly scheduled function. Reads fixtures, generates predictions for the
// upcoming ones, merges them into state, and persists.

import { readState, writeState, readFixtures } from "./store.js";
import { generatePredictions } from "../../../lib/predictions.js";
import { mergeManualScores } from "../../../lib/fixtures.js";

export async function runPredictions() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const [state, rawFixtures] = await Promise.all([readState(), readFixtures()]);
  const fixtures = mergeManualScores(rawFixtures, state.manualScores);

  const fresh = await generatePredictions(fixtures, { apiKey });
  const count = Object.keys(fresh).length;

  state.predictions = { ...state.predictions, ...fresh };
  state.lastPrediction = new Date().toISOString();
  await writeState(state);

  return { count, ranAt: state.lastPrediction };
}
