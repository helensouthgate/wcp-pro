// Background function — runs runPredictions() (Sonnet, next 14 days). Invoked by
// /api/predict (admin) and predict-scheduled (daily cron).
// Not exposed on a custom /api path; callers must pass x-predict-job.

import { runPredictions } from "./lib/runPredictions.js";

const JOB_HEADER = "x-predict-job";

export const config = { background: true };

export default async function handler(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const provided = req.headers.get(JOB_HEADER);
  if (!secret || provided !== secret) {
    console.warn("[predict-background] rejected unauthorized invocation");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runPredictions();
    console.log(`[predict-background] refreshed ${result.count} predictions at ${result.ranAt}`);
  } catch (e) {
    console.error("[predict-background] failed:", e.message);
    throw e;
  }
}
