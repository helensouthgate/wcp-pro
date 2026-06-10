// ─── STATIC SWEEPSTAKE DATA ──────────────────────────────────────────────────
// The group draw (which teams are in which group) and the participant draw
// (which person drew which team). These are specific to our office pool and are
// NOT secret — they are sent to the public page so it can render names/flags.
//
// Live fixtures, dates and results are NOT defined here — those are synced from
// the football-data.org API and stored in Netlify Blobs (see lib/fixtures.js).

export const GROUPS = {
  A: ["Mexico",      "South Korea",  "South Africa",        "Czech Republic"],
  B: ["Canada",      "Switzerland",  "Qatar",               "Bosnia & Herzegovina"],
  C: ["Brazil",      "Morocco",      "Scotland",            "Haiti"],
  D: ["USA",         "Australia",    "Paraguay",            "Turkey"],
  E: ["Germany",     "Ecuador",      "Ivory Coast",         "Curaçao"],
  F: ["Netherlands", "Japan",        "Tunisia",             "Sweden"],
  G: ["Belgium",     "Iran",         "Egypt",               "New Zealand"],
  H: ["Spain",       "Uruguay",      "Saudi Arabia",        "Cape Verde"],
  I: ["France",      "Senegal",      "Norway",              "Iraq"],
  J: ["Argentina",   "Austria",      "Algeria",             "Jordan"],
  K: ["Portugal",    "Colombia",     "Uzbekistan",          "DR Congo"],
  L: ["England",     "Croatia",      "Panama",              "Ghana"]
};

export const DRAW = [
  { n: "Helen Southgate",        t: "England",              f: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", g: "L" },
  { n: "Eugene Amoono",          t: "Switzerland",          f: "🇨🇭", g: "B" },
  { n: "Ben Norton",             t: "Tunisia",              f: "🇹🇳", g: "F" },
  { n: "Sarah Alavi",            t: "Canada",               f: "🇨🇦", g: "B" },
  { n: "Raul Rodriguez Poncela", t: "Curaçao",              f: "🇨🇼", g: "E" },
  { n: "Eden Harris",            t: "Ghana",                f: "🇬🇭", g: "L" },
  { n: "Niamh Jones",            t: "Sweden",               f: "🇸🇪", g: "F" },
  { n: "Eve Hutchison",          t: "Brazil",               f: "🇧🇷", g: "C" },
  { n: "Stephen Cross",          t: "Colombia",             f: "🇨🇴", g: "K" },
  { n: "George Clarke",          t: "Argentina",            f: "🇦🇷", g: "J" },
  { n: "Enrico Chemolli",        t: "Algeria",              f: "🇩🇿", g: "J" },
  { n: "Axel Kenfack",           t: "Panama",               f: "🇵🇦", g: "L" },
  { n: "Mubarak Alli",           t: "Iran",                 f: "🇮🇷", g: "G" },
  { n: "Stephanie Swan",         t: "Japan",                f: "🇯🇵", g: "F" },
  { n: "Shane Gibbons",          t: "Czech Republic",       f: "🇨🇿", g: "A" },
  { n: "Emily Moore",            t: "Uruguay",              f: "🇺🇾", g: "H" },
  { n: "Meg Rolfe",              t: "South Korea",          f: "🇰🇷", g: "A" },
  { n: "Steffi Crowther",        t: "Qatar",                f: "🇶🇦", g: "B" },
  { n: "Jillian Menkes",         t: "Australia",            f: "🇦🇺", g: "D" },
  { n: "Said Abshir",            t: "Spain",                f: "🇪🇸", g: "H" },
  { n: "Rebecca den Hartog",     t: "France",               f: "🇫🇷", g: "I" },
  { n: "Linda Jurado",           t: "Uzbekistan",           f: "🇺🇿", g: "K" },
  { n: "Natalie Zatezalo",       t: "Bosnia & Herzegovina", f: "🇧🇦", g: "B" },
  { n: "Samantha Cormier",       t: "Austria",              f: "🇦🇹", g: "J" },
  { n: "Justin Henderson",       t: "Ecuador",              f: "🇪🇨", g: "E" },
  { n: "Kasey Pass",             t: "Mexico",               f: "🇲🇽", g: "A" },
  { n: "Matthieu Deschemin",     t: "Norway",               f: "🇳🇴", g: "I" },
  { n: "Madisun Miska",          t: "Turkey",               f: "🇹🇷", g: "D" },
  { n: "Stephanie Olen",         t: "Egypt",                f: "🇪🇬", g: "G" },
  { n: "Christian Mathis",       t: "Germany",              f: "🇩🇪", g: "E" },
  { n: "Heather Creamer",        t: "Netherlands",          f: "🇳🇱", g: "F" },
  { n: "Christina Scarpa",       t: "New Zealand",          f: "🇳🇿", g: "G" },
  { n: "Femi",                   t: "Saudi Arabia",         f: "🇸🇦", g: "H" },
  { n: "Thomas Pfeiffer",        t: "South Africa",         f: "🇿🇦", g: "A" },
  { n: "Selena Schmidtke",       t: "Morocco",              f: "🇲🇦", g: "C" },
  { n: "Yasamine Davami",        t: "Croatia",              f: "🇭🇷", g: "L" },
  { n: "Matilde Cruz",           t: "Belgium",              f: "🇧🇪", g: "G" },
  { n: "Sarah Dayes",            t: "Ivory Coast",          f: "🇨🇮", g: "E" },
  { n: "Chelsey Holt",           t: "Iraq",                 f: "🇮🇶", g: "I" },
  { n: "Florian Jetzlsperger",   t: "Scotland",             f: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", g: "C" },
  { n: "Marianna Morón Garcia",  t: "Portugal",             f: "🇵🇹", g: "K" },
  { n: "Libby Wright",           t: "DR Congo",             f: "🇨🇩", g: "K" },
  { n: "Candice Quirk",          t: "Paraguay",             f: "🇵🇾", g: "D" },
  { n: "Brooke Soracchi",        t: "Cape Verde",           f: "🇨🇻", g: "H" },
  { n: "Jon Claydon",            t: "Jordan",               f: "🇯🇴", g: "J" },
  { n: "Jacob Gifford",          t: "Senegal",              f: "🇸🇳", g: "I" },
  { n: "Juan Ramirez",           t: "Haiti",                f: "🇭🇹", g: "C" },
  { n: "Kevin White",            t: "USA",                  f: "🇺🇸", g: "D" }
];

// FIFA competition code used by football-data.org for the World Cup.
export const FOOTBALL_DATA_COMPETITION = "WC";

// World Cup 2026 group-stage format: 12 groups of 4, round-robin = 6 matches/group.
export const MATCHES_PER_GROUP = 6;

// Knockout stage identifiers (anything that is not GROUP_STAGE).
export const KNOCKOUT_STAGES = new Set([
  "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"
]);

// All team names that exist in our pool, derived from the group draw.
export const ALL_TEAMS = Object.values(GROUPS).flat();

// Map a team name to the group letter it belongs to (or null if unknown).
export function groupOf(team) {
  for (const [g, teams] of Object.entries(GROUPS)) {
    if (teams.includes(team)) return g;
  }
  return null;
}
