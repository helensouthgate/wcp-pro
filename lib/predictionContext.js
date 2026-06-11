// ─── PREDICTION CONTEXT & BATCHING ───────────────────────────────────────────
// Builds tournament context for the AI prompt and groups fixtures into batches.

import { computeAllTables, isGroupComplete } from "./standings.js";
import { groupOf, KNOCKOUT_STAGES } from "./data.js";

const STAGE_LABELS = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-final",
  SEMI_FINALS: "Semi-final",
  THIRD_PLACE: "Third place",
  FINAL: "Final"
};

export function drawByTeam(draw) {
  const map = new Map();
  for (const p of draw || []) map.set(p.t, p);
  return map;
}

function stageLabel(stage) {
  return STAGE_LABELS[stage] || stage || "Knockout";
}

function formatTableRow(row, pos) {
  const gd = row.gd > 0 ? `+${row.gd}` : String(row.gd);
  return `  ${pos}. ${row.team} — ${row.points} pts, GD ${gd}, ${row.played} played`;
}

function groupsForFixtures(fixtures) {
  const groups = new Set();
  for (const fx of fixtures) {
    if (fx.group) groups.add(fx.group);
    else {
      const g = groupOf(fx.home) || groupOf(fx.away);
      if (g) groups.add(g);
    }
  }
  return [...groups].sort();
}

export function buildTournamentContext(allFixtures, { targets = [] } = {}) {
  const tables = computeAllTables(allFixtures || []);
  const sections = [];

  for (const g of groupsForFixtures(targets)) {
    const table = tables[g] || [];
    const complete = isGroupComplete(g, allFixtures || []);
    const header = `Group ${g}${complete ? " (complete)" : ""}:`;
    sections.push(
      table.length
        ? `${header}\n${table.map((r, i) => formatTableRow(r, i + 1)).join("\n")}`
        : `${header}\n  (no results yet)`
    );
  }

  const teams = new Set();
  for (const fx of targets) {
    teams.add(fx.home);
    teams.add(fx.away);
  }

  const recent = (allFixtures || [])
    .filter((fx) => fx.played && (teams.has(fx.home) || teams.has(fx.away)))
    .sort((a, b) => {
      const ta = a.utcDate ? new Date(a.utcDate).getTime() : 0;
      const tb = b.utcDate ? new Date(b.utcDate).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 24);

  if (recent.length) {
    sections.push(
      "Recent results for teams in this batch:\n" +
      recent.map((fx) => `- ${fx.home} ${fx.homeScore}–${fx.awayScore} ${fx.away}`).join("\n")
    );
  }

  const knockouts = targets.filter((fx) => fx.stage && fx.stage !== "GROUP_STAGE");
  if (knockouts.length) {
    sections.push(
      "Knockout note: loser of each knockout match is eliminated from the sweepstake."
    );
  }

  return sections.length ? sections.join("\n\n") : "(Pre-tournament — no results yet.)";
}

export function fixturePromptLine(fx, drawMap) {
  const homeP = drawMap.get(fx.home);
  const awayP = drawMap.get(fx.away);
  const date = fx.utcDate ? fx.utcDate.slice(0, 10) : "TBC";
  let stage;
  if (fx.stage && fx.stage !== "GROUP_STAGE") stage = stageLabel(fx.stage);
  else if (fx.group) stage = `Group ${fx.group}`;
  else stage = "Group stage";

  const homeDraw = homeP ? `${homeP.n} (${fx.home})` : fx.home;
  const awayDraw = awayP ? `${awayP.n} (${fx.away})` : fx.away;

  return (
    `- id "${fx.id}": ${fx.home} vs ${fx.away} — ${date}, ${stage}\n` +
    `  Office draw: ${homeDraw} vs ${awayDraw}`
  );
}

function fixtureBucket(fx) {
  if (fx.stage && fx.stage !== "GROUP_STAGE" && KNOCKOUT_STAGES.has(fx.stage)) {
    return `KO:${fx.stage}`;
  }
  return fx.group || groupOf(fx.home) || groupOf(fx.away) || "OTHER";
}

// Group fixtures into batches (whole groups kept together when possible).
export function batchFixturesForPrediction(fixtures, existingPredictions = {}, maxBatch = 16) {
  const pending = fixtures
    .filter((fx) => !fx.played && fx.home && fx.away && !existingPredictions[fx.id])
    .sort((a, b) => {
      const ta = a.utcDate ? new Date(a.utcDate).getTime() : Infinity;
      const tb = b.utcDate ? new Date(b.utcDate).getTime() : Infinity;
      return ta - tb;
    });

  if (!pending.length) return [];

  const clusters = new Map();
  for (const fx of pending) {
    const key = fixtureBucket(fx);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(fx);
  }

  const ordered = [...clusters.entries()].sort((a, b) => {
    const ta = a[1][0]?.utcDate || "";
    const tb = b[1][0]?.utcDate || "";
    return ta.localeCompare(tb);
  });

  const batches = [];
  let current = [];

  for (const [, cluster] of ordered) {
    if (cluster.length > maxBatch) {
      if (current.length) {
        batches.push(current);
        current = [];
      }
      for (let i = 0; i < cluster.length; i += maxBatch) {
        batches.push(cluster.slice(i, i + maxBatch));
      }
      continue;
    }
    if (current.length && current.length + cluster.length > maxBatch) {
      batches.push(current);
      current = [];
    }
    current.push(...cluster);
  }
  if (current.length) batches.push(current);
  return batches;
}

export function selectNextBatch(fixtures, existingPredictions = {}, maxBatch = 16) {
  const batches = batchFixturesForPrediction(fixtures, existingPredictions, maxBatch);
  return batches[0] || [];
}
