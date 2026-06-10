// ─── AI PREDICTIONS ──────────────────────────────────────────────────────────
// Builds a single batched Anthropic request covering all upcoming fixtures and
// parses the JSON response. Network/secret handling lives in the function that
// calls generatePredictions(); the prompt + parse logic here is pure & tested.

export const PREDICTION_MODEL = "claude-sonnet-4-6";
export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

// Cap how many fixtures we predict per run to bound token cost.
export const MAX_FIXTURES_PER_RUN = 24;

// Pick the fixtures we still need predictions for (unplayed, soonest first).
export function selectFixturesToPredict(fixtures, existingPredictions = {}, limit = MAX_FIXTURES_PER_RUN) {
  return fixtures
    .filter((fx) => !fx.played)
    .filter((fx) => fx.home && fx.away)
    .sort((a, b) => {
      const ta = a.utcDate ? new Date(a.utcDate).getTime() : Infinity;
      const tb = b.utcDate ? new Date(b.utcDate).getTime() : Infinity;
      return ta - tb;
    })
    .slice(0, limit);
}

export function buildPrompt(fixtures) {
  const lines = fixtures
    .map((fx) => `- id "${fx.id}": ${fx.home} vs ${fx.away}`)
    .join("\n");
  return (
    `You are a sharp football analyst covering the 2026 FIFA World Cup.\n` +
    `Write a pre-match prediction for each fixture below in 2–3 sentences. ` +
    `Cover current form, a key player, and the tactical matchup, then end with a ` +
    `clear predicted winner and scoreline. Be specific and confident.\n\n` +
    `Fixtures:\n${lines}\n\n` +
    `Respond with ONLY a JSON array, no prose, no markdown fences. Each element ` +
    `must be {"id": "<the id>", "prediction": "<your 2-3 sentence prediction>"}.`
  );
}

export function buildAnthropicBody(fixtures, { model = PREDICTION_MODEL } = {}) {
  return {
    model,
    max_tokens: 4000,
    messages: [{ role: "user", content: buildPrompt(fixtures) }]
  };
}

// Pull the JSON array out of Claude's text response, tolerating stray prose or
// ```json fences. Returns a { [id]: prediction } map.
export function parsePredictionResponse(text) {
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
    if (item && typeof item.id !== "undefined" && typeof item.prediction === "string") {
      out[String(item.id)] = item.prediction.trim();
    }
  }
  return out;
}

// Extract the text content from an Anthropic Messages API response object.
export function extractText(apiResponse) {
  const blocks = apiResponse?.content;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

// Generate predictions for the given fixtures. `fetchImpl` is injectable so the
// function handler passes real fetch and tests can pass a stub.
export async function generatePredictions(fixtures, { apiKey, fetchImpl = fetch, model = PREDICTION_MODEL } = {}) {
  if (!apiKey) throw new Error("Missing Anthropic API key");
  const targets = selectFixturesToPredict(fixtures);
  if (targets.length === 0) return {};

  const resp = await fetchImpl(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION
    },
    body: JSON.stringify(buildAnthropicBody(targets, { model }))
  });

  if (!resp.ok) {
    const detail = await safeText(resp);
    throw new Error(`Anthropic API error ${resp.status}: ${detail}`);
  }
  const data = await resp.json();
  return parsePredictionResponse(extractText(data));
}

async function safeText(resp) {
  try { return await resp.text(); } catch { return ""; }
}
