// ─── PREDICTION DISPLAY ──────────────────────────────────────────────────────
// Normalise stored predictions (legacy strings or structured objects) for HTML.

export function normalizePredictionItem(item) {
  if (!item || typeof item.id === "undefined") return null;

  if (typeof item.prediction === "string" && !item.score && !item.reason) {
    return { legacy: true, text: item.prediction.trim() };
  }

  const score = String(item.score || "").trim();
  const winner = String(item.winner || "").trim();
  const confidence = String(item.confidence || "medium").trim().toLowerCase();
  const reason = String(item.reason || "").trim();
  const sweepstake = String(item.sweepstake || "").trim();

  if (!score && !reason && !sweepstake) return null;
  return { score, winner, confidence, reason, sweepstake };
}

export function formatPredictionScoreLine(pred, home, away, esc) {
  if (!pred || typeof pred === "string" || pred.legacy) return "";
  const score = pred.score || "";
  const m = score.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m && home && away) {
    return `${esc(home)} ${m[1]} – ${m[2]} ${esc(away)}`;
  }
  if (score && pred.winner && pred.winner !== "Draw") {
    return `${esc(score)} ${esc(pred.winner)}`;
  }
  if (score) return esc(score);
  if (pred.winner) return esc(pred.winner);
  return "";
}

function predictionCallout(body, { muted = false } = {}) {
  return `<div class="pred-callout${muted ? " pred-callout--muted" : ""}">${body}</div>`;
}

export function formatPredictionHtml(pred, esc, { home = "", away = "" } = {}) {
  if (!pred) return "";

  if (typeof pred === "string" || (pred.legacy && pred.text)) {
    const text = typeof pred === "string" ? pred : pred.text;
    return predictionCallout(
      `<span class="pred-callout-label">AI prediction</span>
       <p class="pred-body">${esc(text)}</p>`
    );
  }

  const confLabel = pred.confidence
    ? `<span class="pred-conf">${esc(pred.confidence)}</span>`
    : "";

  const scoreLine = formatPredictionScoreLine(pred, home, away, esc);

  const parts = [
    `<div class="pred-callout-top">
      <span class="pred-callout-label">AI prediction</span>
      ${confLabel}
    </div>`,
    scoreLine ? `<p class="pred-score">${scoreLine}</p>` : "",
    pred.reason ? `<p class="pred-reason">${esc(pred.reason)}</p>` : "",
    pred.sweepstake
      ? `<p class="pred-sweep"><span class="pred-sweep-label">Sweepstake</span> ${esc(pred.sweepstake)}</p>`
      : ""
  ].filter(Boolean).join("");

  return predictionCallout(parts);
}

export function formatPredictionUnavailable(message, esc) {
  return predictionCallout(
    `<span class="pred-callout-label">AI prediction</span>
     <p class="pred-unavailable">${esc(message)}</p>`,
    { muted: true }
  );
}
