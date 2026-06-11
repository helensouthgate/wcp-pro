// Kick off the long-running predict-background function. Used by the admin
// /api/predict endpoint and the daily predict-scheduled launcher.

const JOB_HEADER = "x-predict-job";

export function predictBackgroundUrl(origin) {
  const base = origin || process.env.URL || "http://localhost:8888";
  return `${base.replace(/\/$/, "")}/.netlify/functions/predict-background`;
}

export async function invokePredictBackground({ origin, fetchImpl = fetch } = {}) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET not configured");

  const resp = await fetchImpl(predictBackgroundUrl(origin), {
    method: "POST",
    headers: { [JOB_HEADER]: secret }
  });

  if (resp.status !== 202) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Failed to start prediction job (${resp.status})${detail ? `: ${detail}` : ""}`);
  }
}
