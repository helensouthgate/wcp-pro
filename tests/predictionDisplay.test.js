import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePredictionItem, formatPredictionHtml } from "../lib/predictionDisplay.js";

const esc = (s) => s;

test("normalizePredictionItem parses structured predictions", () => {
  const out = normalizePredictionItem({
    id: "f1",
    score: "2-1",
    winner: "England",
    confidence: "high",
    reason: "Strong attack",
    sweepstake: "Helen stays in."
  });
  assert.equal(out.score, "2-1");
  assert.equal(out.winner, "England");
  assert.equal(out.sweepstake, "Helen stays in.");
});

test("normalizePredictionItem supports legacy prediction string", () => {
  const out = normalizePredictionItem({ id: "f1", prediction: "England 2-0." });
  assert.equal(out.legacy, true);
  assert.equal(out.text, "England 2-0.");
});

test("formatPredictionHtml renders structured fields", () => {
  const html = formatPredictionHtml({
    score: "2-1",
    winner: "England",
    confidence: "medium",
    reason: "Control in midfield.",
    sweepstake: "Helen stays in; Axel is out."
  }, esc);
  assert.match(html, /pred-label/);
  assert.match(html, /AI prediction/);
  assert.match(html, /2-1 England/);
  assert.match(html, /medium confidence/);
  assert.match(html, /Control in midfield/);
  assert.match(html, /Helen stays in/);
});
