import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseScorePair,
  scoresMatchWinner,
  reconcilePredictionScore
} from "../lib/predictionScore.js";

const qatarFx = { home: "Qatar", away: "Switzerland" };

test("scoresMatchWinner validates home-away orientation", () => {
  assert.equal(scoresMatchWinner("Qatar", "Switzerland", 0, 3, "Switzerland"), true);
  assert.equal(scoresMatchWinner("Qatar", "Switzerland", 3, 0, "Switzerland"), false);
  assert.equal(scoresMatchWinner("Qatar", "Switzerland", 1, 1, "Draw"), true);
});

test("reconcilePredictionScore swaps winner-first scores", () => {
  const out = reconcilePredictionScore({
    score: "3-0",
    winner: "Switzerland",
    confidence: "high",
    reason: "Switzerland are stronger.",
    sweepstake: "Eugene is delighted."
  }, qatarFx);
  assert.equal(out.score, "0-3");
  assert.equal(out.winner, "Switzerland");
});

test("reconcilePredictionScore keeps correct home-away scores", () => {
  const out = reconcilePredictionScore({
    score: "2-1",
    winner: "Brazil",
    confidence: "medium",
    reason: "Brazil quality.",
    sweepstake: "Eve stays in."
  }, { home: "Brazil", away: "Scotland" });
  assert.equal(out.score, "2-1");
});

test("reconcilePredictionScore drops score when it cannot match winner", () => {
  const out = reconcilePredictionScore({
    score: "2-2",
    winner: "Brazil",
    confidence: "low",
    reason: "Chaos.",
    sweepstake: "Nobody wins."
  }, { home: "Brazil", away: "Scotland" });
  assert.equal(out.score, undefined);
  assert.equal(out.winner, "Brazil");
});

test("parseScorePair accepts en-dash", () => {
  assert.deepEqual(parseScorePair("2–1"), [2, 1]);
});
