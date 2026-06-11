// ─── PREDICTION COST ESTIMATES ───────────────────────────────────────────────
// Parses Anthropic `usage` meters and estimates USD cost from published rates.
// Estimates only — actual billing may differ slightly (cache tier, rounding).

// Published API rates (https://platform.claude.com/docs/en/about-claude/pricing)
export const SONNET_46_PRICING = {
  model: "claude-sonnet-4-6",
  inputPerMillion: 3,
  outputPerMillion: 15,
  cacheWriteMultiplier: 1.25,
  cacheReadMultiplier: 0.1,
  webSearchPerThousand: 10
};

export const OPUS_48_PRICING = {
  model: "claude-opus-4-8",
  inputPerMillion: 5,
  outputPerMillion: 25,
  cacheWriteMultiplier: 1.25,
  cacheReadMultiplier: 0.1,
  webSearchPerThousand: 10
};

export const EMPTY_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  web_search_requests: 0
};

export function normalizeUsage(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY_USAGE };
  return {
    input_tokens: Number(raw.input_tokens) || 0,
    output_tokens: Number(raw.output_tokens) || 0,
    cache_creation_input_tokens: Number(raw.cache_creation_input_tokens) || 0,
    cache_read_input_tokens: Number(raw.cache_read_input_tokens) || 0,
    web_search_requests: Number(raw.server_tool_use?.web_search_requests ?? raw.web_search_requests) || 0
  };
}

export function addUsage(a, b) {
  const left = normalizeUsage(a);
  const right = normalizeUsage(b);
  return {
    input_tokens: left.input_tokens + right.input_tokens,
    output_tokens: left.output_tokens + right.output_tokens,
    cache_creation_input_tokens: left.cache_creation_input_tokens + right.cache_creation_input_tokens,
    cache_read_input_tokens: left.cache_read_input_tokens + right.cache_read_input_tokens,
    web_search_requests: left.web_search_requests + right.web_search_requests
  };
}

export function estimateCostUsd(usage, pricing = SONNET_46_PRICING) {
  const u = normalizeUsage(usage);
  const inputRate = pricing.inputPerMillion / 1_000_000;
  const outputRate = pricing.outputPerMillion / 1_000_000;
  const searchRate = pricing.webSearchPerThousand / 1000;

  const inputCost = u.input_tokens * inputRate;
  const outputCost = u.output_tokens * outputRate;
  const cacheWriteCost = u.cache_creation_input_tokens * inputRate * pricing.cacheWriteMultiplier;
  const cacheReadCost = u.cache_read_input_tokens * inputRate * pricing.cacheReadMultiplier;
  const searchCost = u.web_search_requests * searchRate;

  const tokenCostUsd = inputCost + outputCost + cacheWriteCost + cacheReadCost;
  const searchCostUsd = searchCost;
  const totalUsd = tokenCostUsd + searchCostUsd;

  return { tokenCostUsd, searchCostUsd, totalUsd };
}

function roundUsd(n) {
  return Math.round(n * 10000) / 10000;
}

export function formatCostUsd(usd) {
  if (!Number.isFinite(usd) || usd <= 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function buildCostReport(usage, { batches = 0, predictions = 0, pricing = SONNET_46_PRICING } = {}) {
  const normalized = normalizeUsage(usage);
  const { tokenCostUsd, searchCostUsd, totalUsd } = estimateCostUsd(normalized, pricing);
  const total = roundUsd(totalUsd);

  return {
    model: pricing.model,
    batches,
    predictions,
    usage: normalized,
    tokenCostUsd: roundUsd(tokenCostUsd),
    searchCostUsd: roundUsd(searchCostUsd),
    totalUsd: total,
    formatted: formatCostUsd(total),
    dailyEstimateUsd: total,
    dailyEstimateFormatted: formatCostUsd(total),
    pricingNote:
      `Estimate from Anthropic usage at ${pricing.model} rates ` +
      `($${pricing.inputPerMillion}/M input, $${pricing.outputPerMillion}/M output).`
  };
}
