// Scheduled function — runs every hour to refresh AI predictions for upcoming
// fixtures. No request body; triggered by Netlify's cron. The public page only
// ever reads these cached predictions, so visitors never trigger API calls.

import { runPredictions } from "./lib/runPredictions.js";

export const config = { schedule: "@hourly" };

export default async function handler() {
  try {
    const result = await runPredictions();
    console.log(`[predict-scheduled] refreshed ${result.count} predictions at ${result.ranAt}`);
  } catch (e) {
    console.error("[predict-scheduled] failed:", e.message);
  }
  return new Response("ok");
}
