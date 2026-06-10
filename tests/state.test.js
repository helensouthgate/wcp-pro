import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STATE, withDefaults, isValidScore, parseScoreAction, applyOverrides
} from "../lib/state.js";

test("withDefaults fills missing keys without dropping provided ones", () => {
  const s = withDefaults({ predictions: { a: "x" } });
  assert.deepEqual(s.manualScores, {});
  assert.deepEqual(s.manualOut, []);
  assert.equal(s.predictions.a, "x");
  assert.equal(s.lastUpdated, null);
});

test("withDefaults handles null/undefined", () => {
  assert.deepEqual(withDefaults(null), DEFAULT_STATE);
});

test("isValidScore accepts 0–30 integers only", () => {
  assert.equal(isValidScore(0), true);
  assert.equal(isValidScore(30), true);
  assert.equal(isValidScore(-1), false);
  assert.equal(isValidScore(31), false);
  assert.equal(isValidScore(2.5), false);
  assert.equal(isValidScore("2"), false);
});

test("parseScoreAction validates and coerces", () => {
  assert.deepEqual(parseScoreAction({ id: "m1", home: "2", away: "1" }), { id: "m1", home: 2, away: 1 });
  assert.throws(() => parseScoreAction({ id: "", home: 1, away: 1 }), /fixture id/);
  assert.throws(() => parseScoreAction({ id: "m1", home: -1, away: 1 }), /0–30/);
  assert.throws(() => parseScoreAction({ id: "m1", home: 1, away: 99 }), /0–30/);
});

test("applyOverrides adds manualOut and removes manualIn", () => {
  const derived = ["Haiti", "Qatar"];
  const state = { manualOut: ["Panama"], manualIn: ["Qatar"] };
  const result = applyOverrides(derived, state).sort();
  assert.deepEqual(result, ["Haiti", "Panama"]);
});

test("applyOverrides is a no-op with empty overrides", () => {
  assert.deepEqual(applyOverrides(["A"], { manualOut: [], manualIn: [] }), ["A"]);
});
