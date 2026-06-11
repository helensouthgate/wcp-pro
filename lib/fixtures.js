// ─── FIXTURE TRANSFORM & FILTERS ─────────────────────────────────────────────
// Convert football-data.org match payloads into our compact fixture model, and
// provide the pure filtering logic used by the Fixtures tab (All / Played /
// Upcoming / This week). "This week" is evaluated in the VIEWER's local time.

import { mapTeam } from "./normalize.js";
import { groupOf } from "./data.js";

// Transform a football-data.org /matches payload into our fixture array.
export function transformApiMatches(payload) {
  const matches = (payload && payload.matches) || [];
  return matches.map((m) => {
    const home = mapTeam(m.homeTeam?.name ?? m.homeTeam?.shortName ?? "");
    const away = mapTeam(m.awayTeam?.name ?? m.awayTeam?.shortName ?? "");
    const ft = m.score?.fullTime ?? {};
    const played = m.status === "FINISHED" && Number.isFinite(ft.home) && Number.isFinite(ft.away);
    const winnerCode = m.score?.winner; // HOME_TEAM | AWAY_TEAM | DRAW | null
    let winner = null;
    if (winnerCode === "HOME_TEAM") winner = home;
    else if (winnerCode === "AWAY_TEAM") winner = away;
    return {
      id: String(m.id),
      home,
      away,
      stage: m.stage || "GROUP_STAGE",
      group: groupOf(home) || groupOf(away) || null,
      utcDate: m.utcDate || null,
      played,
      homeScore: played ? ft.home : null,
      awayScore: played ? ft.away : null,
      winner
    };
  });
}

// Merge freshly-synced fixtures with any manually-entered scores already held
// in state. API results win when present; otherwise we keep a manual score.
export function mergeManualScores(fixtures, manualScores = {}) {
  return fixtures.map((fx) => {
    if (fx.played) return fx;
    const manual = manualScores[fx.id];
    if (manual && Number.isFinite(manual.home) && Number.isFinite(manual.away)) {
      return { ...fx, played: true, homeScore: manual.home, awayScore: manual.away, manual: true };
    }
    return fx;
  });
}

const startOfLocalDay = (now) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// From the start of today (local) through +N days. Includes played matches today.
export function isWithinNextDays(fixture, days, now = Date.now()) {
  if (!fixture.utcDate) return false;
  const t = new Date(fixture.utcDate).getTime();
  if (!Number.isFinite(t)) return false;
  const start = startOfLocalDay(now);
  const end = start + days * 24 * 60 * 60 * 1000;
  return t >= start && t < end;
}

export function isThisWeek(fixture, now = Date.now()) {
  return isWithinNextDays(fixture, 7, now);
}

// Filter fixtures by mode. `now` is injectable for testing.
export function filterFixtures(fixtures, mode, now = Date.now()) {
  switch (mode) {
    case "played":
      return fixtures.filter((fx) => fx.played);
    case "upcoming":
      return fixtures.filter((fx) => !fx.played);
    case "week":
      return fixtures.filter((fx) => isThisWeek(fx, now));
    case "all":
    default:
      return fixtures;
  }
}

// Stable chronological sort (fixtures with no date sink to the bottom).
export function sortByDate(fixtures) {
  return [...fixtures].sort((a, b) => {
    const ta = a.utcDate ? new Date(a.utcDate).getTime() : Infinity;
    const tb = b.utcDate ? new Date(b.utcDate).getTime() : Infinity;
    return ta - tb;
  });
}

// ─── DATE / TIME DISPLAY ─────────────────────────────────────────────────────
// All evaluated in the viewer's local timezone (timeZone === undefined uses the
// runtime default). Tests pass an explicit timeZone for determinism.

// The calendar date (YYYY-MM-DD) of a moment, in a given timezone.
function ymdInZone(ms, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(ms));
}

// "Today" / "Tomorrow" / "" — compared by calendar day in the given timezone.
export function relativeDay(utcDate, now = Date.now(), timeZone = undefined) {
  if (!utcDate) return "";
  const t = new Date(utcDate).getTime();
  if (!Number.isFinite(t)) return "";
  const day = ymdInZone(t, timeZone);
  if (day === ymdInZone(now, timeZone)) return "Today";
  if (day === ymdInZone(now + 86400000, timeZone)) return "Tomorrow";
  return "";
}

// Short timezone label for a date (e.g. "EDT", "GMT+1"), DST-aware via the date.
export function timeZoneAbbrev(utcDate, timeZone = undefined, locale = "en-US") {
  const d = utcDate ? new Date(utcDate) : new Date();
  if (isNaN(d)) return "";
  const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName");
  return part ? part.value : "";
}

// Full display string for a fixture's kickoff:
//   "Today · 11 Jun, 20:00 GMT+1"  /  "21 Jun, 17:00 EDT"  /  "TBC"
export function formatFixtureWhen(utcDate, { now = Date.now(), timeZone = undefined, locale = "en-US" } = {}) {
  if (!utcDate) return "TBC";
  const d = new Date(utcDate);
  if (isNaN(d)) return "TBC";
  const dateStr = new Intl.DateTimeFormat(locale, {
    timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(d);
  const tz = timeZoneAbbrev(utcDate, timeZone, locale);
  const rel = relativeDay(utcDate, now, timeZone);
  return `${rel ? rel + " · " : ""}${dateStr}${tz ? " " + tz : ""}`;
}
