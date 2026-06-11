// Shared prediction runner used by predict-background. Regenerates predictions for
// unplayed fixtures in the prediction window (same scope for cron and admin generate).

import { readState, writeState, readFixtures } from "./store.js";
import { generatePredictions, fixturesInPredictionWindow, PREDICTION_WINDOW_DAYS } from "../../../lib/predictions.js";
import { mergeManualScores } from "../../../lib/fixtures.js";
import { DRAW } from "../../../lib/data.js";
import {
  createRunningJob,
  createCompletedJob,
  createFailedJob
} from "../../../lib/predictionJob.js";

export async function runPredictions() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const startedAt = new Date().toISOString();
  let state = await readState();
  state.predictionJob = createRunningJob(startedAt);
  await writeState(state);

  try {
    const rawFixtures = await readFixtures();
    const fixtures = mergeManualScores(rawFixtures, state.manualScores);
    const windowFixtures = fixturesInPredictionWindow(fixtures);
    const windowIds = new Set(windowFixtures.map((fx) => fx.id));

    for (const id of windowIds) {
      delete state.predictions[id];
    }
    await writeState(state);

    const { predictions: fresh, cost } = await generatePredictions(windowFixtures, {
      apiKey,
      existingPredictions: state.predictions,
      allFixtures: fixtures,
      draw: DRAW,
      onBatchComplete: async ({ batch, batches }) => {
        state = await readState();
        if (state.predictionJob?.status === "running") {
          state.predictionJob = { ...state.predictionJob, batch, batches };
          await writeState(state);
        }
      }
    });
    const count = Object.keys(fresh).length;

    state = await readState();
    state.predictions = { ...state.predictions, ...fresh };
    state.lastPrediction = new Date().toISOString();
    state.lastPredictionCost = {
      ...cost,
      at: state.lastPrediction,
      scopedFixtures: windowFixtures.length,
      windowDays: PREDICTION_WINDOW_DAYS
    };
    state.predictionJob = createCompletedJob(startedAt, state.lastPrediction);
    await writeState(state);

    console.log(
      `[runPredictions] ${count}/${windowFixtures.length} predictions (next ${PREDICTION_WINDOW_DAYS} days), ` +
      `${cost.batches} batches, est. ${cost.formatted}`
    );

    return {
      count,
      scoped: windowFixtures.length,
      ranAt: state.lastPrediction,
      cost: state.lastPredictionCost
    };
  } catch (err) {
    try {
      state = await readState();
      state.predictionJob = createFailedJob(startedAt, err);
      await writeState(state);
    } catch (writeErr) {
      console.error("[runPredictions] could not persist job failure:", writeErr.message);
    }
    throw err;
  }
}
