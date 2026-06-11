import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPrompt, buildAnthropicBody, parsePredictionResponse, extractText,
  selectFixturesToPredict, generatePredictions, fixturesInPredictionWindow, PREDICTION_MODEL,
  PREDICTION_BATCH_SIZE
} from "../lib/predictions.js";
import { DRAW } from "../lib/data.js";

const structured = {
  id: "f2",
  score: "2-1",
  winner: "Brazil",
  confidence: "medium",
  reason: "Brazil's quality shows.",
  sweepstake: "Eve stays in; Scotland's picker struggles."
};

const fixtures = [
  { id: "f1", home: "England", away: "Panama", played: false, group: "L", utcDate: "2026-06-21T20:00:00Z" },
  { id: "f2", home: "Brazil", away: "Scotland", played: false, group: "C", utcDate: "2026-06-13T20:00:00Z" },
  { id: "f3", home: "Spain", away: "Saudi Arabia", played: true, utcDate: "2026-06-17T20:00:00Z" }
];

test("fixturesInPredictionWindow keeps unplayed fixtures in the next 14 days", () => {
  const now = new Date("2026-06-11T12:00:00Z").getTime();
  const inWindow = { id: "w1", home: "A", away: "B", played: false, utcDate: "2026-06-20T15:00:00Z" };
  const beyond14 = { id: "w2", home: "C", away: "D", played: false, utcDate: "2026-06-26T15:00:00Z" };
  const played = { id: "w3", home: "E", away: "F", played: true, utcDate: "2026-06-12T15:00:00Z" };
  const sel = fixturesInPredictionWindow([inWindow, beyond14, played], now);
  assert.deepEqual(sel.map((f) => f.id), ["w1"]);
});

test("selectFixturesToPredict sorts by date, applies limit", () => {
  const sel = selectFixturesToPredict(fixtures);
  assert.deepEqual(sel.map((f) => f.id), ["f2", "f1"]);
  assert.equal(selectFixturesToPredict(fixtures, {}, 1).length, 1);
});

test("selectFixturesToPredict skips fixtures that already have predictions", () => {
  const sel = selectFixturesToPredict(fixtures, { f2: { score: "1-0" } });
  assert.deepEqual(sel.map((f) => f.id), ["f1"]);
});

test("buildPrompt includes context, structure, and sweepstake", () => {
  const p = buildPrompt(selectFixturesToPredict(fixtures), {
    context: "Group C:\n  1. Brazil — 3 pts",
    drawMap: new Map(DRAW.map((d) => [d.t, d]))
  });
  assert.match(p, /Tournament context/);
  assert.match(p, /Office draw/);
  assert.match(p, /confidence/);
  assert.match(p, /sweepstake/);
  assert.match(p, /id "f1"/);
  assert.match(p, /England vs Panama/);
  assert.match(p, /ONLY a valid JSON array/);
  assert.doesNotMatch(p, /web_search/i);
});

test("buildAnthropicBody uses Sonnet without tools", () => {
  const body = buildAnthropicBody(selectFixturesToPredict(fixtures));
  assert.equal(body.model, PREDICTION_MODEL);
  assert.equal(body.model, "claude-sonnet-4-6");
  assert.equal(body.messages[0].role, "user");
  assert.equal(body.tools, undefined);
});

test("PREDICTION_BATCH_SIZE is 16", () => {
  assert.equal(PREDICTION_BATCH_SIZE, 16);
});

test("parsePredictionResponse handles structured array", () => {
  const out = parsePredictionResponse(`[${JSON.stringify(structured)}]`);
  assert.equal(out.f2.score, "2-1");
  assert.equal(out.f2.winner, "Brazil");
  assert.equal(out.f2.sweepstake, structured.sweepstake);
});

test("parsePredictionResponse supports legacy one-line predictions", () => {
  const out = parsePredictionResponse('[{"id":"f1","prediction":"England win 2-0."}]');
  assert.equal(out.f1.text, "England win 2-0.");
  assert.equal(out.f1.legacy, true);
});

test("parsePredictionResponse strips code fences and prose", () => {
  const text = `Sure!\n\`\`\`json\n[${JSON.stringify(structured)}]\n\`\`\``;
  const out = parsePredictionResponse(text);
  assert.equal(out.f2.score, "2-1");
});

test("parsePredictionResponse returns {} on garbage", () => {
  assert.deepEqual(parsePredictionResponse("not json"), {});
  assert.deepEqual(parsePredictionResponse(""), {});
  assert.deepEqual(parsePredictionResponse("[broken"), {});
});

test("extractText concatenates text blocks", () => {
  assert.equal(extractText({ content: [{ type: "text", text: "hello" }] }), "hello");
  assert.equal(
    extractText({
      content: [
        { type: "text", text: "part one" },
        { type: "text", text: `[${JSON.stringify(structured)}]` }
      ]
    }),
    `part one\n[${JSON.stringify(structured)}]`
  );
  assert.equal(extractText({ content: [] }), "");
  assert.equal(extractText(null), "");
});

test("generatePredictions calls the API and parses the result", async () => {
  let captured = null;
  const fakeFetch = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: `[${JSON.stringify(structured)}]` }],
        usage: { input_tokens: 100, output_tokens: 200 }
      })
    };
  };
  const { predictions: out, cost } = await generatePredictions(fixtures, {
    apiKey: "sk-test",
    fetchImpl: fakeFetch,
    draw: DRAW
  });
  assert.equal(out.f2.score, "2-1");
  assert.equal(cost.batches, 2);
  assert.equal(cost.model, "claude-sonnet-4-6");
  assert.match(captured.url, /anthropic\.com/);
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.tools, undefined);
  assert.match(body.messages[0].content, /Office draw/);
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
  const { predictions: out } = await generatePredictions([], { apiKey: "sk-test", fetchImpl: async () => { throw new Error("should not be called"); } });
  assert.deepEqual(out, {});
});

test("generatePredictions batches until all missing fixtures are covered", async () => {
  const many = Array.from({ length: 20 }, (_, i) => ({
    id: `f${i}`,
    home: `Home${i}`,
    away: `Away${i}`,
    played: false,
    group: i < 10 ? "A" : "B",
    utcDate: `2026-06-${String(10 + (i % 10)).padStart(2, "0")}T12:00:00Z`
  }));
  let calls = 0;
  const fakeFetch = async (_url, opts) => {
    calls++;
    const body = JSON.parse(opts.body);
    const ids = [...body.messages[0].content.matchAll(/id "([^"]+)"/g)].map((m) => m[1]);
    return {
      ok: true,
      json: async () => ({
        content: [{
          type: "text",
          text: JSON.stringify(ids.map((id) => ({
            id,
            score: "1-0",
            winner: "Home",
            confidence: "low",
            reason: "Test.",
            sweepstake: "Nobody cares."
          })))
        }],
        usage: { input_tokens: 50, output_tokens: 100 }
      })
    };
  };
  const { predictions: out, cost } = await generatePredictions(many, { apiKey: "sk-test", fetchImpl: fakeFetch, batchSize: 16 });
  assert.equal(calls, 2);
  assert.equal(Object.keys(out).length, 20);
  assert.equal(cost.batches, 2);
  assert.equal(out.f0.score, "1-0");
});
