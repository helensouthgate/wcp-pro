// /api/predict  (admin only) — "Generate now" button.
// Clears cached predictions and starts a background regeneration job (202).

import { json, error, isAdmin } from "./lib/respond.js";
import { invokePredictBackground } from "./lib/invokePredictBackground.js";

export const config = { path: "/api/predict" };

export default async function handler(req) {
  if (req.method !== "POST") return error("Method not allowed", 405);
  if (!isAdmin(req)) return error("Unauthorized", 401);

  try {
    const origin = new URL(req.url).origin;
    await invokePredictBackground({ origin });
    return json({ ok: true, started: true }, 202);
  } catch (e) {
    return error("Prediction failed: " + e.message, 502);
  }
}
