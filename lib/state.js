// ─── SHARED STATE SHAPE & VALIDATION ─────────────────────────────────────────
// Pure helpers describing the single shared document we keep in Netlify Blobs
// and the validation applied to admin write actions. No I/O here.

export const DEFAULT_STATE = {
  manualScores: {},   // { [fixtureId]: { home, away } }  — admin hand-entered
  manualOut: [],      // teams force-eliminated by an admin (override)
  manualIn: [],       // teams force-restored by an admin (override)
  predictions: {},    // { [fixtureId]: "prediction text" }
  lastUpdated: null,  // ISO timestamp
  lastSync: null,     // ISO timestamp of last football-data sync
  lastPrediction: null // ISO timestamp of last prediction run
};

export const DEFAULT_FIXTURES = []; // populated by sync

export function withDefaults(state) {
  return { ...DEFAULT_STATE, ...(state || {}) };
}

// Validate a single score value: integer 0..30.
export function isValidScore(n) {
  return Number.isInteger(n) && n >= 0 && n <= 30;
}

// Validate & normalise an admin "set score" action.
export function parseScoreAction(body) {
  const id = body?.id;
  const home = Number(body?.home);
  const away = Number(body?.away);
  if (typeof id !== "string" || !id) throw new Error("Invalid fixture id");
  if (!isValidScore(home) || !isValidScore(away)) throw new Error("Scores must be integers 0–30");
  return { id, home, away };
}

// Combine derived eliminations (from results) with admin overrides.
// manualOut adds teams; manualIn removes teams (e.g. to correct a mistake).
export function applyOverrides(derivedEliminated, state) {
  const set = new Set(derivedEliminated);
  for (const t of state.manualOut || []) set.add(t);
  for (const t of state.manualIn || []) set.delete(t);
  return [...set];
}
