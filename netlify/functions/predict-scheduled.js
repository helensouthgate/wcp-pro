// Scheduled function — runs daily at 06:00 UK time (05:00 UTC, BST) and kicks
// off the background prediction job. The launcher must finish within 30s; the
// heavy work runs in predict-background (up to 15 minutes).

import { invokePredictBackground } from "./lib/invokePredictBackground.js";

// Netlify cron is UTC-only. 05:00 UTC = 06:00 UK during British Summer Time.
export const config = { schedule: "0 5 * * *" };

export default async function handler() {
  try {
    await invokePredictBackground();
    console.log("[predict-scheduled] prediction job started");
  } catch (e) {
    console.error("[predict-scheduled] failed to start job:", e.message);
  }
  return new Response("ok");
}
