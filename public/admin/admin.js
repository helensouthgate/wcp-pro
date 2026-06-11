// ─── ADMIN FRONT-END ─────────────────────────────────────────────────────────
// Gated by a server session cookie. The password is sent once to /api/login and
// never stored client-side; all write actions rely on the HttpOnly cookie.

let view = null;
const $ = (id) => document.getElementById(id);
const byTeam = (t) => view.draw.find((d) => d.t === t);
function esc(s){return String(s).replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400);}

async function api(path, opts) {
  const resp = await fetch(path, opts);
  let data = null;
  try { data = await resp.json(); } catch {}
  if (!resp.ok) throw new Error((data && data.error) || ("HTTP " + resp.status));
  return data;
}

// ─── AUTH ──────────────────────────────────────────────────────────────────

async function checkSession() {
  try {
    const { authenticated } = await api("/api/login");
    if (authenticated) showAdmin();
  } catch {}
}

async function login() {
  const pw = $("pw").value;
  if (!pw) { toast("Enter the password"); return; }
  $("login-btn").disabled = true;
  try {
    await api("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw })
    });
    $("pw").value = "";
    showAdmin();
  } catch (e) {
    toast(e.message);
  } finally {
    $("login-btn").disabled = false;
  }
}

async function logout() {
  try { await api("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); } catch {}
  location.reload();
}

function showAdmin() {
  $("login-view").classList.add("hidden");
  $("admin-view").classList.remove("hidden");
  $("logout-btn").classList.remove("hidden");
  loadState();
}

// ─── STATE / RENDER ──────────────────────────────────────────────────────────

function formatPredictionResult({ elapsed = null } = {}) {
  const cost = view?.lastPredictionCost;
  if (!cost && !elapsed) return "";
  const days = cost?.windowDays || 14;
  const parts = [];
  if (elapsed) {
    parts.push(`Predictions updated in <strong>${esc(elapsed)}</strong>`);
  } else if (view?.lastPrediction) {
    parts.push(`Last updated <strong>${esc(fmt(view.lastPrediction))}</strong>`);
  }
  if (cost) {
    const scope = cost.scopedFixtures != null
      ? `${cost.predictions || 0}/${cost.scopedFixtures} predictions (next ${days} days)`
      : `${cost.predictions || 0} predictions`;
    parts.push(
      `${scope}, ${cost.batches || 0} batches, est. <strong>${esc(cost.formatted || "$0.00")}</strong>`
    );
  }
  return parts.join(" · ");
}

function renderPredictionResult({ elapsed = null, running = false } = {}) {
  const result = $("predict-result");
  const timer = $("predict-timer");
  if (running) {
    result.classList.add("hidden");
    result.innerHTML = "";
    return;
  }
  const html = formatPredictionResult({ elapsed });
  if (!html) {
    result.classList.add("hidden");
    result.innerHTML = "";
    timer.classList.add("hidden");
    return;
  }
  timer.classList.add("hidden");
  result.innerHTML = html;
  result.classList.remove("hidden");
}

async function loadState() {
  view = await api("/api/state");
  const opts = Object.keys(view.groups).map((g) => `<option value="${g}">Group ${g}</option>`).join("");
  $("adm-group").innerHTML = '<option value="all">All groups</option>' + opts;
  $("sync-status").textContent = view.lastSync ? "Last synced " + fmt(view.lastSync) : "Not synced yet";
  $("predict-status").textContent = view.lastPrediction ? "Last run " + fmt(view.lastPrediction) : "Not run yet";
  renderPredictionResult();
  renderMatches();
  renderOverrides();
}

const fmt = (iso) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function renderMatches() {
  const stage = $("adm-stage").value;
  const grp = $("adm-group").value;
  let matches = view.fixtures;
  if (stage === "upcoming") matches = matches.filter((m) => !m.played);
  if (stage === "played") matches = matches.filter((m) => m.played);
  if (grp !== "all") matches = matches.filter((m) => m.group === grp);
  const box = $("admin-matches");
  if (!view.fixtures.length) { box.innerHTML = '<div class="empty">No fixtures yet — sync first.</div>'; return; }
  if (!matches.length) { box.innerHTML = '<div class="empty">No matches match this filter.</div>'; return; }
  box.innerHTML = matches.map((m) => {
    const hp = byTeam(m.home), ap = byTeam(m.away);
    return `<div class="admin-match-row">
      <div class="aml">${hp ? hp.f : ""} ${esc(m.home)} vs ${ap ? ap.f : ""} ${esc(m.away)}
        <span>${WCWhen.formatFixtureWhen(m.utcDate)} &middot; ${m.group ? "Group " + m.group : (m.stage || "")}</span></div>
      <input class="score-inp" id="sh-${m.id}" type="number" min="0" max="30" placeholder="H" value="${m.played ? m.homeScore : ""}">
      <span style="color:var(--text3)">–</span>
      <input class="score-inp" id="sa-${m.id}" type="number" min="0" max="30" placeholder="A" value="${m.played ? m.awayScore : ""}">
      <button class="btn" data-save="${m.id}">Save</button>
      ${m.played ? `<button class="btn" data-clear="${m.id}">Clear</button>` : ""}
    </div>`;
  }).join("");
}

function renderOverrides() {
  const sel = $("elim-select");
  const alive = view.draw.filter((d) => !view.eliminated.includes(d.t)).sort((a, b) => a.t.localeCompare(b.t));
  sel.innerHTML = '<option value="">Select team…</option>' +
    alive.map((d) => `<option value="${esc(d.t)}">${d.f} ${esc(d.t)}</option>`).join("");
  const overrides = [...(view.draw.filter((d) => view.eliminated.includes(d.t)).map((d) => d.t))];
  // Only show entries that are *manual* overrides isn't tracked client-side, so
  // we surface all eliminated teams with a clear action; clearing a non-override is a no-op server-side.
  $("override-tags").innerHTML = overrides.length
    ? overrides.map((t) => { const p = byTeam(t); return `<button class="elim-tag" data-clear-override="${esc(t)}" title="Clear override / restore">${p ? p.f : ""} ${esc(t)} ×</button>`; }).join("")
    : '<span style="font-size:12px;color:var(--text3)">No teams eliminated yet</span>';
}

// ─── PREDICTION TIMER ──────────────────────────────────────────────────────

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min}m ${sec}s` : `${min}m`;
}

function createPredictTimer() {
  const el = $("predict-timer");
  const started = performance.now();
  let intervalId = null;
  let currentLabel = "Running…";

  const tick = () => {
    el.textContent = `${currentLabel} ${formatElapsed(performance.now() - started)}`;
  };

  const start = (label = "Running…") => {
    currentLabel = label;
    el.classList.remove("hidden", "done");
    tick();
    if (!intervalId) intervalId = setInterval(tick, 1000);
  };

  const finish = (label, { done = true, hide = true } = {}) => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    const elapsed = formatElapsed(performance.now() - started);
    if (hide) {
      el.classList.add("hidden");
      el.textContent = "";
    } else {
      el.textContent = `${label} ${elapsed}`;
      el.classList.toggle("done", done);
      el.classList.remove("hidden");
    }
    return elapsed;
  };

  const clear = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    el.textContent = "";
    el.classList.add("hidden");
    el.classList.remove("done");
  };

  return { start, finish, clear };
}

// ─── ACTIONS ───────────────────────────────────────────────────────────────

async function post(body) {
  view = await api("/api/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function sync() {
  $("sync-btn").disabled = true;
  $("sync-btn").innerHTML = '<span class="spin"></span> Syncing…';
  try {
    const r = await api("/api/sync", { method: "POST" });
    toast(`Synced ${r.total} fixtures (${r.played} played)`);
    await loadState();
  } catch (e) { toast(e.message); }
  finally { $("sync-btn").disabled = false; $("sync-btn").innerHTML = "↻ Sync now"; }
}

async function waitForPrediction(previousRun, timer, { attempts = 450, delayMs = 2000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const state = await api("/api/state");
    if (state.lastPrediction && state.lastPrediction !== previousRun) {
      view = state;
      $("predict-status").textContent = "Last run " + fmt(view.lastPrediction);
      const elapsed = timer.finish("Completed in", { hide: true });
      renderPredictionResult({ elapsed });
      return true;
    }
  }
  timer.finish("Still running after", { done: false, hide: false });
  return false;
}

async function generate() {
  $("predict-btn").disabled = true;
  $("predict-btn").innerHTML = '<span class="spin"></span> Generating…';
  const previousRun = view?.lastPrediction || null;
  const timer = createPredictTimer();
  try {
    renderPredictionResult({ running: true });
    timer.start("Running…");
    const r = await api("/api/predict", { method: "POST" });
    if (r.started) {
      const ok = await waitForPrediction(previousRun, timer);
      if (!ok) await loadState();
    } else {
      const elapsed = timer.finish("Completed in", { hide: true });
      await loadState();
      renderPredictionResult({ elapsed });
    }
  } catch (e) {
    timer.clear();
    toast(e.message);
  } finally {
    $("predict-btn").disabled = false;
    $("predict-btn").innerHTML = "✨ Generate now";
  }
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

$("login-btn").addEventListener("click", login);
$("pw").addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
$("logout-btn").addEventListener("click", logout);
$("sync-btn").addEventListener("click", sync);
$("predict-btn").addEventListener("click", generate);
["adm-stage", "adm-group"].forEach((id) => $(id).addEventListener("change", renderMatches));

$("admin-matches").addEventListener("click", async (e) => {
  const save = e.target.closest("[data-save]");
  const clear = e.target.closest("[data-clear]");
  try {
    if (save) {
      const id = save.dataset.save;
      const home = parseInt($("sh-" + id).value, 10);
      const away = parseInt($("sa-" + id).value, 10);
      if (Number.isNaN(home) || Number.isNaN(away)) { toast("Enter both scores"); return; }
      await post({ action: "setScore", id, home, away });
      toast("Score saved ✓");
      renderMatches(); renderOverrides();
    } else if (clear) {
      await post({ action: "clearScore", id: clear.dataset.clear });
      toast("Score cleared");
      renderMatches(); renderOverrides();
    }
  } catch (err) { toast(err.message); }
});

$("elim-btn").addEventListener("click", async () => {
  const team = $("elim-select").value;
  if (!team) { toast("Select a team"); return; }
  try { await post({ action: "eliminate", team }); toast(team + " eliminated"); renderOverrides(); renderMatches(); }
  catch (e) { toast(e.message); }
});

$("override-tags").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-clear-override]");
  if (!btn) return;
  const team = btn.dataset.clearOverride;
  try { await post({ action: "restore", team }); toast(team + " restored"); renderOverrides(); renderMatches(); }
  catch (err) { toast(err.message); }
});

checkSession();
