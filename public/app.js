// ─── PUBLIC, READ-ONLY FRONT-END ─────────────────────────────────────────────
// Fetches the shared view from /api/state and renders it. No writes, no secrets.
// "This week" is computed in the viewer's local timezone.

let view = null;          // latest /api/state payload
const PREDICTION_WINDOW_DAYS = 14;
const TAB_KEY = "wcp-tab";
const PRED_OPEN_KEY = "wcp-pred-open";
const PANELS = ["leaderboard", "fixtures", "groups"];

const $ = (id) => document.getElementById(id);
const isElim = (t) => view.eliminated.includes(t);
const byTeam = (t) => view.draw.find((d) => d.t === t);
const initials = (n) => n.split(" ").filter(Boolean).map((w) => w[0]).join("").substring(0, 2).toUpperCase();

const AVA = [
  { bg: "#dbeafe", c: "#1e40af" }, { bg: "#dcfce7", c: "#166534" },
  { bg: "#fef3c7", c: "#92400e" }, { bg: "#fce7f3", c: "#9d174d" },
  { bg: "#ede9fe", c: "#4c1d95" }, { bg: "#ffedd5", c: "#9a3412" },
  { bg: "#d1fae5", c: "#065f46" }, { bg: "#e0e7ff", c: "#3730a3" },
  { bg: "#fef9c3", c: "#713f12" }, { bg: "#fce7f3", c: "#831843" },
  { bg: "#ecfeff", c: "#164e63" }, { bg: "#f0fdf4", c: "#14532d" }
];
const ava = (i) => AVA[i % AVA.length];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ─── DATA FILTERS (mirror lib/fixtures.js, run in the browser) ────────────────

function isThisWeek(fx, now) {
  if (!fx.utcDate) return false;
  const t = new Date(fx.utcDate).getTime();
  if (!Number.isFinite(t)) return false;
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const s = start.getTime();
  return t >= s && t < s + 7 * 864e5;
}

function getPredOpenState() {
  try {
    const raw = localStorage.getItem(PRED_OPEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function isPredExpanded(id) {
  return !!getPredOpenState()[id];
}

function setPredExpanded(id, expanded) {
  const state = getPredOpenState();
  if (expanded) state[id] = true;
  else delete state[id];
  try { localStorage.setItem(PRED_OPEN_KEY, JSON.stringify(state)); } catch {}
}

function predictionContent(m) {
  const pred = view.predictions[m.id];
  if (pred) return formatPredictionHtml(pred, esc, { home: m.home, away: m.away });
  if (!m.played) {
    return formatPredictionUnavailable(
      `Predictions are only generated for upcoming matches in the next ${PREDICTION_WINDOW_DAYS} days.`,
      esc
    );
  }
  return "";
}

function canShowPredictionToggle(m) {
  return !!predictionContent(m);
}

function predToggleHtml(open) {
  const icon = open ? "▲" : "✨";
  const text = open ? "Hide AI Prediction" : "Show AI Prediction";
  return `<span class="pred-toggle-icon" aria-hidden="true">${icon}</span>${text}`;
}

function renderPredictionToggle(m) {
  if (!canShowPredictionToggle(m)) return "";
  const id = esc(m.id);
  const open = isPredExpanded(m.id);
  return `
    <button type="button" class="btn pred-toggle" data-pred-toggle="${id}" aria-expanded="${open}" aria-controls="pred-panel-${id}">
      ${predToggleHtml(open)}
    </button>
    <div class="pred-reveal${open ? " is-open" : ""}" id="pred-panel-${id}" data-pred-panel="${id}">
      <div class="pred-reveal-inner">${predictionContent(m)}</div>
    </div>`;
}

function togglePrediction(id, btn) {
  const panel = document.getElementById(`pred-panel-${id}`);
  const next = btn.getAttribute("aria-expanded") !== "true";
  setPredExpanded(id, next);
  btn.setAttribute("aria-expanded", String(next));
  btn.innerHTML = predToggleHtml(next);
  if (!panel) return;
  if (next) {
    panel.classList.add("is-open", "is-animating");
    const onEnd = (e) => {
      if (e.target.classList.contains("pred-callout")) {
        panel.classList.remove("is-animating");
        panel.removeEventListener("animationend", onEnd);
      }
    };
    panel.addEventListener("animationend", onEnd);
  } else {
    panel.classList.remove("is-open", "is-animating");
  }
}

function filterFixtures(fixtures, mode) {
  const now = Date.now();
  if (mode === "played") return fixtures.filter((f) => f.played);
  if (mode === "upcoming") return fixtures.filter((f) => !f.played);
  if (mode === "week") return fixtures.filter((f) => isThisWeek(f, now));
  return fixtures;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

function saveTab(id) {
  try { localStorage.setItem(TAB_KEY, id); } catch {}
}

function savedTab() {
  try {
    const id = localStorage.getItem(TAB_KEY);
    return PANELS.includes(id) ? id : "leaderboard";
  } catch {
    return "leaderboard";
  }
}

function nav(id, btn) {
  document.documentElement.dataset.tab = id;
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
  $("panel-" + id).classList.add("active");
  btn.classList.add("active");
  saveTab(id);
  if (id === "leaderboard") renderLB();
  if (id === "fixtures") renderFixtures();
  if (id === "groups") renderGroups();
}

// ─── STATS ──────────────────────────────────────────────────────────────────

function renderStats() {
  const total = view.draw.length;
  const out = view.draw.filter((d) => isElim(d.t)).length;
  const alive = total - out;
  const played = view.fixtures.filter((f) => f.played).length;
  const upcoming = view.fixtures.length - played;
  $("stats-bar").innerHTML = `
    <div class="stat"><div class="stat-num stat-num--in">${alive}</div><div class="stat-label">Still in</div></div>
    <div class="stat"><div class="stat-num stat-num--out">${out}</div><div class="stat-label">Eliminated</div></div>
    <div class="stat"><div class="stat-num">${played}</div><div class="stat-label">Played</div></div>
    <div class="stat"><div class="stat-num">${upcoming}</div><div class="stat-label">Upcoming</div></div>`;
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

function renderLB() {
  renderStats();
  const q = ($("lb-search").value || "").toLowerCase();
  const filt = $("lb-filter").value;
  const grp = $("lb-group").value;
  let data = view.draw.map((d, idx) => ({ ...d, idx }));
  if (q) data = data.filter((d) => d.n.toLowerCase().includes(q) || d.t.toLowerCase().includes(q));
  if (filt === "in") data = data.filter((d) => !isElim(d.t));
  if (filt === "out") data = data.filter((d) => isElim(d.t));
  if (grp !== "all") data = data.filter((d) => d.g === grp);
  data.sort((a, b) => {
    const ae = isElim(a.t), be = isElim(b.t);
    if (ae && !be) return 1;
    if (!ae && be) return -1;
    return a.n.localeCompare(b.n);
  });
  const grid = $("lb-grid");
  if (!data.length) { grid.innerHTML = '<div class="empty">No results found.</div>'; return; }
  grid.innerHTML = data.map((d) => {
    const c = ava(d.idx), elim = isElim(d.t);
    return `<div class="p-card ${elim ? "elim" : "still-in"}">
      <div class="avatar" style="background:${c.bg};color:${c.c}">${esc(initials(d.n))}</div>
      <div style="flex:1;min-width:0">
        <div class="p-name">${esc(d.n)}</div>
        <div class="p-sub">${d.f} ${esc(d.t)} &middot; Group ${d.g}</div>
      </div>
      <span class="pill ${elim ? "pill-out" : "pill-in"}">${elim ? "Out" : "In"}</span>
    </div>`;
  }).join("");
}

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

function stageLabel(fx) {
  if (!fx.stage || fx.stage === "GROUP_STAGE") return fx.group ? "Group " + fx.group : "Group stage";
  return ({
    LAST_32: "Round of 32", LAST_16: "Round of 16", QUARTER_FINALS: "Quarter-final",
    SEMI_FINALS: "Semi-final", THIRD_PLACE: "Third place", FINAL: "Final"
  })[fx.stage] || fx.stage;
}

// Kickoff display incl. Today/Tomorrow prefix and the viewer's timezone.
const fmtDate = (iso) => WCWhen.formatFixtureWhen(iso);

function renderFixtures() {
  const stage = $("fix-stage").value;
  const grp = $("fix-group").value;
  let matches = filterFixtures(view.fixtures, stage);
  if (grp !== "all") matches = matches.filter((m) => m.group === grp);
  const list = $("fix-list");
  if (!view.fixtures.length) {
    list.innerHTML = '<div class="empty">No fixtures yet. An admin needs to sync the schedule.</div>';
    return;
  }
  if (!matches.length) { list.innerHTML = '<div class="empty">No matches match this filter.</div>'; return; }
  list.innerHTML = matches.map((m) => {
    const hp = byTeam(m.home), ap = byTeam(m.away);
    return `<div class="match-card">
      <div class="match-grid">
        <div class="match-team">
          <div class="m-flag">${hp ? hp.f : "🏳"}</div>
          <div class="m-name">${esc(m.home)}</div>
          <div class="m-entry${hp ? "" : " none"}">${hp ? esc(hp.n) : "No entry"}</div>
        </div>
        <div>${m.played
          ? `<div class="score-block"><span class="score-n">${m.homeScore}</span><span class="score-dash">–</span><span class="score-n">${m.awayScore}</span></div>`
          : `<div class="vs-txt">vs</div>`}
        </div>
        <div class="match-team">
          <div class="m-flag">${ap ? ap.f : "🏳"}</div>
          <div class="m-name">${esc(m.away)}</div>
          <div class="m-entry${ap ? "" : " none"}">${ap ? esc(ap.n) : "No entry"}</div>
        </div>
      </div>
      <div class="match-footer">
        <span class="stage-tag">${fmtDate(m.utcDate)} &middot; ${stageLabel(m)}</span>
        <span class="pill ${m.played ? "pill-in" : "pill-up"}">${m.played ? "Full time" : "Upcoming"}</span>
      </div>
      ${renderPredictionToggle(m)}
    </div>`;
  }).join("");
}

// ─── GROUPS (with live standings) ─────────────────────────────────────────────

function renderGroups() {
  const tables = view.tables || {};
  $("groups-grid").innerHTML = Object.keys(view.groups).map((g) => {
    const rows = tables[g] || view.groups[g].map((t) => ({ team: t, played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0 }));
    const body = rows.map((r, i) => {
      const p = byTeam(r.team);
      const qual = i < 2; // top 2 always advance
      return `<div class="g-row${isElim(r.team) ? " elim" : qual ? " qual" : ""}">
        <span class="g-pos">${i + 1}</span>
        <span class="g-team">${p ? p.f : "🏳"} ${esc(r.team)} <span class="who">${p ? "· " + esc(p.n) : ""}</span></span>
        <span class="g-num">${r.played}</span>
        <span class="g-num">${r.gd > 0 ? "+" + r.gd : r.gd}</span>
        <span class="g-pts">${r.points}</span>
      </div>`;
    }).join("");
    return `<div class="g-card">
      <div class="g-header"><span>Group ${g}</span></div>
      <div class="g-colhead"><span>#</span><span>Team</span><span>P</span><span>GD</span><span>Pts</span></div>
      ${body}
    </div>`;
  }).join("");
}

// ─── SYNC STATUS (fixtures / results refresh every 15 min) ───────────────────

const SYNC_NOTICE_IDS = ["sync-notice-lb", "sync-notice-fix", "sync-notice-grp"];
let syncClockId = null;

const fmtWhen = (iso) => new Date(iso).toLocaleString([], {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
});

// Next :00 / :15 / :30 / :45 UTC — matches the sync-scheduled cron.
function nextSyncAt(from = Date.now()) {
  const d = new Date(from);
  d.setUTCSeconds(0, 0);
  d.setUTCMilliseconds(0);
  const mins = d.getUTCMinutes();
  const remainder = mins % 15;
  if (remainder === 0 && from <= d.getTime()) d.setUTCMinutes(mins + 15);
  else d.setUTCMinutes(mins + (15 - remainder));
  return d;
}

function formatCountdown(ms) {
  if (ms <= 0) return "any moment";
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min}m ${sec}s` : `${min}m`;
}

function syncNoticeHtml() {
  const last = view.lastSync ? fmtWhen(view.lastSync) : null;
  const next = nextSyncAt();
  const nextIn = formatCountdown(next.getTime() - Date.now());
  const nextAt = fmtWhen(next.toISOString());
  const lastPart = last
    ? `Last updated <strong>${esc(last)}</strong>`
    : "Not synced yet";
  return (
    `Fixtures and results update every 15 minutes. ${lastPart} · ` +
    `Next update in <strong>${esc(nextIn)}</strong> (at ${esc(nextAt)})`
  );
}

function updateSyncNotices() {
  if (!view) return;
  const html = syncNoticeHtml();
  for (const id of SYNC_NOTICE_IDS) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }
}

function startSyncClock() {
  if (syncClockId) clearInterval(syncClockId);
  updateSyncNotices();
  syncClockId = setInterval(updateSyncNotices, 1000);
}

// ─── LOAD ──────────────────────────────────────────────────────────────────────

function updateLastUpdated() {
  const el = $("last-updated");
  const when = view.lastSync || view.lastUpdated;
  if (!when) { el.textContent = ""; return; }
  el.textContent = "Updated " + fmtWhen(when);
}

function fillGroupSelects() {
  const opts = Object.keys(view.groups).map((g) => `<option value="${g}">Group ${g}</option>`).join("");
  $("lb-group").insertAdjacentHTML("beforeend", opts);
  $("fix-group").insertAdjacentHTML("beforeend", opts);
}

async function load() {
  try {
    const resp = await fetch("/api/state");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    view = await resp.json();
  } catch (e) {
    document.querySelector(".page").innerHTML = '<div class="empty">Could not load data. Please refresh.</div>';
    return;
  }
  fillGroupSelects();
  updateLastUpdated();
  startSyncClock();
  const panel = savedTab();
  const tab = document.querySelector(`.nav-tab[data-panel="${panel}"]`);
  nav(panel, tab || document.querySelector('.nav-tab[data-panel="leaderboard"]'));
}

function toast(msg) {
  const el = $("toast"); el.textContent = msg; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

document.querySelectorAll(".nav-tab").forEach((btn) =>
  btn.addEventListener("click", () => nav(btn.dataset.panel, btn)));
["lb-search", "lb-filter", "lb-group"].forEach((id) =>
  $(id).addEventListener("input", renderLB));
["fix-stage", "fix-group"].forEach((id) =>
  $(id).addEventListener("change", renderFixtures));
$("fix-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-pred-toggle]");
  if (btn) togglePrediction(btn.dataset.predToggle, btn);
});
load();
