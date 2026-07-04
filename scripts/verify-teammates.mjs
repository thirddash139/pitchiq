/**
 * Pitch IQ — teammates.json verification pipeline
 * Stage 1: fetch + cache career histories (self-hosted transfermarkt-api)
 * Stage 2: compute club+year overlaps, diff against teammates.json
 * Stage 3 (stub): Claude escalation for flagged connections
 *
 * Usage:  node scripts/verify-teammates.mjs
 * Env:    TM_API=http://localhost:8000   (transfermarkt-api base URL)
 *
 * Outputs:
 *   career-cache.json          — cached player IDs + career stints (commit this)
 *   verification-report.md     — human-readable report
 *   teammates.corrected.json   — teammates.json with YEAR fixes applied (never touches NO_OVERLAP entries)
 *   exit code 1 if any NO_OVERLAP / UNRESOLVED found (so CI can flag it)
 */

import fs from "fs";

const TM_API = process.env.TM_API || "http://localhost:8000";
const DATASET_PATH = "./app/data/teammates.json";
const CACHE_PATH = "./scripts/career-cache.json";
const REPORT_PATH = "./verification-report.md";
const CORRECTED_PATH = "./teammates.corrected.json";

// Names where Transfermarkt search is ambiguous — pin the exact TM player ID here.
// Find IDs at transfermarkt.com (the number in the profile URL).
const ID_OVERRIDES = {
  // "Ronaldo Nazário": 3140,
  // "Danilo": 145707,
};

// Club name aliases: dataset name → substrings that match Transfermarkt's naming
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
  const d = norm(datasetClub);
  const t = norm(tmClub);
  if (t.includes(d) || d.includes(t)) return true;
  const aliases = CLUB_ALIASES[d] || [];
  return aliases.some((a) => t.includes(norm(a)));
}

// "2001-2003" | "2013" | "2018-present" → {start, end}  (end=9999 for present)
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

// ---------- stage 1: fetch + cache ----------

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return { players: {} }; // name → { id, tmName, stints: [{club, start, end}], fetchedAt }
  }
}

async function resolveId(name) {
  if (ID_OVERRIDES[name]) return ID_OVERRIDES[name];
  const data = await get(`/players/search/${encodeURIComponent(name)}`);
  const results = data.results || [];
  if (!results.length) return null;
  // exact (normalized) name match first, else top result
  const exact = results.find((r) => norm(r.name) === norm(name));
  return (exact || results[0]).id;
}

// Build stints from transfer history: each transfer's clubTo starts a stint,
// closed by the date of the next transfer.
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

async function ensurePlayer(cache, name, { refresh = false } = {}) {
  const cached = cache.players[name];
  const stale =
    cached &&
    cached.stints.some((s) => s.end === 9999) && // active player
    Date.now() - new Date(cached.fetchedAt).getTime() > 7 * 864e5;
  if (cached && !refresh && !stale) return cached;

  const id = await resolveId(name);
  if (!id) {
    cache.players[name] = { id: null, stints: [], fetchedAt: new Date().toISOString() };
    return cache.players[name];
  }
  await sleep(600); // be polite
  const stints = await fetchStints(id);
  cache.players[name] = { id, stints, fetchedAt: new Date().toISOString() };
  await sleep(600);
  return cache.players[name];
}

// ---------- stage 2: overlap computation + diff ----------

// Given two players' stints, find overlap window(s) at a named club.
function computeOverlap(answerStints, mateStints, club) {
  const a = answerStints.filter((s) => clubMatches(club, s.club));
  const b = mateStints.filter((s) => clubMatches(club, s.club));
  const windows = [];
  for (const s1 of a)
    for (const s2 of b) {
      const start = Math.max(s1.start, s2.start);
      const end = Math.min(s1.end, s2.end);
      if (start <= end) windows.push({ start, end });
    }
  if (!windows.length) return null;
  // merge into the widest single window (good enough for our year strings)
  return {
    start: Math.min(...windows.map((w) => w.start)),
    end: Math.max(...windows.map((w) => w.end)),
  };
}

function checkConnection(answer, mate, club, yearsStr, cache) {
  const A = cache.players[answer];
  const B = cache.players[mate];
  if (!A?.id) return { status: "UNRESOLVED", msg: `Could not resolve "${answer}" on Transfermarkt` };
  if (!B?.id) return { status: "UNRESOLVED", msg: `Could not resolve "${mate}" on Transfermarkt` };

  const overlap = computeOverlap(A.stints, B.stints, club);
  if (!overlap)
    return { status: "NO_OVERLAP", msg: `${mate} + ${answer} — no shared window found at ${club}` };

  const listed = parseYears(yearsStr);
  if (!listed) return { status: "YEARS_MISMATCH", overlap, msg: `Unparseable years "${yearsStr}"` };

  // ±1 year tolerance: transfer dates vs season labels legitimately differ by one
  const startOk = Math.abs(listed.start - overlap.start) <= 1;
  const endOk = overlap.end === 9999
    ? listed.end === 9999 || listed.end >= overlap.start
    : Math.abs(listed.end - Math.min(overlap.end, listed.end === 9999 ? overlap.end : overlap.end)) <= 1 && listed.end !== 9999
      ? Math.abs(listed.end - overlap.end) <= 1
      : listed.end === 9999 && overlap.end === 9999;

  const startExact = Math.abs(listed.start - overlap.start) <= 1;
  const endExact =
    (listed.end === 9999 && overlap.end === 9999) ||
    (listed.end !== 9999 && overlap.end !== 9999 && Math.abs(listed.end - overlap.end) <= 1);

  if (startExact && endExact) return { status: "OK", overlap };
  return {
    status: "YEARS_MISMATCH",
    overlap,
    msg: `${mate} at ${club}: listed "${yearsStr}", computed "${fmtYears(overlap)}"`,
  };
}

// ---------- main ----------

(async () => {
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf-8"));
  const cache = loadCache();

  // Collect every unique player name
  const names = new Set();
  for (const p of dataset) {
    names.add(p.name);
    for (const t of p.teammates) names.add(t.name);
  }
  console.log(`Dataset: ${dataset.length} answers, ${names.size} unique players\n`);

  // Stage 1 — fetch/cache
  let fetched = 0;
  for (const name of names) {
    const before = cache.players[name];
    await ensurePlayer(cache, name).catch((e) => {
      console.error(`fetch failed for ${name}: ${e.message}`);
    });
    if (cache.players[name] !== before) fetched++;
    if (fetched && fetched % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2)); // checkpoint
      console.log(`  ...${fetched} fetched (checkpoint saved)`);
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  console.log(`Cache updated (${fetched} fetches this run)\n`);

  // Stage 2 — verify every connection
  const results = { OK: [], YEARS_MISMATCH: [], NO_OVERLAP: [], UNRESOLVED: [] };
  const corrected = JSON.parse(JSON.stringify(dataset));

  for (const player of corrected) {
    for (const tm of player.teammates) {
      // handle both schemas: club as string, or club as [{club, years}] array
      const entries = Array.isArray(tm.club)
        ? tm.club.map((c) => ({ club: c.club, years: c.years, ref: c }))
        : [{ club: tm.club, years: tm.years, ref: tm }];

      for (const e of entries) {
        const r = checkConnection(player.name, tm.name, e.club, e.years, cache);
        const line = `${player.name} ← ${tm.name} @ ${e.club} (${e.years})`;
        results[r.status].push(r.msg ? `${line} — ${r.msg}` : line);

        if (r.status === "YEARS_MISMATCH" && r.overlap) {
          e.ref.years = fmtYears(r.overlap); // auto-correct in the corrected copy only
        }
        // NO_OVERLAP / UNRESOLVED: never modified — flagged for human review
      }
    }
  }

  // Stage 3 stub — escalate flagged connections to Claude for web-search verification
  // for (const flagged of [...results.NO_OVERLAP, ...results.UNRESOLVED]) {
  //   await claudeVerify(flagged); // POST to Anthropic API with web_search tool
  // }

  fs.writeFileSync(CORRECTED_PATH, JSON.stringify(corrected, null, 2));

  const report = [
    `# Teammates Verification Report — ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `| Status | Count |`,
    `|---|---|`,
    `| ✅ OK | ${results.OK.length} |`,
    `| 🔧 Years mismatch (auto-corrected in teammates.corrected.json) | ${results.YEARS_MISMATCH.length} |`,
    `| ❌ No overlap found (DATASET ERROR — review manually) | ${results.NO_OVERLAP.length} |`,
    `| ❓ Unresolved name | ${results.UNRESOLVED.length} |`,
    ``,
    results.NO_OVERLAP.length ? `## ❌ No overlap (fix these)\n${results.NO_OVERLAP.map((l) => `- ${l}`).join("\n")}\n` : ``,
    results.YEARS_MISMATCH.length ? `## 🔧 Year corrections applied\n${results.YEARS_MISMATCH.map((l) => `- ${l}`).join("\n")}\n` : ``,
    results.UNRESOLVED.length ? `## ❓ Unresolved (add to ID_OVERRIDES)\n${results.UNRESOLVED.map((l) => `- ${l}`).join("\n")}\n` : ``,
  ].join("\n");

  fs.writeFileSync(REPORT_PATH, report);
  console.log(report);

  process.exit(results.NO_OVERLAP.length || results.UNRESOLVED.length ? 1 : 0);
})();
