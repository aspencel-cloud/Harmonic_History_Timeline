Harmonic History Timeline — Frontend

Interactive React + Vite app that reads the Harmonic History dataset and renders a filterable, decade-grouped timeline with cycle + wave overlays.

Quick start
1) Project structure
/data                ← canonical dataset (validated)
/public/data         ← files the browser fetches (copies of /data)
/scripts/sync-data.mjs  ← copies /data → /public/data
/src
  App.tsx
  HistoryTimelineApp.tsx

2) Install & run (local or Codespaces)
npm install
npm run dev


The app expects reference.json, events.csv, aspects.csv, waves.csv to be available under /public/data at runtime.

3) Sync data to the frontend

Copy canonical data → public:

npm run sync


This copies *.csv/*.json from /data into /public/data.

Tip: the scripts include predev and prebuild, so npm run dev and npm run build automatically run the sync first.

4) Validate the dataset (optional)

Python version:

python tools/validator.py


Node version (if you added it):

npm run validate

Data files the UI reads

The component prefers JSON (faster) and falls back to CSV:

/public/data/reference.json

/public/data/events.json or /public/data/events.csv

/public/data/aspects.json or /public/data/aspects.csv

/public/data/waves.json or /public/data/waves.csv

Keep /data as the source of truth; never hand-edit /public/data. Use npm run sync.

Filters & features (current)

Search over title/summary/tags

Year range (e.g., 1900–2025)

Cycle filter (e.g., Saturn–Neptune, Saturn–Uranus, Saturn–Pluto)

Wave filter (1–10)

Grouped by decade with badges for cycles & wave anchors

Scripts

These live in package.json:

{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",

    "sync": "node scripts/sync-data.mjs",

    "predev": "npm run sync",
    "prebuild": "npm run sync",

    "validate": "node tools/validator.mjs"
  }
}

Deploy (later)

Any static host works (Vite builds to /dist).

Ensure /data is synced to /public/data before npm run build.
Roadmap (next)

Timeline axis w/ zoom (visx/D3)

Wave anchor rails overlay

Cycle “hotspots” jump links (e.g., Saturn–Pluto 2020)

URL params for sharable filters

CSV→JSON prebuild transformer for faster loads