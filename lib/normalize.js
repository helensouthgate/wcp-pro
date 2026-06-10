// ─── TEAM-NAME NORMALISATION ─────────────────────────────────────────────────
// football-data.org uses its own canonical names (e.g. "Korea Republic",
// "Türkiye", "Côte d'Ivoire") which differ from the names in our draw. This
// module maps API names onto OUR canonical names so fixtures line up with the
// sweepstake.

import { ALL_TEAMS } from "./data.js";

// Lowercase, strip accents, strip anything that isn't a-z.
export function normalize(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// Explicit overrides: normalised API spelling -> our canonical name.
const OVERRIDES = {
  korearepublic: "South Korea",
  republicofkorea: "South Korea",
  southkorea: "South Korea",
  iriran: "Iran",
  iranislamicrepublicof: "Iran",
  iran: "Iran",
  cotedivoire: "Ivory Coast",
  ivorycoast: "Ivory Coast",
  turkiye: "Turkey",
  turkey: "Turkey",
  unitedstates: "USA",
  unitedstatesofamerica: "USA",
  usa: "USA",
  czechia: "Czech Republic",
  czechrepublic: "Czech Republic",
  bosniaandherzegovina: "Bosnia & Herzegovina",
  bosniaherzegovina: "Bosnia & Herzegovina",
  congodr: "DR Congo",
  drcongo: "DR Congo",
  democraticrepublicofthecongo: "DR Congo",
  democraticrepublicofcongo: "DR Congo",
  caboverde: "Cape Verde",
  capeverde: "Cape Verde",
  curacao: "Curaçao"
};

// Precompute normalised -> canonical for our own team list.
const CANONICAL_BY_NORM = new Map();
for (const t of ALL_TEAMS) CANONICAL_BY_NORM.set(normalize(t), t);

// Map an API team name to our canonical name. Falls back to the original
// string if we can't resolve it (so unknown teams are still visible).
export function mapTeam(apiName) {
  const norm = normalize(apiName);
  if (OVERRIDES[norm]) return OVERRIDES[norm];
  if (CANONICAL_BY_NORM.has(norm)) return CANONICAL_BY_NORM.get(norm);
  return apiName;
}
