// tools/validator.mjs
import fs from "node:fs";
import path from "node:path";

const BASE = path.resolve(".");
const data = (p) => path.join(BASE, "data", p);
const outReportPath = path.join(BASE, "tools", "validation_report.csv");

// --- CSV loader (handles quotes, commas, BOM) ---
const loadCsv = (fname) => {
  const fp = data(fname);
  const text = fs.readFileSync(fp, "utf-8").replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const [header, ...rows] = text.split(/\r?\n/);
  const cols = header.split(",").map((h) => h.trim());

  const parseLine = (line) => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (ch === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    // Trim cells and pad
    const cells = out.map((s) => s.trim());
    while (cells.length < cols.length) cells.push("");
    return Object.fromEntries(cols.map((c, j) => [c, cells[j] ?? ""]));
  };

  return rows.filter((r) => r.length).map(parseLine);
};

const safeLoad = (fname) => (fs.existsSync(data(fname)) ? loadCsv(fname) : []);

// --- Reference / enums ---
if (!fs.existsSync(data("reference.json"))) {
  console.error("ERROR: data/reference.json not found.");
  process.exit(1);
}
const ref = JSON.parse(fs.readFileSync(data("reference.json"), "utf-8"));

const SIGNS = new Set(ref.signs || []);
const PLANETS = new Set(ref.planets || []);
const ASPECTS = new Set(ref.aspects || []);
const CYCLES = new Set(ref.cycles || []);
const CATEGORIES = new Set(ref.categories || []);
const WAVES = Object.fromEntries(
  Object.entries(ref.waves || {}).map(([k, v]) => [Number(k), v.anchors || []])
);
const ORB_LIMIT = Number(ref.rules?.orb_deg_exact_window ?? 1.0);

// --- Load CSVs ---
const events = safeLoad("events.csv");
const aspects = safeLoad("aspects.csv");
const waves = safeLoad("waves.csv");
const eclipses = safeLoad("eclipses.csv");

// --- Helpers ---
const problems = [];
const warnings = [];
const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// --- Events ---
const eventIds = new Set();
for (let i = 0; i < events.length; i++) {
  const r = events[i], line = i + 2;
  if (!r.event_id) problems.push(`events.csv:${line} missing event_id`);
  if (r.event_id && eventIds.has(r.event_id))
    problems.push(`events.csv:${line} duplicate event_id ${r.event_id}`);
  if (r.event_id) eventIds.add(r.event_id);

  if (!isIso(r.date))
    problems.push(`events.csv:${line} bad date '${r.date}' (YYYY-MM-DD)`);

  if (r.category && !CATEGORIES.has(r.category))
    problems.push(`events.csv:${line} category '${r.category}' not in reference.json`);
}

// --- Aspects ---
const aspectIds = new Set();
for (let i = 0; i < aspects.length; i++) {
  const r = aspects[i], line = i + 2;

  if (!r.aspect_id) problems.push(`aspects.csv:${line} missing aspect_id`);
  if (r.aspect_id && aspectIds.has(r.aspect_id))
    problems.push(`aspects.csv:${line} duplicate aspect_id ${r.aspect_id}`);
  if (r.aspect_id) aspectIds.add(r.aspect_id);

  if (!eventIds.has(r.event_id))
    problems.push(`aspects.csv:${line} event_id '${r.event_id}' not in events.csv`);

  if (!isIso(r.date))
    problems.push(`aspects.csv:${line} bad date '${r.date}'`);

  if (!PLANETS.has(r.planet_a) || !PLANETS.has(r.planet_b))
    problems.push(`aspects.csv:${line} planet not recognized`);

  if (!ASPECTS.has(r.aspect))
    problems.push(`aspects.csv:${line} aspect '${r.aspect}' not in reference.json`);

  if (!SIGNS.has(r.sign_a) || !SIGNS.has(r.sign_b))
    problems.push(`aspects.csv:${line} sign not recognized`);

  const da = Number(r.deg_a), db = Number(r.deg_b);
  if (
    !Number.isFinite(da) || !Number.isFinite(db) ||
    da < 0 || da >= 30 || db < 0 || db >= 30
  ) problems.push(`aspects.csv:${line} deg_a/deg_b must be in [0,30)`);

  const orb = Number(r.orb_deg);
  if (!Number.isFinite(orb))
    problems.push(`aspects.csv:${line} orb_deg '${r.orb_deg}' not a number`);
  else if (orb > ORB_LIMIT)
    warnings.push(`aspects.csv:${line} orb ${orb} > limit ${ORB_LIMIT}`);

  if (r.cycle_key && !CYCLES.has(r.cycle_key))
    problems.push(`aspects.csv:${line} cycle_key '${r.cycle_key}' not in reference.json`);
}

// --- Waves ---
const waveTagIds = new Set();
for (let i = 0; i < waves.length; i++) {
  const r = waves[i], line = i + 2;

  if (!r.wave_tag_id) problems.push(`waves.csv:${line} missing wave_tag_id`);
  if (r.wave_tag_id && waveTagIds.has(r.wave_tag_id))
    problems.push(`waves.csv:${line} duplicate wave_tag_id ${r.wave_tag_id}`);
  if (r.wave_tag_id) waveTagIds.add(r.wave_tag_id);

  if (!eventIds.has(r.event_id))
    problems.push(`waves.csv:${line} event_id '${r.event_id}' not in events.csv`);

  const wid = Number(r.wave_id);
  const anchor = Number(r.anchor_deg);

  if (!Number.isInteger(wid))
    problems.push(`waves.csv:${line} wave_id '${r.wave_id}' not integer`);

  if (!Number.isInteger(anchor))
    problems.push(`waves.csv:${line} anchor_deg '${r.anchor_deg}' must be integer`);

  if (Number.isInteger(wid) && Number.isInteger(anchor)) {
    const valid = new Set(WAVES[wid] ?? []);
    if (!valid.has(anchor))
      problems.push(`waves.csv:${line} anchor_deg ${anchor} invalid for wave_id ${wid}`);
  }

  if (r.anchor_sign && !SIGNS.has(r.anchor_sign) && !String(r.anchor_sign).includes("/"))
    problems.push(`waves.csv:${line} anchor_sign '${r.anchor_sign}' not recognized`);
}

// --- Eclipses ---
const eclipseIds = new Set();
for (let i = 0; i < eclipses.length; i++) {
  const r = eclipses[i], line = i + 2;
  if (!r.eclipse_id) problems.push(`eclipses.csv:${line} missing eclipse_id`);
  if (r.eclipse_id && eclipseIds.has(r.eclipse_id))
    problems.push(`eclipses.csv:${line} duplicate eclipse_id ${r.eclipse_id}`);
  if (r.eclipse_id) eclipseIds.add(r.eclipse_id);

  if (r.date && !isIso(r.date))
    problems.push(`eclipses.csv:${line} bad date '${r.date}'`);

  if (r.event_id && !eventIds.has(r.event_id))
    problems.push(`eclipses.csv:${line} event_id '${r.event_id}' not in events.csv`);
}

// --- Write report ---
const lines = [
  ["level", "message"],
  ...problems.map((m) => ["ERROR", m]),
  ...warnings.map((m) => ["WARN", m]),
].map((r) => r.join(","));
fs.writeFileSync(outReportPath, lines.join("\n"), "utf-8");

console.log(`Validation complete. Errors: ${problems.length}, Warnings: ${warnings.length}`);
console.log(`Report: ${path.relative(BASE, outReportPath)}`);
