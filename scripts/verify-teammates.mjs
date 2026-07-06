/**
 * Pitch IQ — teammates.json verification pipeline  (v2: + uniqueness check)
 *
 * Pass 1 (existing): connection accuracy — did X and Y overlap at club Z in the listed years?
 * Pass 2 (new): uniqueness — do the FIRST 3 clues point to exactly one footballer?
 *   Method: for each of the first 3 teammates' club+years, pull full squad rosters
 *   for every season in the window, union per clue, intersect across the 3 clues.
 *   Anyone left besides the intended answer = provable alternate answer → COLLISION.
 *
 * SAFETY: reads app/data/teammates.json but NEVER writes to it.
 * Outputs: teammates.corrected.json, verification-report.md, scripts/career-cache.json.
 * COLLISION results are report-only — no auto-correction, human decides the swap.
 *
 * Usage:  TM_API=http://localhost:8000 node scripts/verify-teammates.mjs
 */

import fs from "fs";

const TM_API = process.env.TM_API || "http://localhost:8000";
const DATASET_PATH = "./app/data/teammates.json";
const CACHE_PATH = "./scripts/career-cache.json";
const REPORT_PATH = "./verification-report.md";
const CORRECTED_PATH = "./teammates.corrected.json";
const CURRENT_YEAR = new Date().getFullYear();
const MAX_SEASONS_PER_CLUE = 12; // guard against runaway windows

// Names where Transfermarkt search is ambiguous — pin exact TM player IDs.
const ID_OVERRIDES = {
  "Vinícius Jr.": 371998,
  "Juan Mata": 44068,
  "Son Heung-min": 91845,
  "Sergei Rebrov": 3122,
};

// Club-name → Transfermarkt club ID pins for ambiguous search results.
// Find IDs at transfermarkt.com club URL: /verein/{id}
const CLUB_ID_OVERRIDES = {
  "NY Red Bulls": 626,
  // "Inter Milan": 46,
  // "Man City": 281,
};

const CLUB_ALIASES = {
  "man united": ["manchester united", "man utd"],
  "man city": ["manchester city"],
  "inter milan": ["inter", "internazionale"],
  "ac milan": ["milan"],
  "psg": ["paris saint-germain", "paris sg"],
  "bayern munich": ["bayern münchen", "bayern munich", "fc bayern"],
  "borussia dortmund": ["borussia dortmund", "bvb"],
  "atlético madrid": ["atlético de madrid", "atletico madrid"],
  "sporting cp": ["sporting lisbon", "sporting cp"],
  "ny red bulls": ["new york red bulls"],
  "nycfc": ["new york city"],
  "la galaxy": ["los angeles galaxy", "la galaxy"],
  "dc united": ["d.c. united"],
  "schalke 04": ["fc schalke 04", "schalke"],
  "roma": ["as roma", "roma"],
  "al nassr": ["al-nassr"],
  "al ittihad": ["al-ittihad"],
};

// ---------- helpers ----------

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function clubMatches(datasetClub, tmClub) {
  const d = norm(datasetClub.replace(/\s*\(loan\)\s*/i, ""));
  const t = norm(tmClub);
  if (t.includes(d) || d.includes(t)) return true;
  const aliases = CLUB_ALIASES[d] || [];
  return aliases.some((a) => t.includes(norm(a)));
}

function parseYears(str) {
  if (!str) return null;
  const s = String(str).replace(/–|—/g, "-").trim();
  const m = s.match(/(\d{4})\s*-\s*(\d{4}|present)/i);
  if (m) return { start: +m[1], end: m[2].toLowerCase() === "present" ? 9999 : +m[2] };
  const single = s.match(/^(\d{4})$/);
  if (single) return { start: +single[1], end: +single[1] };
  return null;
}

function fmtYears({ start, end }) {
  if (end === 9999) return `${start}-present`;
  return start === end ? `${start}` : `${start}-${end}`;
}

async function get(path) {
  const res = await fetch(`${TM_API}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- cache ----------

function loadCache() {
  try {
    const c = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    c.players = c.players || {};
    c.clubs = c.clubs || {};     // clubName → { id, tmName }
    c.rosters = c.rosters || {}; // `${clubId}:${season}` → [{id, name}]
    return c;
  } catch {
    return { players: {}, clubs: {}, rosters: {} };
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// ---------- player career fetch (pass 1, unchanged behaviour) ----------

async function resolveId(name) {
  if (ID_OVERRIDES[name]) return ID_OVERRIDES[name];
  const data = await get(`/players/search/${encodeURIComponent(name)}`);
  const results = data.results || [];
  if (!results.length) return null;
  const exact = results.find((r) => norm(r.name) === norm(name));
  return (exact || results[0]).id;
}

async function fetchStints(id) {
  const data = await get(`/players/${id}/transfers`);
  const transfers = (data.transfers || [])
    .filter((t) => t.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const stints = [];
  for (let i = 0; i < transfers.length; i++) {
    const t = transfers[i];
    const clubName = t.clubTo?.name || t.to?.clubName;
    if (!clubName) continue;
    if (/retired|without club|career break|unknown/i.test(clubName)) continue;
    const start = new Date(t.date).getFullYear();
    const next = transfers[i + 1];
    const end = next ? new Date(next.date).getFullYear() : 9999;
    stints.push({ club: clubName, start, end });
  }
  return stints;
}

async function ensurePlayer(cache, name) {
  const cached = cache.players[name];
  const stale =
    cached &&
    cached.id &&
    cached.stints.some((s) => s.end === 9999) &&
    Date.now() - new Date(cached.fetchedAt).getTime() > 7 * 864e5;
  if (cached && cached.id && !stale) return cached;

  const id = await resolveId(name).catch(() => null);
  if (!id) {
    cache.players[name] = cache.players[name] || {
      id: null, stints: [], fetchedAt: new Date().toISOString(),
    };
    return cache.players[name];
  }
  await sleep(600);
  const stints = await fetchStints(id).catch(() => null);
  if (!stints) return cache.players[name] || { id, stints: [], fetchedAt: new Date().toISOString() };
  cache.players[name] = { id, stints, fetchedAt: new Date().toISOString() };
  await sleep(600);
  return cache.players[name];
}

// ---------- club + roster fetch (pass 2, new) ----------

async function ensureClub(cache, clubName) {
  const key = norm(clubName.replace(/\s*\(loan\)\s*/i, ""));
  if (CLUB_ID_OVERRIDES[clubName]) {
    cache.clubs[key] = { id: CLUB_ID_OVERRIDES[clubName], tmName: clubName };
    return cache.clubs[key];
  }
  if (cache.clubs[key]?.id) return cache.clubs[key];

  const data = await get(`/clubs/search/${encodeURIComponent(key)}`).catch(() => null);
  await sleep(600);
  const results = data?.results || [];
  if (!results.length) {
    cache.clubs[key] = { id: null, tmName: null };
    return cache.clubs[key];
  }
  const exact = results.find((r) => clubMatches(clubName, r.name));
  const pick = exact || results[0];
  cache.clubs[key] = { id: pick.id, tmName: pick.name };
  return cache.clubs[key];
}

async function ensureRoster(cache, clubId, season) {
  const key = `${clubId}:${season}`;
  // ignore previously cached EMPTY rosters — they're poison from transient failures
  if (cache.rosters[key]?.length) return cache.rosters[key];
  const data = await get(`/clubs/${clubId}/players?season_id=${season}`).catch(() => null);
  await sleep(600);
  const players = (data?.players || []).map((p) => ({ id: p.id, name: p.name }));
  if (players.length) cache.rosters[key] = players; // only cache non-empty
  return players;
}

// Union of roster player-IDs for a club across a year window.
// Returns { union, diag } — diag explains exactly what was fetched, for debugging empties.
async function rosterUnion(cache, clubName, years) {
  const club = await ensureClub(cache, clubName);
  if (!club.id) return { union: null, diag: `club "${clubName}" did not resolve` };
  const start = years.start;
  const end = Math.min(years.end === 9999 ? CURRENT_YEAR : years.end, CURRENT_YEAR);
  const seasons = [];
  for (let y = start; y <= end && seasons.length < MAX_SEASONS_PER_CLUE; y++) seasons.push(y);
  const union = new Map(); // id → name
  const sizes = [];
  for (const season of seasons) {
    const roster = await ensureRoster(cache, club.id, season);
    sizes.push(`${season}:${roster.length}`);
    for (const p of roster) union.set(String(p.id), p.name);
  }
  const diag = `${clubName}→TM#${club.id} "${club.tmName}" seasons[${sizes.join(", ")}]`;
  return { union, diag };
}

// First-3 uniqueness check for one puzzle answer.
async function checkUniqueness(cache, player) {
  const firstThree = player.teammates.slice(0, 3);
  const unions = [];

  for (const tm of firstThree) {
    // multi-club schema: a clue card can carry several stints; candidate matches ANY of them
    const entries = Array.isArray(tm.club)
      ? tm.club.map((c) => ({ club: c.club, years: parseYears(c.years) }))
      : [{ club: tm.club, years: parseYears(tm.years) }];

    let clueUnion = new Map();
    const diags = [];
    for (const e of entries) {
      if (!e.years) continue;
      const { union: u, diag } = await rosterUnion(cache, e.club, e.years);
      diags.push(diag);
      if (u === null) return { status: "UNRESOLVED", msg: `Could not resolve club "${e.club}" (clue: ${tm.name})` };
      for (const [id, name] of u) clueUnion.set(id, name);
    }
    if (clueUnion.size === 0)
      return { status: "UNRESOLVED", msg: `Empty roster union for clue ${tm.name} — ${diags.join(" | ") || "no parseable years"}` };

    // the clue teammate can't be the mystery player of their own clue
    const tmSelf = cache.players[tm.name];
    if (tmSelf?.id) clueUnion.delete(String(tmSelf.id));

    unions.push(clueUnion);
  }

  if (unions.length < 3)
    return { status: "UNRESOLVED", msg: "Fewer than 3 parseable clues" };

  // intersect the three sets
  let intersection = unions[0];
  for (const u of unions.slice(1)) {
    const next = new Map();
    for (const [id, name] of intersection) if (u.has(id)) next.set(id, name);
    intersection = next;
  }

  // remove the intended answer
  const answerSelf = cache.players[player.name];
  if (answerSelf?.id) intersection.delete(String(answerSelf.id));

  if (intersection.size === 0) return { status: "OK" };
  const names = [...intersection.values()].slice(0, 10);
  return {
    status: "COLLISION",
    msg: `first-3 clues also match: ${names.join(", ")}${intersection.size > 10 ? ` (+${intersection.size - 10} more)` : ""}`,
  };
}

// ---------- pass 1: connection accuracy (unchanged) ----------

// Returns ALL distinct overlap windows (one per pair of co-occurring stints),
// then coalesces CONTIGUOUS windows (gap ≤ 1 year). Transfermarkt splits
// continuous tenures on internal records (youth→first team, contract events);
// coalescing repairs that WITHOUT bridging real absences — a genuine gap
// (e.g. Ronaldo's 2009→2021 Man Utd return) stays split.
function computeOverlapWindows(answerStints, mateStints, club) {
  const a = answerStints.filter((s) => clubMatches(club, s.club));
  const b = mateStints.filter((s) => clubMatches(club, s.club));
  let windows = [];
  for (const s1 of a)
    for (const s2 of b) {
      const start = Math.max(s1.start, s2.start);
      const end = Math.min(s1.end, s2.end);
      if (start <= end) windows.push({ start, end });
    }
  if (windows.length < 2) return windows;
  windows.sort((x, y) => x.start - y.start || x.end - y.end);
  const merged = [windows[0]];
  for (const w of windows.slice(1)) {
    const last = merged[merged.length - 1];
    const lastEnd = last.end === 9999 ? Infinity : last.end;
    if (w.start <= lastEnd + 1) {
      // contiguous or overlapping → extend
      if (w.end === 9999 || (last.end !== 9999 && w.end > last.end)) last.end = w.end;
    } else {
      merged.push({ ...w });
    }
  }
  return merged;
}

function windowMatchesListed(listed, w) {
  const startOk = Math.abs(listed.start - w.start) <= 1;
  const endOk =
    (listed.end === 9999 && w.end === 9999) ||
    // listed "present" vs a window reaching the current season = same thing;
    // Transfermarkt data simply ends at the latest season for active players
    (listed.end === 9999 && w.end !== 9999 && w.end >= CURRENT_YEAR - 1) ||
    (listed.end !== 9999 && w.end !== 9999 && Math.abs(listed.end - w.end) <= 1) ||
    // listed as a closed range but window still open (active players): accept if start fits and listed end ≥ window start
    (listed.end !== 9999 && w.end === 9999 && listed.end >= w.start);
  return startOk && endOk;
}

// Listed years can also be a SUBSET of a longer real window — e.g. a clue that
// deliberately shows only "2013" of a 2013-2016 overlap. Subset = contained inside
// one window. That's accurate, not an error, so treat as OK.
function windowContainsListed(listed, w) {
  const endCap = w.end === 9999 ? Infinity : w.end + 1;
  const listedEnd = listed.end === 9999 ? Infinity : listed.end;
  return listed.start >= w.start - 1 && listedEnd <= endCap;
}

function checkConnection(answer, mate, club, yearsStr, cache) {
  const A = cache.players[answer];
  const B = cache.players[mate];
  if (!A?.id) return { status: "UNRESOLVED", msg: `Could not resolve "${answer}" on Transfermarkt` };
  if (!B?.id) return { status: "UNRESOLVED", msg: `Could not resolve "${mate}" on Transfermarkt` };

  const windows = computeOverlapWindows(A.stints, B.stints, club);
  if (!windows.length)
    return { status: "NO_OVERLAP", msg: `${mate} + ${answer} — no shared window found at ${club}` };

  const listed = parseYears(yearsStr);
  if (!listed) {
    return {
      status: "YEARS_MISMATCH",
      overlap: windows[0],
      msg: `Unparseable years "${yearsStr}" (windows: ${windows.map(fmtYears).join(", ")})`,
    };
  }

  // OK if listed years match ANY single window, or sit inside one
  for (const w of windows) {
    if (windowMatchesListed(listed, w) || windowContainsListed(listed, w)) {
      return { status: "OK", overlap: w };
    }
  }

  // Mismatch: suggest the window closest to the listed start year — never a merged span
  const best = windows.reduce((p, c) =>
    Math.abs(c.start - listed.start) < Math.abs(p.start - listed.start) ? c : p
  );
  return {
    status: "YEARS_MISMATCH",
    overlap: best,
    msg: `${mate} at ${club}: listed "${yearsStr}", nearest real window "${fmtYears(best)}"${
      windows.length > 1 ? ` (all windows: ${windows.map(fmtYears).join(", ")})` : ""
    }`,
  };
}

// ---------- main ----------

(async () => {
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf-8"));
  const cache = loadCache();

  const names = new Set();
  for (const p of dataset) {
    names.add(p.name);
    for (const t of p.teammates) names.add(t.name);
  }
  console.log(`Dataset: ${dataset.length} answers, ${names.size} unique players\n`);

  // ---- Pass 1 fetch ----
  let fetched = 0;
  for (const name of names) {
    const before = JSON.stringify(cache.players[name] || null);
    await ensurePlayer(cache, name).catch((e) => console.error(`fetch failed for ${name}: ${e.message}`));
    if (JSON.stringify(cache.players[name] || null) !== before) fetched++;
    if (fetched && fetched % 25 === 0) {
      saveCache(cache);
      console.log(`  ...${fetched} player fetches (checkpoint)`);
    }
  }
  saveCache(cache);
  console.log(`Player cache updated (${fetched} fetches)\n`);

  // ---- Pass 1 verify ----
  const results = { OK: [], YEARS_MISMATCH: [], NO_OVERLAP: [], UNRESOLVED: [], COLLISION: [] };
  const corrected = JSON.parse(JSON.stringify(dataset));

  for (const player of corrected) {
    for (const tm of player.teammates) {
      const entries = Array.isArray(tm.club)
        ? tm.club.map((c) => ({ club: c.club, years: c.years, ref: c }))
        : [{ club: tm.club, years: tm.years, ref: tm }];
      for (const e of entries) {
        const r = checkConnection(player.name, tm.name, e.club, e.years, cache);
        const line = `${player.name} ← ${tm.name} @ ${e.club} (${e.years})`;
        results[r.status].push(r.msg ? `${line} — ${r.msg}` : line);
        if (r.status === "YEARS_MISMATCH" && r.overlap) e.ref.years = fmtYears(r.overlap);
      }
    }
  }

  // ---- Pass 2: uniqueness (first 3 clues), report-only ----
  console.log(`\nPass 2 — uniqueness check on first-3 clues...\n`);
  let done = 0;
  for (const player of dataset) {
    const r = await checkUniqueness(cache, player).catch((e) => ({
      status: "UNRESOLVED",
      msg: `uniqueness check error: ${e.message}`,
    }));
    done++;
    if (r.status === "COLLISION") {
      results.COLLISION.push(`${player.name} — ${r.msg}`);
      console.log(`  ✗ COLLISION: ${player.name} — ${r.msg}`);
    } else if (r.status === "UNRESOLVED") {
      results.UNRESOLVED.push(`${player.name} (uniqueness) — ${r.msg}`);
    }
    if (done % 10 === 0) {
      saveCache(cache);
      console.log(`  ...${done}/${dataset.length} answers checked (checkpoint)`);
    }
  }
  saveCache(cache);

  fs.writeFileSync(CORRECTED_PATH, JSON.stringify(corrected, null, 2));

  const report = [
    `# Teammates Verification Report — ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `| Status | Count |`,
    `|---|---|`,
    `| ✅ OK (connections) | ${results.OK.length} |`,
    `| 🔧 Years mismatch (auto-corrected in teammates.corrected.json) | ${results.YEARS_MISMATCH.length} |`,
    `| ❌ No overlap found (DATASET ERROR — review manually) | ${results.NO_OVERLAP.length} |`,
    `| 💥 Uniqueness collision (first-3 clues match >1 player) | ${results.COLLISION.length} |`,
    `| ❓ Unresolved | ${results.UNRESOLVED.length} |`,
    ``,
    results.COLLISION.length
      ? `## 💥 Uniqueness collisions (swap a teammate — NEVER auto-fixed)\n${results.COLLISION.map((l) => `- ${l}`).join("\n")}\n`
      : ``,
    results.NO_OVERLAP.length
      ? `## ❌ No overlap (fix these)\n${results.NO_OVERLAP.map((l) => `- ${l}`).join("\n")}\n`
      : ``,
    results.YEARS_MISMATCH.length
      ? `## 🔧 Year corrections applied\n${results.YEARS_MISMATCH.map((l) => `- ${l}`).join("\n")}\n`
      : ``,
    results.UNRESOLVED.length
      ? `## ❓ Unresolved\n${results.UNRESOLVED.map((l) => `- ${l}`).join("\n")}\n`
      : ``,
  ].join("\n");

  fs.writeFileSync(REPORT_PATH, report);
  console.log(report);

  const flags = results.NO_OVERLAP.length + results.UNRESOLVED.length + results.COLLISION.length;
  process.exit(flags ? 1 : 0);
})();
