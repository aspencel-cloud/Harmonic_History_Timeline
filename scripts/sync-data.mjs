// scripts/sync-data.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "data");             // canonical source
const DEST_DIR = path.join(ROOT, "public", "data");  // served to browser

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log("→", path.relative(ROOT, dest));
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

ensureDir(DEST_DIR);

// Copy only the files the app reads (csv/json)
const allowed = new Set([".csv", ".json"]);
walk(SRC_DIR, (full) => {
  const ext = path.extname(full).toLowerCase();
  if (!allowed.has(ext)) return;
  const rel = path.relative(SRC_DIR, full);
  const dest = path.join(DEST_DIR, rel);
  copyFile(full, dest);
});

// Write a cache-busting version stamp used by the app's fetches
const stamp = { updatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(DEST_DIR, "version.json"), JSON.stringify(stamp, null, 2));
console.log("Wrote data/version.json");

console.log("Data sync complete:", path.relative(ROOT, SRC_DIR), "→", path.relative(ROOT, DEST_DIR));
