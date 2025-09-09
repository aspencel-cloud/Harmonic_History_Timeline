import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ChevronDown, Calendar, Activity } from "lucide-react";

/**
 * HistoryTimelineApp
 * - Loads reference + events/aspects/waves from /data (served via /public/data)
 * - Prefers JSON if present; falls back to CSV
 * - Filters: search, year range, cycles, waves
 * - Groups by decade with clean cards
 *
 * Place files in `/public/data` (or sync from `/data` → `/public/data`):
 *  - reference.json
 *  - events.csv (or events.json)
 *  - aspects.csv (or aspects.json)
 *  - waves.csv   (or waves.json)
 */

// ───────────────────────────────────────────────────────────────────────────────
// Minimal CSV parser (handles quotes/commas/BOM)
function parseCSV(text: string): Record<string, string>[] {
  text = text.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const [header, ...rows] = text.split(/\r?\n/);
  const cols = header.split(",").map((h) => h.trim());
  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
      else { cur += ch; }
    }
    out.push(cur);
    const cells = out.map((s) => s.trim());
    const obj: Record<string, string> = {};
    cols.forEach((c, idx) => (obj[c] = cells[idx] ?? ""));
    return obj;
  };
  return rows.filter((r) => r.length).map(parseLine);
}

// ───────────────────────────────────────────────────────────────────────────────
// Types
export type EventRow = {
  event_id: string;
  date: string; // YYYY-MM-DD
  title: string;
  summary: string;
  category: string;
  region?: string;
  source_url?: string;
  tags?: string;
  notes?: string;
};

export type AspectRow = {
  aspect_id: string;
  event_id: string;
  date: string;
  planet_a: string; planet_b: string; aspect: string;
  sign_a: string; deg_a: string; sign_b: string; deg_b: string;
  orb_deg: string; cycle_key?: string; notes?: string;
};

export type WaveTagRow = {
  wave_tag_id: string;
  event_id: string;
  wave_id: string;          // "1".."10"
  wave_name: string;        // display
  anchor_deg: string;
  anchor_sign: string;
  anchor_object?: string;
  notes?: string;
};

export type Reference = {
  signs: string[];
  planets: string[];
  aspects: string[];
  cycles: string[];
  categories: string[];
  waves: Record<string, { name: string; anchors: number[] }>
  rules?: { orb_deg_exact_window?: number };
};

// Data file paths (JSON preferred; CSV fallback)
const PATHS = {
  eventsJSON: "/data/events.json",
  eventsCSV: "/data/events.csv",
  aspectsJSON: "/data/aspects.json",
  aspectsCSV: "/data/aspects.csv",
  wavesJSON: "/data/waves.json",
  wavesCSV: "/data/waves.csv",
  reference: "/data/reference.json"
};

async function tryFetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchCSV<T = any>(url: string): Promise<T[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [] as T[];
  const text = await res.text();
  return parseCSV(text) as unknown as T[];
}

async function loadData() {
  const [reference, eventsJ, aspectsJ, wavesJ] = await Promise.all([
    tryFetchJSON<Reference>(PATHS.reference),
    tryFetchJSON<EventRow[]>(PATHS.eventsJSON),
    tryFetchJSON<AspectRow[]>(PATHS.aspectsJSON),
    tryFetchJSON<WaveTagRow[]>(PATHS.wavesJSON)
  ]);

  const events  = eventsJ  ?? await fetchCSV<EventRow>(PATHS.eventsCSV);
  const aspects = aspectsJ ?? await fetchCSV<AspectRow>(PATHS.aspectsCSV);
  const waves   = wavesJ   ?? await fetchCSV<WaveTagRow>(PATHS.wavesCSV);
  return { reference, events, aspects, waves } as const;
}

function yearOf(date: string): number {
  const y = Number(date?.slice(0, 4));
  return Number.isFinite(y) ? y : NaN;
}
const decadeOf = (y: number) => Math.floor(y / 10) * 10;

// ───────────────────────────────────────────────────────────────────────────────
// UI helpers
const Badge: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ children, title }) => (
  <span title={title} className="inline-flex items-center rounded-2xl border px-2 py-0.5 text-xs shadow-sm">
    {children}
  </span>
);

const ToggleChip: React.FC<{ active: boolean; onClick: () => void; label: string }>
= ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-2xl border text-sm ${active ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
  >
    {label}
  </button>
);

// ───────────────────────────────────────────────────────────────────────────────
// Main component
export default function HistoryTimelineApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [{ reference, events, aspects, waves }, setData] =
    useState<{ reference: Reference | null; events: EventRow[]; aspects: AspectRow[]; waves: WaveTagRow[] }>({
      reference: null, events: [], aspects: [], waves: []
    });

  // Filters
  const [q, setQ] = useState("");
  const [start, setStart] = useState<number | "">(1900);
  const [end, setEnd] = useState<number | "">(2025);
  const [selectedCycles, setSelectedCycles] = useState<string[]>([]);
  const [selectedWaves, setSelectedWaves] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { reference, events, aspects, waves } = await loadData();
        if (!reference) throw new Error("reference.json not found in /public/data (or /data not synced)");
        setData({ reference, events, aspects, waves });
      } catch (e: any) {
        setError(e?.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cycles = reference?.cycles ?? [];

  const eventsEnriched = useMemo(() => {
    const byEventAspects = new Map<string, AspectRow[]>();
    aspects.forEach(a => {
      if (!byEventAspects.has(a.event_id)) byEventAspects.set(a.event_id, []);
      byEventAspects.get(a.event_id)!.push(a);
    });

    const byEventWaves = new Map<string, WaveTagRow[]>();
    waves.forEach(w => {
      if (!byEventWaves.has(w.event_id)) byEventWaves.set(w.event_id, []);
      byEventWaves.get(w.event_id)!.push(w);
    });

    return events.map(e => ({
      ...e,
      _year: yearOf(e.date),
      _aspects: byEventAspects.get(e.event_id) ?? [],
      _waves: byEventWaves.get(e.event_id) ?? [],
    }));
  }, [events, aspects, waves]);

  const filtered = useMemo(() => {
    return eventsEnriched.filter(e => {
      const y = e._year;
      if (!Number.isFinite(y)) return false;
      if (start !== "" && y < (start as number)) return false;
      if (end !== "" && y > (end as number)) return false;

      // Search over title/summary/tags
      const hay = `${e.title} ${e.summary ?? ""} ${e.tags ?? ""}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;

      // Cycle filter: at least one aspect must match
      if (selectedCycles.length) {
        const ok = e._aspects.some(a => a.cycle_key && selectedCycles.includes(a.cycle_key));
        if (!ok) return false;
      }

      // Wave filter: at least one wave tag must match
      if (selectedWaves.length) {
        const ok = e._waves.some(w => selectedWaves.includes(Number(w.wave_id)));
        if (!ok) return false;
      }

      return true;
    });
  }, [eventsEnriched, q, start, end, selectedCycles, selectedWaves]);

  const byDecade = useMemo(() => {
    const g = new Map<number, typeof filtered>();
    filtered.forEach(ev => {
      const d = decadeOf(ev._year);
      if (!g.has(d)) g.set(d, [] as any);
      g.get(d)!.push(ev);
    });
    return Array.from(g.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error)   return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Activity className="w-5 h-5"/>
          <h1 className="text-lg font-semibold">Harmonic History Timeline</h1>
          <span className="text-sm text-gray-500">View eras & events mapped to cycles + waves</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mx-auto max-w-6xl px-4 py-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 flex items-center gap-2 border rounded-2xl px-3 py-2 bg-white shadow-sm">
          <Search className="w-4 h-4 text-gray-500"/>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search titles, summaries, tags…"
            className="w-full outline-none"
          />
        </div>

        <div className="flex items-center gap-2 border rounded-2xl px-3 py-2 bg-white shadow-sm">
          <Calendar className="w-4 h-4 text-gray-500"/>
          <input type="number" value={start} onChange={e=>setStart(e.target.value ? Number(e.target.value) : "")} className="w-20 outline-none"/>
          <span>—</span>
          <input type="number" value={end} onChange={e=>setEnd(e.target.value ? Number(e.target.value) : "")} className="w-20 outline-none"/>
        </div>

        <details className="border rounded-2xl px-3 py-2 bg-white shadow-sm">
          <summary className="flex items-center gap-2 cursor-pointer select-none">
            <Filter className="w-4 h-4 text-gray-500"/>Filters <ChevronDown className="w-4 h-4 ml-auto"/>
          </summary>
          <div className="pt-3 space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-2">Cycles</div>
              <div className="flex flex-wrap gap-2">
                {(cycles).map(c => (
                  <ToggleChip
                    key={c}
                    label={c}
                    active={selectedCycles.includes(c)}
                    onClick={() =>
                      setSelectedCycles(s => s.includes(c) ? s.filter(x=>x!==c) : [...s, c])
                    }
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-2">Waves</div>
              <div className="flex flex-wrap gap-2">
                {Array.from({length:10}, (_,i)=>i+1).map(w => (
                  <ToggleChip
                    key={w}
                    label={`Wave ${w}`}
                    active={selectedWaves.includes(w)}
                    onClick={() =>
                      setSelectedWaves(s => s.includes(w) ? s.filter(x=>x!==w) : [...s, w])
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Timeline */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {byDecade.length === 0 && (
          <div className="text-sm text-gray-500">No events match the current filters.</div>
        )}
        {byDecade.map(([decade, list]) => (
          <section key={decade} className="mb-8">
            <div className="sticky top-12 bg-white/70 backdrop-blur border-l-4 border-black px-3 py-1 inline-block rounded-r">
              <h2 className="text-sm font-semibold">{decade}s</h2>
            </div>
            <div className="mt-4 space-y-4">
              {list.sort((a,b)=>a._year - b._year).map((e, idx) => (
                <motion.div
                  key={e.event_id}
                  initial={{opacity:0, y:6}}
                  animate={{opacity:1, y:0}}
                  transition={{duration:0.2, delay: idx * 0.02}}
                  className="bg-white rounded-2xl shadow-sm border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-500">{e.date}</div>
                    <div className="flex gap-2">
                      {e.category && <Badge title="Category">{e.category}</Badge>}
                      {e.region && <Badge title="Region">{e.region}</Badge>}
                    </div>
                  </div>
                  <h3 className="mt-1 text-base font-semibold">{e.title}</h3>
                  {e.summary && <p className="mt-1 text-sm text-gray-700 leading-relaxed">{e.summary}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {e._aspects.map(a => (
                      <Badge
                        key={a.aspect_id}
                        title={`${a.cycle_key ?? ""} ${a.aspect} ${a.sign_a} ${a.deg_a} – ${a.sign_b} ${a.deg_b}`}
                      >
                        {a.cycle_key ?? a.aspect}
                      </Badge>
                    ))}
                    {e._waves.map(w => (
                      <Badge
                        key={w.wave_tag_id}
                        title={`${w.wave_name} • ${w.anchor_deg}° ${w.anchor_sign}${w.anchor_object ? " — " + w.anchor_object : ""}`}
                      >
                        {w.wave_name} @ {w.anchor_deg}°
                      </Badge>
                    ))}
                  </div>
                  {e.source_url && (
                    <a href={e.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline">
                      Source ↗
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* Wiring:
 * 1) Put data under /public/data (or sync from /data via a script).
 * 2) Import this component in src/App.tsx and render it.
 * 3) Optional: pre-generate JSON from CSV for faster loads; the loader prefers JSON.
 */
