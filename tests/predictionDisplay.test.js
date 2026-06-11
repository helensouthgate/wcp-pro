import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePredictionItem,
  formatPredictionHtml,
  formatPredictionScoreLine
} from "../lib/predictionDisplay.js";

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

test("formatPredictionScoreLine includes both team names", () => {
  const line = formatPredictionScoreLine(
    { score: "3-1", winner: "Spain" },
    "Spain",
    "England",
    esc
  );
  assert.equal(line, "Spain 3 – 1 England");
});

test("formatPredictionHtml renders structured fields", () => {
  const html = formatPredictionHtml({
    score: "2-1",
    winner: "England",
    confidence: "medium",
    reason: "Control in midfield.",
    sweepstake: "Helen stays in; Axel is out."
  }, esc, { home: "England", away: "Spain" });
  assert.match(html, /pred-callout/);
  assert.match(html, /AI prediction/);
  assert.match(html, /England 2 – 1 Spain/);
  assert.match(html, /medium/);
  assert.match(html, /Sweepstake/);
  assert.match(html, /Control in midfield/);
  assert.match(html, /Helen stays in/);
  assert.doesNotMatch(html, /pred-box/);
  assert.doesNotMatch(html, /🏢/);
});
