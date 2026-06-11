// ─── PREDICTION SCORE NORMALISATION ─────────────────────────────────────────
// Parse home–away scores and fix common model mistakes (winner-first ordering).

export function parseScorePair(score) {
  const m = String(score || "").trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m) return null;
  return [+m[1], +m[2]];
}

export function formatScorePair(homeGoals, awayGoals) {
  return `${homeGoals}-${awayGoals}`;
}

export function winnerFromScore(home, away, homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return home;
  if (awayGoals > homeGoals) return away;
  return "Draw";
}

export function scoresMatchWinner(home, away, homeGoals, awayGoals, winner) {
  const w = String(winner || "").trim();
  if (!w) return true;
  if (w === "Draw") return homeGoals === awayGoals;
  return w === winnerFromScore(home, away, homeGoals, awayGoals);
}

/** Align score with winner using fixture home/away; swap goals if inverted. */
export function reconcilePredictionScore(pred, { home, away } = {}) {
  if (!pred || pred.legacy) return pred;
  const pair = parseScorePair(pred.score);
  if (!pair || !home || !away) return pred;

  const winner = String(pred.winner || "").trim();
  if (!winner) return { ...pred, score: formatScorePair(pair[0], pair[1]) };

  const [hg, ag] = pair;
  if (scoresMatchWinner(home, away, hg, ag, winner)) {
    return { ...pred, score: formatScorePair(hg, ag) };
  }
  if (scoresMatchWinner(home, away, ag, hg, winner)) {
    return { ...pred, score: formatScorePair(ag, hg) };
  }

  const { score: _drop, ...rest } = pred;
  return rest;
}
