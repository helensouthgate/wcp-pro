import { test } from "node:test";
import assert from "node:assert/strict";
import {
  transformApiMatches, mergeManualScores, isThisWeek, filterFixtures, sortByDate,
  relativeDay, timeZoneAbbrev, formatFixtureWhen
} from "../lib/fixtures.js";

const payload = {
  matches: [
    {
      id: 100, utcDate: "2026-06-11T20:00:00Z", status: "FINISHED", stage: "GROUP_STAGE",
      homeTeam: { name: "Mexico" }, awayTeam: { name: "Korea Republic" },
      score: { winner: "HOME_TEAM", fullTime: { home: 2, away: 1 } }
    },
    {
      id: 101, utcDate: "2026-06-20T17:00:00Z", status: "TIMED", stage: "GROUP_STAGE",
      homeTeam: { name: "Türkiye" }, awayTeam: { name: "USA" },
      score: { winner: null, fullTime: { home: null, away: null } }
    }
  ]
};

test("transformApiMatches maps names, results and winner", () => {
  const fx = transformApiMatches(payload);
  assert.equal(fx.length, 2);
  assert.equal(fx[0].home, "Mexico");
  assert.equal(fx[0].away, "South Korea");      // Korea Republic → canonical
  assert.equal(fx[0].played, true);
  assert.equal(fx[0].homeScore, 2);
  assert.equal(fx[0].winner, "Mexico");
  assert.equal(fx[0].group, "A");
  assert.equal(fx[1].home, "Turkey");            // Türkiye → canonical
  assert.equal(fx[1].played, false);
  assert.equal(fx[1].homeScore, null);
});

test("transformApiMatches tolerates empty payloads", () => {
  assert.deepEqual(transformApiMatches({}), []);
  assert.deepEqual(transformApiMatches(null), []);
});

test("mergeManualScores fills unplayed fixtures only", () => {
  const fx = transformApiMatches(payload);
  const merged = mergeManualScores(fx, { "101": { home: 3, away: 0 } });
  assert.equal(merged[1].played, true);
  assert.equal(merged[1].homeScore, 3);
  assert.equal(merged[1].manual, true);
  // already-played fixture is untouched
  assert.equal(merged[0].homeScore, 2);
});

test("isThisWeek uses a today→+7d window", () => {
  const now = new Date("2026-06-15T12:00:00").getTime();
  assert.equal(isThisWeek({ utcDate: "2026-06-15T08:00:00Z" }, now), true);  // earlier today
  assert.equal(isThisWeek({ utcDate: "2026-06-21T08:00:00Z" }, now), true);  // within 7d
  assert.equal(isThisWeek({ utcDate: "2026-06-23T08:00:00Z" }, now), false); // beyond 7d
  assert.equal(isThisWeek({ utcDate: "2026-06-14T08:00:00Z" }, now), false); // yesterday
  assert.equal(isThisWeek({ utcDate: null }, now), false);
});

test("filterFixtures modes", () => {
  const fx = [
    { id: "1", played: true, utcDate: "2026-06-11T20:00:00Z" },
    { id: "2", played: false, utcDate: "2026-06-20T20:00:00Z" }
  ];
  assert.equal(filterFixtures(fx, "played").length, 1);
  assert.equal(filterFixtures(fx, "upcoming").length, 1);
  assert.equal(filterFixtures(fx, "all").length, 2);
  assert.equal(filterFixtures(fx, "anything-else").length, 2);
});

test("sortByDate orders chronologically, nulls last", () => {
  const fx = [
    { id: "b", utcDate: "2026-06-20T00:00:00Z" },
    { id: "c", utcDate: null },
    { id: "a", utcDate: "2026-06-11T00:00:00Z" }
  ];
  assert.deepEqual(sortByDate(fx).map((f) => f.id), ["a", "b", "c"]);
});

test("relativeDay returns Today / Tomorrow / empty in a fixed zone", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();
  assert.equal(relativeDay("2026-06-15T20:00:00Z", now, "UTC"), "Today");
  assert.equal(relativeDay("2026-06-16T08:00:00Z", now, "UTC"), "Tomorrow");
  assert.equal(relativeDay("2026-06-17T08:00:00Z", now, "UTC"), "");      // day after tomorrow
  assert.equal(relativeDay("2026-06-14T23:00:00Z", now, "UTC"), "");      // yesterday
  assert.equal(relativeDay(null, now, "UTC"), "");
});

test("relativeDay is timezone-aware (same instant, different local day)", () => {
  // now: 2026-06-15 23:00 UTC. A fixture at 2026-06-16 01:00 UTC is:
  //   UTC               → next calendar day  → "Tomorrow"
  //   America/New_York  → still 15 Jun (21:00) → "Today"
  const now = new Date("2026-06-15T23:00:00Z").getTime();
  assert.equal(relativeDay("2026-06-16T01:00:00Z", now, "UTC"), "Tomorrow");
  assert.equal(relativeDay("2026-06-16T01:00:00Z", now, "America/New_York"), "Today");
});

test("timeZoneAbbrev gives a short DST-aware label", () => {
  assert.match(timeZoneAbbrev("2026-06-15T12:00:00Z", "UTC"), /UTC|GMT/);
  // June in New York is daylight time (EDT / GMT-4)
  assert.match(timeZoneAbbrev("2026-06-15T12:00:00Z", "America/New_York"), /EDT|GMT-4/);
});

test("formatFixtureWhen prefixes Today/Tomorrow and appends the timezone", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();
  const today = formatFixtureWhen("2026-06-15T20:00:00Z", { now, timeZone: "UTC" });
  assert.match(today, /^Today · /);
  assert.match(today, /UTC|GMT/);

  const later = formatFixtureWhen("2026-06-21T17:00:00Z", { now, timeZone: "UTC" });
  assert.ok(!later.startsWith("Today"));
  assert.ok(!later.startsWith("Tomorrow"));
  assert.match(later, /UTC|GMT/);

  assert.equal(formatFixtureWhen(null, { now }), "TBC");
  assert.equal(formatFixtureWhen("not-a-date", { now }), "TBC");
});
