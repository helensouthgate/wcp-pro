// /api/predict  (admin only) — "Generate now" button.
// Force an immediate prediction refresh, independent of the hourly schedule.

import { json, error, isAdmin } from "./lib/respond.js";
import { runPredictions } from "./lib/runPredictions.js";

export const config = { path: "/api/predict" };

export default async function handler(req) {
  if (req.method !== "POST") return error("Method not allowed", 405);
  if (!isAdmin(req)) return error("Unauthorized", 401);

  try {
    const result = await runPredictions();
    return json({ ok: true, ...result });
  } catch (e) {
    return error("Prediction failed: " + e.message, 502);
  }
}
