// Shared prediction HTML formatter (mirrors lib/predictionDisplay.js for the browser).

function parseScorePair(score) {
  const m = String(score || "").trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m) return null;
  return [+m[1], +m[2]];
}

function winnerFromScore(home, away, homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return home;
  if (awayGoals > homeGoals) return away;
  return "Draw";
}

function scoresMatchWinner(home, away, homeGoals, awayGoals, winner) {
  const w = String(winner || "").trim();
  if (!w) return true;
  if (w === "Draw") return homeGoals === awayGoals;
  return w === winnerFromScore(home, away, homeGoals, awayGoals);
}

function reconcilePredictionScore(pred, { home, away } = {}) {
  if (!pred || pred.legacy) return pred;
  const pair = parseScorePair(pred.score);
  if (!pair || !home || !away) return pred;
  const winner = String(pred.winner || "").trim();
  if (!winner) return { ...pred, score: `${pair[0]}-${pair[1]}` };
  const [hg, ag] = pair;
  if (scoresMatchWinner(home, away, hg, ag, winner)) {
    return { ...pred, score: `${hg}-${ag}` };
  }
  if (scoresMatchWinner(home, away, ag, hg, winner)) {
    return { ...pred, score: `${ag}-${hg}` };
  }
  const { score: _drop, ...rest } = pred;
  return rest;
}

function formatPredictionScoreLine(pred, home, away, esc) {
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

function formatPredictionHtml(pred, esc, { home = "", away = "" } = {}) {
  if (!pred) return "";

  if (typeof pred === "string" || (pred.legacy && pred.text)) {
    const text = typeof pred === "string" ? pred : pred.text;
    return predictionCallout(
      `<span class="pred-callout-label">AI prediction</span>
       <p class="pred-body">${esc(text)}</p>`
    );
  }

  if (home && away) pred = reconcilePredictionScore(pred, { home, away });

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

function formatPredictionUnavailable(message, esc) {
  return predictionCallout(
    `<span class="pred-callout-label">AI prediction</span>
     <p class="pred-unavailable">${esc(message)}</p>`,
    { muted: true }
  );
}
