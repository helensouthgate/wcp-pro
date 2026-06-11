// ─── AI PREDICTIONS ──────────────────────────────────────────────────────────
// Batched Anthropic requests (Claude Sonnet 4.6) with tournament context,
// structured output, and office-sweepstake personalisation.

import { isWithinNextDays } from "./fixtures.js";
import { addUsage, buildCostReport, EMPTY_USAGE, SONNET_46_PRICING } from "./predictionCost.js";
import {
  buildTournamentContext,
  drawByTeam,
  fixturePromptLine,
  selectNextBatch
} from "./predictionContext.js";
import { normalizePredictionItem } from "./predictionDisplay.js";
import { reconcilePredictionScore } from "./predictionScore.js";

export const PREDICTION_WINDOW_DAYS = 14;
export const PREDICTION_MODEL = "claude-sonnet-4-6";
export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
export const PREDICTION_BATCH_SIZE = 16;
export const MAX_FIXTURES_PER_RUN = PREDICTION_BATCH_SIZE;

// Unplayed fixtures kicking off within the prediction window.
export function fixturesInPredictionWindow(fixtures, now = Date.now(), days = PREDICTION_WINDOW_DAYS) {
  return fixtures.filter((fx) => !fx.played && fx.home && fx.away && isWithinNextDays(fx, days, now));
}

// Pick fixtures missing a prediction, soonest first (first batch).
export function selectFixturesToPredict(fixtures, existingPredictions = {}, limit = PREDICTION_BATCH_SIZE) {
  return selectNextBatch(fixtures, existingPredictions, limit);
}

export function buildPrompt(fixtures, { context = "", drawMap = new Map() } = {}) {
  const lines = fixtures.map((fx) => fixturePromptLine(fx, drawMap)).join("\n");
  return `You are a football analyst for the 2026 FIFA World Cup office sweepstake.

Use the tournament context and your football knowledge. For each fixture, predict the scoreline, winner, confidence, a brief reason, and the sweepstake impact.

Tournament context:
${context || "(Pre-tournament — no results yet.)"}

Fixtures to predict:
${lines}

Sweepstake rules: each colleague drew one team. If their team is eliminated from the tournament, they are out. In the group stage, 4th place is eliminated when the group completes; the 8 best third-placed teams advance. Knockout losers are eliminated.

For each fixture return a JSON object with:
- "id": the fixture id (exact)
- "home": home team name (exact, from the fixture line)
- "away": away team name (exact, from the fixture line)
- "score": home goals then away goals as "HOME-AWAY" (home team goals first, away team goals second)
  Example: HOME England vs AWAY Panama — if England win 2-1, score is "2-1" and winner is "England".
  Example: HOME Qatar vs AWAY Switzerland — if Switzerland win 3-0, score is "0-3" and winner is "Switzerland".
- "winner": winning team name (exact), or "Draw"
- "confidence": "low", "medium", or "high"
- "reason": one sentence on football factors (form, table position, tactics)
- "sweepstake": one sentence on who in the office benefits or suffers if this result happens — use first names from the Office draw lines

Before finalising each object, verify score and winner agree: home goals > away goals only if winner is the home team; away goals > home goals only if winner is the away team; equal goals only if winner is "Draw". reason and sweepstake must describe that same result.

Respond with ONLY a valid JSON array. No prose, no markdown.
Each object must include all eight fields.`;
}

export function buildAnthropicBody(fixtures, { model = PREDICTION_MODEL, context = "", drawMap = new Map() } = {}) {
  return {
    model,
    max_tokens: Math.min(12000, fixtures.length * 220 + 400),
    messages: [{ role: "user", content: buildPrompt(fixtures, { context, drawMap }) }]
  };
}

export function parsePredictionResponse(text, fixturesById = {}) {
  if (!text || typeof text !== "string") return {};
  let body = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return {};
  let arr;
  try {
    arr = JSON.parse(body.slice(start, end + 1));
  } catch {
    return {};
  }
  if (!Array.isArray(arr)) return {};
  const out = {};
  for (const item of arr) {
    const fx = fixturesById[String(item.id)];
    let norm = normalizePredictionItem(item);
    if (!norm) continue;
    if (fx) norm = reconcilePredictionScore(norm, fx);
    out[String(item.id)] = norm;
  }
  return out;
}

export function extractText(apiResponse) {
  const blocks = apiResponse?.content;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

async function fetchPredictionBatch(targets, { apiKey, fetchImpl, model, context, drawMap }) {
  const resp = await fetchImpl(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION
    },
    body: JSON.stringify(buildAnthropicBody(targets, { model, context, drawMap }))
  });

  if (!resp.ok) {
    const detail = await safeText(resp);
    throw new Error(`Anthropic API error ${resp.status}: ${detail}`);
  }
  const data = await resp.json();
  const fixturesById = Object.fromEntries(targets.map((fx) => [String(fx.id), fx]));
  return {
    predictions: parsePredictionResponse(extractText(data), fixturesById),
    usage: data.usage
  };
}

export async function generatePredictions(fixtures, {
  apiKey,
  existingPredictions = {},
  allFixtures = null,
  draw = [],
  fetchImpl = fetch,
  model = PREDICTION_MODEL,
  batchSize = PREDICTION_BATCH_SIZE,
  onBatchComplete = null
} = {}) {
  if (!apiKey) throw new Error("Missing Anthropic API key");

  const drawMap = drawByTeam(draw);
  const contextFixtures = allFixtures || fixtures;
  const known = { ...existingPredictions };
  const fresh = {};
  let usage = { ...EMPTY_USAGE };
  let batches = 0;

  while (true) {
    const targets = selectNextBatch(fixtures, known, batchSize);
    if (targets.length === 0) break;

    const before = Object.keys(known).length;
    const context = buildTournamentContext(contextFixtures, { targets });
    const { predictions: batch, usage: batchUsage } = await fetchPredictionBatch(targets, {
      apiKey,
      fetchImpl,
      model,
      context,
      drawMap
    });
    batches++;
    usage = addUsage(usage, batchUsage);
    if (onBatchComplete) {
      await onBatchComplete({ batch: batches, batches: null });
    }
    if (Object.keys(batch).length === 0) break;

    Object.assign(known, batch);
    Object.assign(fresh, batch);
    if (Object.keys(known).length === before) break;
  }

  const cost = buildCostReport(usage, { batches, predictions: Object.keys(fresh).length, pricing: SONNET_46_PRICING });
  return { predictions: fresh, cost };
}

async function safeText(resp) {
  try { return await resp.text(); } catch { return ""; }
}
