import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGroupTable, sortGroup, headToHead, isGroupComplete,
  rankThirds, computeAllTables, computeEliminated
} from "../lib/standings.js";
import { GROUPS } from "../lib/data.js";
import { groupFixtures, allGroupsCompleteFixtures } from "./helpers.js";

// Group A: Mexico, South Korea, South Africa, Czech Republic
const groupA = [
  { id: "a1", home: "Mexico", away: "South Korea", played: true, homeScore: 2, awayScore: 0 },
  { id: "a2", home: "Mexico", away: "South Africa", played: true, homeScore: 3, awayScore: 0 },
  { id: "a3", home: "Mexico", away: "Czech Republic", played: true, homeScore: 1, awayScore: 0 },
  { id: "a4", home: "South Korea", away: "South Africa", played: true, homeScore: 1, awayScore: 0 },
  { id: "a5", home: "South Korea", away: "Czech Republic", played: true, homeScore: 2, awayScore: 1 },
  { id: "a6", home: "South Africa", away: "Czech Republic", played: true, homeScore: 1, awayScore: 1 }
];

test("computeGroupTable ranks by points then goal difference", () => {
  const table = computeGroupTable("A", groupA);
  assert.deepEqual(table.map((r) => r.team), ["Mexico", "South Korea", "Czech Republic", "South Africa"]);
  assert.equal(table[0].points, 9);
  assert.equal(table[1].points, 6);
  // Czech & South Africa both on 1 pt; Czech ahead on GD (-2 vs -4)
  assert.equal(table[2].team, "Czech Republic");
  assert.equal(table[2].gd, -2);
  assert.equal(table[3].gd, -4);
});

test("head-to-head breaks ties when points/GD/GF equal", () => {
  // Two teams identical overall, but X beat Y.
  const rows = [
    { team: "X", points: 6, gd: 2, gf: 4 },
    { team: "Y", points: 6, gd: 2, gf: 4 }
  ];
  const played = [{ home: "X", away: "Y", played: true, homeScore: 1, awayScore: 0 }];
  const sorted = sortGroup(rows, played);
  assert.equal(sorted[0].team, "X");
  const h2h = headToHead(["X", "Y"], played);
  assert.equal(h2h.get("X").points, 3);
  assert.equal(h2h.get("Y").points, 0);
});

test("isGroupComplete needs all six matches", () => {
  assert.equal(isGroupComplete("A", groupA), true);
  assert.equal(isGroupComplete("A", groupA.slice(0, 5)), false);
});

test("rankThirds orders by points, GD, GF", () => {
  const thirds = [
    { team: "Lo", points: 3, gd: 0, gf: 2 },
    { team: "Hi", points: 3, gd: 4, gf: 5 },
    { team: "Mid", points: 3, gd: 1, gf: 3 }
  ];
  assert.deepEqual(rankThirds(thirds).map((r) => r.team), ["Hi", "Mid", "Lo"]);
});

test("4th place of a completed group is eliminated immediately", () => {
  const { eliminated, allGroupsComplete } = computeEliminated(groupA);
  assert.equal(allGroupsComplete, false); // only one group done
  assert.ok(eliminated.includes("South Africa"));
  assert.ok(!eliminated.includes("Czech Republic")); // 3rd: pending best-thirds
});

test("full group stage eliminates 16 teams (12 fourths + 4 worst thirds)", () => {
  const fixtures = allGroupsCompleteFixtures();
  const { eliminated, allGroupsComplete, thirdsRanked } = computeEliminated(fixtures);
  assert.equal(allGroupsComplete, true);
  assert.equal(eliminated.length, 16);

  // All 12 fourth-placed teams are out.
  for (const g of Object.keys(GROUPS)) {
    assert.ok(eliminated.includes(GROUPS[g][3]), `${GROUPS[g][3]} (4th of ${g}) should be out`);
  }
  // Worst 4 thirds = groups A–D (smallest margins). E–L thirds survive.
  for (const g of ["A", "B", "C", "D"]) {
    assert.ok(eliminated.includes(GROUPS[g][2]), `${GROUPS[g][2]} (weak 3rd) should be out`);
  }
  for (const g of ["E", "F", "G", "H", "I", "J", "K", "L"]) {
    assert.ok(!eliminated.includes(GROUPS[g][2]), `${GROUPS[g][2]} (strong 3rd) should survive`);
  }
  assert.equal(thirdsRanked.length, 12);
});

test("knockout losers are eliminated", () => {
  const fixtures = [
    ...allGroupsCompleteFixtures(),
    { id: "ko1", home: "England", away: "Germany", stage: "LAST_16", played: true, homeScore: 2, awayScore: 1 },
    { id: "ko2", home: "Brazil", away: "France", stage: "QUARTER_FINALS", played: true, homeScore: 0, awayScore: 0, winner: "France" }
  ];
  const { eliminated } = computeEliminated(fixtures);
  assert.ok(eliminated.includes("Germany"), "KO loser out");
  assert.ok(!eliminated.includes("England"), "KO winner survives");
  assert.ok(eliminated.includes("Brazil"), "penalty loser via winner field out");
  assert.ok(!eliminated.includes("France"));
});

test("computeAllTables returns a table per group", () => {
  const tables = computeAllTables(groupA);
  assert.equal(Object.keys(tables).length, 12);
  assert.equal(tables.A[0].team, "Mexico");
});
