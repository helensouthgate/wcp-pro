import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeUsage, addUsage, estimateCostUsd, buildCostReport, formatCostUsd,
  SONNET_46_PRICING, OPUS_48_PRICING
} from "../lib/predictionCost.js";

test("normalizeUsage reads web search counts from server_tool_use", () => {
  const u = normalizeUsage({
    input_tokens: 1000,
    output_tokens: 500,
    server_tool_use: { web_search_requests: 12 }
  });
  assert.equal(u.web_search_requests, 12);
  assert.equal(u.input_tokens, 1000);
});

test("addUsage sums token and search meters", () => {
  const total = addUsage(
    { input_tokens: 100, output_tokens: 50, web_search_requests: 2 },
    { input_tokens: 200, output_tokens: 150, web_search_requests: 3 }
  );
  assert.equal(total.input_tokens, 300);
  assert.equal(total.output_tokens, 200);
  assert.equal(total.web_search_requests, 5);
});

test("estimateCostUsd applies Sonnet 4.6 token rates by default", () => {
  const { tokenCostUsd, searchCostUsd, totalUsd } = estimateCostUsd({
    input_tokens: 1_000_000,
    output_tokens: 1_000_000
  });
  assert.equal(tokenCostUsd, 18);
  assert.equal(searchCostUsd, 0);
  assert.equal(totalUsd, 18);
});

test("estimateCostUsd can use Opus pricing when passed", () => {
  const { totalUsd } = estimateCostUsd({
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
    web_search_requests: 1000
  }, OPUS_48_PRICING);
  assert.equal(totalUsd, 40);
});

test("buildCostReport formats a run summary", () => {
  const report = buildCostReport(
    { input_tokens: 500_000, output_tokens: 100_000, web_search_requests: 80 },
    { batches: 5, predictions: 20 }
  );
  assert.equal(report.batches, 5);
  assert.equal(report.predictions, 20);
  assert.equal(report.model, SONNET_46_PRICING.model);
  assert.match(report.formatted, /^\$/);
  assert.equal(report.dailyEstimateFormatted, report.formatted);
});

test("formatCostUsd shows small amounts with extra precision", () => {
  assert.equal(formatCostUsd(0.0042), "$0.0042");
  assert.equal(formatCostUsd(1.2), "$1.20");
});
