import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPrompt, buildAnthropicBody, parsePredictionResponse, extractText,
  selectFixturesToPredict, generatePredictions, PREDICTION_MODEL
} from "../lib/predictions.js";

const fixtures = [
  { id: "f1", home: "England", away: "Panama", played: false, utcDate: "2026-06-21T20:00:00Z" },
  { id: "f2", home: "Brazil", away: "Scotland", played: false, utcDate: "2026-06-13T20:00:00Z" },
  { id: "f3", home: "Spain", away: "Saudi Arabia", played: true, utcDate: "2026-06-17T20:00:00Z" }
];

test("selectFixturesToPredict drops played, sorts by date, applies limit", () => {
  const sel = selectFixturesToPredict(fixtures);
  assert.deepEqual(sel.map((f) => f.id), ["f2", "f1"]); // f3 played, f2 earlier
  assert.equal(selectFixturesToPredict(fixtures, {}, 1).length, 1);
});

test("buildPrompt lists ids and matchups", () => {
  const p = buildPrompt(selectFixturesToPredict(fixtures));
  assert.match(p, /id "f1"/);
  assert.match(p, /England vs Panama/);
  assert.match(p, /JSON array/);
});

test("buildAnthropicBody uses the configured model", () => {
  const body = buildAnthropicBody(fixtures);
  assert.equal(body.model, PREDICTION_MODEL);
  assert.equal(body.messages[0].role, "user");
});

test("parsePredictionResponse handles a clean array", () => {
  const out = parsePredictionResponse('[{"id":"f1","prediction":"England win 2-0."}]');
  assert.equal(out.f1, "England win 2-0.");
});

test("parsePredictionResponse strips code fences and prose", () => {
  const text = 'Sure!\n```json\n[{"id":"f2","prediction":"Brazil 3-0."}]\n```';
  const out = parsePredictionResponse(text);
  assert.equal(out.f2, "Brazil 3-0.");
});

test("parsePredictionResponse returns {} on garbage", () => {
  assert.deepEqual(parsePredictionResponse("not json"), {});
  assert.deepEqual(parsePredictionResponse(""), {});
  assert.deepEqual(parsePredictionResponse("[broken"), {});
});

test("extractText concatenates text blocks", () => {
  assert.equal(extractText({ content: [{ type: "text", text: "hello" }] }), "hello");
  assert.equal(extractText({ content: [] }), "");
  assert.equal(extractText(null), "");
});

test("generatePredictions calls the API and parses the result", async () => {
  let captured = null;
  const fakeFetch = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      json: async () => ({ content: [{ type: "text", text: '[{"id":"f2","prediction":"Brazil edge it 2-1."}]' }] })
    };
  };
  const out = await generatePredictions(fixtures, { apiKey: "sk-test", fetchImpl: fakeFetch });
  assert.equal(out.f2, "Brazil edge it 2-1.");
  assert.match(captured.url, /anthropic\.com/);
  assert.equal(captured.opts.headers["x-api-key"], "sk-test");
});

test("generatePredictions throws on API error", async () => {
  const fakeFetch = async () => ({ ok: false, status: 429, text: async () => "rate limited" });
  await assert.rejects(
    () => generatePredictions(fixtures, { apiKey: "sk-test", fetchImpl: fakeFetch }),
    /429/
  );
});

test("generatePredictions requires a key and skips when nothing upcoming", async () => {
  await assert.rejects(() => generatePredictions(fixtures, { apiKey: "" }), /API key/);
  const allPlayed = fixtures.map((f) => ({ ...f, played: true }));
  const out = await generatePredictions(allPlayed, { apiKey: "sk-test", fetchImpl: async () => { throw new Error("should not be called"); } });
  assert.deepEqual(out, {});
});
