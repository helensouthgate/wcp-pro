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

function predictionSection(inner) {
  return `<div class="pred-section"><div class="pred-label">AI prediction</div>${inner}</div>`;
}

export function formatPredictionHtml(pred, esc) {
  if (!pred) return "";

  if (typeof pred === "string") {
    return predictionSection(`<div class="pred-box">${esc(pred)}</div>`);
  }

  if (pred.legacy && pred.text) {
    return predictionSection(`<div class="pred-box">${esc(pred.text)}</div>`);
  }

  const confLabel = pred.confidence
    ? `<span class="pred-conf">${esc(pred.confidence)} confidence</span>`
    : "";

  let headline = "";
  if (pred.score && pred.winner && pred.winner !== "Draw") {
    headline = `<strong>${esc(pred.score)} ${esc(pred.winner)}</strong>`;
  } else if (pred.score) {
    headline = `<strong>${esc(pred.score)}</strong>${pred.winner ? ` ${esc(pred.winner)}` : ""}`;
  } else if (pred.winner) {
    headline = `<strong>${esc(pred.winner)}</strong>`;
  }

  const reason = pred.reason
    ? `<p class="pred-reason">${esc(pred.reason)}</p>`
    : "";
  const sweep = pred.sweepstake
    ? `<p class="pred-sweep">🏢 ${esc(pred.sweepstake)}</p>`
    : "";

  return predictionSection(`<div class="pred-box">
    <div class="pred-headline">${headline}${confLabel ? ` ${confLabel}` : ""}</div>
    ${reason}${sweep}
  </div>`);
}
