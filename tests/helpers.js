// Test helpers — deterministic fixture factories.
import { GROUPS } from "../lib/data.js";

// Build the 6 group-stage fixtures for a completed group with a known ranking.
// `ordered` = [1st, 2nd, 3rd, 4th]. The 3rd team beats the 4th by `margin`,
// which lets tests control third-placed goal difference (= margin - 2).
export function groupFixtures(group, ordered, { margin = 2, stage = "GROUP_STAGE" } = {}) {
  const [t1, t2, t3, t4] = ordered;
  const mk = (id, home, away, hs, as) =>
    ({ id, home, away, stage, played: true, homeScore: hs, awayScore: as, group });
  return [
    mk(group + "1", t1, t2, 1, 0),
    mk(group + "2", t1, t3, 1, 0),
    mk(group + "3", t1, t4, 1, 0),
    mk(group + "4", t2, t3, 1, 0),
    mk(group + "5", t2, t4, 1, 0),
    mk(group + "6", t3, t4, margin, 0)
  ];
}

// Every group complete, with distinct third-placed goal differences so the
// best-8 selection is unambiguous (group A weakest third … group L strongest).
export function allGroupsCompleteFixtures() {
  const out = [];
  Object.keys(GROUPS).forEach((g, i) => {
    out.push(...groupFixtures(g, GROUPS[g], { margin: i + 1 }));
  });
  return out;
}
