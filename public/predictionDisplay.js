// Shared prediction HTML formatter (mirrors lib/predictionDisplay.js for the browser).

function predictionSection(inner) {
  return `<div class="pred-section"><div class="pred-label">AI prediction</div>${inner}</div>`;
}

function formatPredictionHtml(pred, esc) {
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

  const reason = pred.reason ? `<p class="pred-reason">${esc(pred.reason)}</p>` : "";
  const sweep = pred.sweepstake ? `<p class="pred-sweep">🏢 ${esc(pred.sweepstake)}</p>` : "";

  return predictionSection(`<div class="pred-box">
    <div class="pred-headline">${headline}${confLabel ? ` ${confLabel}` : ""}</div>
    ${reason}${sweep}
  </div>`);
}
