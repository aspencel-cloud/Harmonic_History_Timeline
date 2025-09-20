// scripts/sync-data.mjs
// Sync /data → /public/data (CSV/JSON only), prune stale files, write version stamp.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "data");
const DEST_DIR = path.join(ROOT, "public", "data");
const allowExt = new Set([".csv", ".json"]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(DEST_DIR);

// Collect source files (relative paths) while copying
const srcFiles = new Set();

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function copyAndVerify(srcAbs, rel) {
  const destAbs = path.join(DEST_DIR, rel);
  ensureDir(path.dirname(destAbs));
  fs.copyFileSync(srcAbs, destAbs);
  // quick byte-compare
  const a = fs.readFileSync(srcAbs);
  const b = fs.readFileSync(destAbs);
  if (Buffer.compare(a, b) !== 0) {
    throw new Error(`Sync mismatch: ${rel}`);
  }
  console.log("→", path.join("public", "data", rel));
}

walk(SRC_DIR, (full) => {
  const ext = path.extname(full).toLowerCase();
  if (!allowExt.has(ext)) return;
  const rel = path.relative(SRC_DIR, full);
  srcFiles.add(rel);
  copyAndVerify(full, rel);
});

// Prune extraneous files in /public/data that aren't in /data
function prune(destDir, baseRel = "") {
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    const rel = path.join(baseRel, entry.name);
    const full = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      prune(full, rel);
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } else if (allowExt.has(path.extname(full).toLowerCase())) {
      if (!srcFiles.has(rel)) {
        fs.unlinkSync(full);
        console.log("✗ removed", path.join("public", "data", rel));
      }
    }
  }
}
prune(DEST_DIR);

// Version stamp for cache-busting
const stamp = { updatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(DEST_DIR, "version.json"), JSON.stringify(stamp, null, 2));
console.log("Wrote data/version.json");

console.log(
  "Data sync complete:",
  path.relative(ROOT, SRC_DIR),
  "→",
  path.relative(ROOT, DEST_DIR)
);
