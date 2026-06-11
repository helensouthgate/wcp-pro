import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTournamentContext,
  fixturePromptLine,
  batchFixturesForPrediction,
  drawByTeam
} from "../lib/predictionContext.js";
import { DRAW } from "../lib/data.js";

const groupLFixtures = [
  { id: "g1", home: "England", away: "Panama", played: true, homeScore: 2, awayScore: 0, group: "L", stage: "GROUP_STAGE", utcDate: "2026-06-15T19:00:00Z" },
  { id: "g2", home: "England", away: "Croatia", played: false, group: "L", stage: "GROUP_STAGE", utcDate: "2026-06-21T19:00:00Z" }
];

test("buildTournamentContext includes group table and recent results", () => {
  const targets = [groupLFixtures[1]];
  const ctx = buildTournamentContext(groupLFixtures, { targets });
  assert.match(ctx, /Group L/);
  assert.match(ctx, /England/);
  assert.match(ctx, /England 2–0 Panama/);
});

test("fixturePromptLine includes office draw names", () => {
  const drawMap = drawByTeam(DRAW);
  const line = fixturePromptLine(groupLFixtures[1], drawMap);
  assert.match(line, /HOME England vs AWAY Croatia/);
  assert.match(line, /Helen Southgate \(England\)/);
});

test("batchFixturesForPrediction keeps group clusters together", () => {
  const fixtures = [
    { id: "a", home: "Brazil", away: "Morocco", played: false, group: "C", utcDate: "2026-06-12T12:00:00Z" },
    { id: "b", home: "Scotland", away: "Haiti", played: false, group: "C", utcDate: "2026-06-13T12:00:00Z" },
    { id: "c", home: "England", away: "Panama", played: false, group: "L", utcDate: "2026-06-14T12:00:00Z" }
  ];
  const batches = batchFixturesForPrediction(fixtures, {}, 16);
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0].map((f) => f.id), ["a", "b", "c"]);
});
