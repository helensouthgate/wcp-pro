// ─── STANDINGS & AUTO-ELIMINATION ────────────────────────────────────────────
// Pure functions that turn scores + the group draw into group tables and a
// derived list of eliminated teams. No I/O, fully unit-testable.
//
// 2026 format: 12 groups of 4. Top 2 of each group + the 8 best third-placed
// teams advance to the Round of 32 (32 teams). The other 16 are eliminated at
// the group stage. In the knockouts, the loser of each played match is out.

import { GROUPS, MATCHES_PER_GROUP, groupOf } from "./data.js";

const WIN = 3;
const DRAW_PTS = 1;

function emptyRow(team) {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

// Is a fixture a played group-stage match? (Knockout matches have a stage.)
function isPlayedGroupMatch(fx) {
  return fx && fx.played && (!fx.stage || fx.stage === "GROUP_STAGE");
}

// Build the table for one group from its fixtures.
export function computeGroupTable(group, fixtures) {
  const teams = GROUPS[group] || [];
  const rows = new Map(teams.map((t) => [t, emptyRow(t)]));

  for (const fx of fixtures) {
    if (!isPlayedGroupMatch(fx)) continue;
    const home = rows.get(fx.home);
    const away = rows.get(fx.away);
    if (!home || !away) continue; // fixture not part of this group
    const hs = fx.homeScore, as = fx.awayScore;
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;

    home.played++; away.played++;
    home.gf += hs; home.ga += as;
    away.gf += as; away.ga += hs;
    if (hs > as) { home.won++; away.lost++; home.points += WIN; }
    else if (hs < as) { away.won++; home.lost++; away.points += WIN; }
    else { home.drawn++; away.drawn++; home.points += DRAW_PTS; away.points += DRAW_PTS; }
  }

  for (const r of rows.values()) r.gd = r.gf - r.ga;

  const playedFixtures = fixtures.filter(isPlayedGroupMatch);
  return sortGroup([...rows.values()], playedFixtures);
}

// Sort a group's rows by FIFA criteria:
//   1) points  2) goal difference  3) goals for
//   4) head-to-head among the tied teams (points, then GD, then GF)
//   5) alphabetical (stand-in for fair-play / drawing of lots)
export function sortGroup(rows, playedFixtures) {
  const cmpOverall = (a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf;

  return [...rows].sort((a, b) => {
    const base = cmpOverall(a, b);
    if (base !== 0) return base;
    const h2h = headToHead([a.team, b.team], playedFixtures);
    const ra = h2h.get(a.team), rb = h2h.get(b.team);
    const hd = rb.points - ra.points || rb.gd - ra.gd || rb.gf - ra.gf;
    if (hd !== 0) return hd;
    return a.team.localeCompare(b.team);
  });
}

// Mini-table considering only matches played between the given set of teams.
export function headToHead(teams, playedFixtures) {
  const set = new Set(teams);
  const rows = new Map(teams.map((t) => [t, emptyRow(t)]));
  for (const fx of playedFixtures) {
    if (!set.has(fx.home) || !set.has(fx.away)) continue;
    const home = rows.get(fx.home), away = rows.get(fx.away);
    const hs = fx.homeScore, as = fx.awayScore;
    home.gf += hs; home.ga += as; away.gf += as; away.ga += hs;
    if (hs > as) home.points += WIN;
    else if (hs < as) away.points += WIN;
    else { home.points += DRAW_PTS; away.points += DRAW_PTS; }
  }
  for (const r of rows.values()) r.gd = r.gf - r.ga;
  return rows;
}

// A group is complete once all 6 of its matches have been played.
export function isGroupComplete(group, fixtures) {
  const teams = new Set(GROUPS[group] || []);
  const played = fixtures.filter(
    (fx) => isPlayedGroupMatch(fx) && teams.has(fx.home) && teams.has(fx.away)
  ).length;
  return played >= MATCHES_PER_GROUP;
}

// Rank all third-placed teams to decide the best 8. Same criteria as a group,
// applied to each third-placed team's full group record.
export function rankThirds(thirdRows) {
  return [...thirdRows].sort(
    (a, b) =>
      b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
  );
}

// Split group fixtures from knockout fixtures.
function partition(fixtures) {
  const group = [], knockout = [];
  for (const fx of fixtures) {
    if (fx.stage && fx.stage !== "GROUP_STAGE") knockout.push(fx);
    else group.push(fx);
  }
  return { group, knockout };
}

// Compute every group table at once.
export function computeAllTables(fixtures) {
  const { group } = partition(fixtures);
  const tables = {};
  for (const g of Object.keys(GROUPS)) {
    const groupFixtures = group.filter(
      (fx) => groupOf(fx.home) === g && groupOf(fx.away) === g
    );
    tables[g] = computeGroupTable(g, groupFixtures);
  }
  return tables;
}

// Derive the full set of eliminated teams from results.
// Returns { eliminated:string[], tables, thirdsRanked, allGroupsComplete }.
export function computeEliminated(fixtures) {
  const { knockout } = partition(fixtures);
  const tables = computeAllTables(fixtures);
  const eliminated = new Set();

  // 4th place of any COMPLETED group is out immediately.
  const completedGroups = [];
  for (const [g, table] of Object.entries(tables)) {
    if (isGroupComplete(g, fixtures)) {
      completedGroups.push(g);
      if (table[3]) eliminated.add(table[3].team);
    }
  }

  // Best-8 third-placed teams: only resolvable once ALL groups are complete.
  const allGroupsComplete = completedGroups.length === Object.keys(GROUPS).length;
  let thirdsRanked = [];
  if (allGroupsComplete) {
    const thirds = Object.values(tables)
      .map((t) => t[2])
      .filter(Boolean);
    thirdsRanked = rankThirds(thirds);
    // Ranks 9..12 (the 4 worst thirds) are eliminated.
    thirdsRanked.slice(8).forEach((r) => eliminated.add(r.team));
  }

  // Knockouts: the loser of any played match is eliminated.
  for (const fx of knockout) {
    if (!fx.played || !Number.isFinite(fx.homeScore) || !Number.isFinite(fx.awayScore)) continue;
    if (fx.homeScore > fx.awayScore) eliminated.add(fx.away);
    else if (fx.awayScore > fx.homeScore) eliminated.add(fx.home);
    // Draws in knockouts are decided on penalties — recorded via winner field
    // if present, otherwise left undecided here.
    else if (fx.winner) {
      const loser = fx.winner === fx.home ? fx.away : fx.home;
      eliminated.add(loser);
    }
  }

  return {
    eliminated: [...eliminated],
    tables,
    thirdsRanked,
    allGroupsComplete
  };
}
