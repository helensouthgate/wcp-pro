// ─── PREDICTION JOB STATUS ───────────────────────────────────────────────────
// Tracks background prediction runs for admin visibility (running / failed / done).

export function sanitizePredictionError(err) {
  const msg = (err && err.message) ? err.message : String(err || "Unknown error");
  const api = msg.match(/Anthropic API error (\d+):\s*(.+)/);
  if (api) {
    const [, status, body] = api;
    try {
      const parsed = JSON.parse(body);
      const detail = parsed?.error?.message || parsed?.message;
      if (detail) return `Anthropic API ${status}: ${detail}`;
    } catch {}
    return `Anthropic API ${status}: ${body.slice(0, 200)}`;
  }
  if (msg.includes("ANTHROPIC_API_KEY")) return "Anthropic API key is not configured.";
  return msg.length > 320 ? `${msg.slice(0, 320)}…` : msg;
}

export function createRunningJob(startedAt = new Date().toISOString()) {
  return { status: "running", startedAt, batch: 0, batches: null };
}

export function createCompletedJob(startedAt, finishedAt = new Date().toISOString()) {
  return { status: "completed", startedAt, finishedAt };
}

export function createFailedJob(startedAt, err, failedAt = new Date().toISOString()) {
  return {
    status: "failed",
    startedAt,
    failedAt,
    error: sanitizePredictionError(err)
  };
}

// True when a failed job belongs to a run started after the last successful prediction.
export function isJobFailureForRun(job, previousLastPrediction) {
  if (!job || job.status !== "failed" || !job.startedAt) return false;
  if (!previousLastPrediction) return true;
  return job.startedAt > previousLastPrediction;
}
