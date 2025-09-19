// tools/validator.mjs
// Validates events/aspects/waves against reference.json.
// Reads from /public/data so it checks what the app actually serves.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");

function readJSON(p) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, p), "utf-8"));
}
function readCSV(p) {
  const raw = fs.readFileSync(path.join(DATA_DIR, p), "utf-8").replace(/^\uFEFF/, "").trim();
  if (!raw) return [];
  const [header, ...rows] = raw.split(/\r?\n/);
  const cols = header.split(",").map(h => h.trim());
  return rows.filter(Boolean).map(line => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    const cells = out.map(s => s.trim());
    const obj = {};
    cols.forEach((c, idx) => (obj[c] = cells[idx] ?? ""));
    return obj;
  });
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

// Ensure data exists
["reference.json", "events.csv"].forEach(f => {
  if (!fs.existsSync(path.join(DATA_DIR, f))) die(`[validator] Missing ${f} in ${DATA_DIR}. Run: npm run sync`);
});

const ref = readJSON("reference.json");
const events = readCSV("events.csv");
const aspects = fs.existsSync(path.join(DATA_DIR, "aspects.csv")) ? readCSV("aspects.csv") : [];
const waves   = fs.existsSync(path.join(DATA_DIR, "waves.csv"))   ? readCSV("waves.csv")   : [];

const errors = [];
const warnings = [];

// Build reference sets
const cyclesSet = new Set(ref.cycles);
const catsSet = new Set(ref.categories);
const wavesMap = new Map(Object.entries(ref.waves).map(([id, w]) => [Number(id), w]));
const waveAnchorMap = new Map(
  Object.entries(ref.waves).map(([id, w]) => [Number(id), new Set(w.anchors)])
);
const stageRanges = ref.stage_ranges || { early:[0,9], mid:[10,19], late:[20,29] };

const eventIds = new Set(events.map(e => e.event_id));

// Basic event checks
for (const e of events) {
  // date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
    errors.push(`event ${e.event_id}: invalid date "${e.date}" (expect ${ref.rules?.date_format || "YYYY-MM-DD"})`);
  } else {
    const y = Number(e.date.slice(0,4));
    if (!(y >= 1200 && y <= 2100)) warnings.push(`event ${e.event_id}: year ${y} outside [1200,2100]?`);
  }
  // category
  if (e.category && !catsSet.has(e.category)) {
    warnings.push(`event ${e.event_id}: category "${e.category}" not in reference.categories`);
  }
}

// Aspects checks
for (const a of aspects) {
  if (!eventIds.has(a.event_id)) errors.push(`aspect ${a.aspect_id}: unknown event_id "${a.event_id}"`);
  if (ref.rules?.require_cycle_key_for_aspects && !a.cycle_key) {
    errors.push(`aspect ${a.aspect_id}: missing cycle_key`);
  }
  if (a.cycle_key && !cyclesSet.has(a.cycle_key)) {
    errors.push(`aspect ${a.aspect_id}: cycle_key "${a.cycle_key}" not in reference.cycles`);
  }
  if (a.orb_deg) {
    const orb = Number(a.orb_deg);
    if (Number.isFinite(orb) && ref.rules?.orb_deg_exact_window != null) {
      if (orb > Number(ref.rules.orb_deg_exact_window)) {
        warnings.push(`aspect ${a.aspect_id}: orb_deg ${orb} > ${ref.rules.orb_deg_exact_window} (justify in notes)`);
      }
    }
  }
}

// Waves checks
for (const w of waves) {
  const wid = Number(w.wave_id);
  if (!eventIds.has(w.event_id)) errors.push(`wave ${w.wave_tag_id}: unknown event_id "${w.event_id}"`);
  if (!wavesMap.has(wid)) errors.push(`wave ${w.wave_tag_id}: invalid wave_id "${w.wave_id}"`);
  const refWave = wavesMap.get(wid);
  if (refWave && w.wave_name && w.wave_name !== refWave.name) {
    warnings.push(`wave ${w.wave_tag_id}: wave_name "${w.wave_name}" != reference "${refWave.name}"`);
  }
  if (ref.rules?.waves_must_match_anchor_set) {
    const ok = waveAnchorMap.get(wid)?.has(Number(w.anchor_deg));
    if (!ok) errors.push(`wave ${w.wave_tag_id}: anchor_deg ${w.anchor_deg} not in allowed anchors for Wave ${wid}`);
  }
  // stage sanity (optional)
  const d = Number(w.anchor_deg);
  if (Number.isFinite(d)) {
    const inAny =
      (d >= stageRanges.early[0] && d <= stageRanges.early[1]) ||
      (d >= stageRanges.mid[0] && d <= stageRanges.mid[1]) ||
      (d >= stageRanges.late[0] && d <= stageRanges.late[1]);
    if (!inAny) warnings.push(`wave ${w.wave_tag_id}: anchor_deg ${d} outside 0–29`);
  }
}

// Report
const pad = (n, s=" ") => String(n).padStart(3, s);
console.log(`\n[validator] Events: ${events.length}, Aspects: ${aspects.length}, Waves: ${waves.length}`);
if (errors.length) {
  console.log(`\n❌ Errors (${errors.length}):`);
  for (const e of errors) console.log(" -", e);
}
if (warnings.length) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(" -", w);
}
if (errors.length) {
  console.log("\nResult: FAIL");
  process.exit(1);
} else {
  console.log("\nResult: PASS");
  process.exit(0);
}
