import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, ChevronDown, Calendar, Activity, LayoutGrid, Sun, Moon, SlidersHorizontal
} from "lucide-react";

import { CycleLegend } from "./ui/badges/CycleBadge";
import { WaveChip } from "./ui/badges/WaveChip";
import { CenturyChip } from "./ui/badges/CenturyChip";
import { buildEventIndexes } from "./data/buildIndexes";
import { EventMetaChips } from "./ui/EventMetaChips";

// ───────────────────────────────────────────────────────────────────────────────
// Tiny error boundary so you never get a silent white screen again
class ErrorCatcher extends React.Component<{ children: React.ReactNode }, { err: any }> {
  constructor(props: any) {
    super(props);
    this.state = { err: null };
  }
  componentDidCatch(err: any) {
    console.error("[ErrorCatcher]", err);
    this.setState({ err });
  }
  render() {
    if (this.state.err) {
      const msg = String(this.state.err?.stack || this.state.err);
      return (
        <div className="p-4 text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap">
          {msg}
        </div>
      );
    }
    return this.props.children as any;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Feature flags
const SHOW_VIEW_SWITCHER = false; // hide the "Decade" pill in the toolbar

// Force-visible **century** range, independent of data
const CENTURY_MIN_OVERRIDE = 1500;  // shows 1500s upward
const CENTURY_MAX_OVERRIDE = 2100;  // includes 2000s (2000–2099)

// ───────────────────────────────────────────────────────────────────────────────
// CSV parser
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
  wave_id: string;
  wave_name: string;
  anchor_deg: string;
  anchor_sign: string;
  anchor_object?: string;
  notes?: string;
};
export type Reference = {
  signs: string[]; planets: string[]; aspects: string[];
  cycles: string[]; categories: string[];
  waves: Record<string, { name: string; anchors: number[] }>;
  stage_ranges?: { early: [number, number]; mid: [number, number]; late: [number, number] };
  rules?: { orb_deg_exact_window?: number };
};

type ViewMode = "decade" | "cycle" | "wave";

type HistoryTimelineAppProps = {
  yearStart?: number | "";
  yearEnd?: number | "";
  onSetYearRange?: (start: number | "", end: number | "") => void;
};

// ───────────────────────────────────────────────────────────────────────────────
// Data paths
const PATHS = {
  eventsJSON: "/data/events.json",
  eventsCSV: "/data/events.csv",
  aspectsJSON: "/data/aspects.json",
  aspectsCSV: "/data/aspects.csv",
  wavesJSON: "/data/waves.json",
  wavesCSV: "/data/waves.csv",
  reference: "/data/reference.json",
  version: "/data/version.json"
};

// ───────────────────────────────────────────────────────────────────────────────
// Fetch helpers with cache-bust
async function tryFetchJSON<T>(url: string, v: string): Promise<T | null> {
  try {
    const res = await fetch(url + v, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
}
async function fetchCSV<T = any>(url: string, v: string): Promise<T[]> {
  const res = await fetch(url + v, { cache: "no-store" });
  if (!res.ok) return [] as T[];
  const text = await res.text();
  return parseCSV(text) as unknown as T[];
}
async function getVersionParam(): Promise<string> {
  try {
    const res = await fetch(PATHS.version + `?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return "";
    const j = await res.json();
    const ts = j?.updatedAt || "";
    return ts ? `?v=${encodeURIComponent(ts)}` : "";
  } catch { return ""; }
}
async function loadData() {
  const v = await getVersionParam();
  const [reference, eventsJ, aspectsJ, wavesJ] = await Promise.all([
    tryFetchJSON<Reference>(PATHS.reference, v),
    tryFetchJSON<EventRow[]>(PATHS.eventsJSON, v),
    tryFetchJSON<AspectRow[]>(PATHS.aspectsJSON, v),
    tryFetchJSON<WaveTagRow[]>(PATHS.wavesJSON, v)
  ]);
  const events  = eventsJ  ?? await fetchCSV<EventRow>(PATHS.eventsCSV, v);
  const aspects = aspectsJ ?? await fetchCSV<AspectRow>(PATHS.aspectsCSV, v);
  const waves   = wavesJ   ?? await fetchCSV<WaveTagRow>(PATHS.wavesCSV, v);
  return { reference, events, aspects, waves } as const;
}

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
function yearOf(date: string): number {
  const y = Number(date?.slice(0, 4));
  return Number.isFinite(y) ? y : NaN;
}
const decadeOf = (y: number) => Math.floor(y / 10) * 10;

const EN_DASH = "\u2013";
const DASH_RX = /[\u2012\u2013\u2014\u2212-]/g;
function normalizeDashes(input: string): string {
  return input.replace(DASH_RX, EN_DASH).replace(/\s*\u2013\s*/g, EN_DASH);
}
function canonicalizeCycleKey(raw: string): string {
  return normalizeDashes(raw).replace(/\s+/g, " ").trim();
}

// UI helpers
const Badge: React.FC<React.PropsWithChildren<{ title?: string; onClick?: () => void }>> = ({ children, title, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`inline-flex items-center rounded-2xl border px-2 py-0.5 text-xs shadow-sm
                bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200
                ${onClick ? "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" : ""}`}
  >
    {children}
  </button>
);

const OptSwitch: React.FC<{ checked: boolean; onChange: (v:boolean)=>void; label: string; icon?: React.ReactNode; id: string }>
= ({ checked, onChange, label, icon, id }) => (
  <div className="flex items-center justify-between py-1.5">
    <label htmlFor={id} className="text-sm select-none">{label}</label>
    <div className="flex items-center gap-2">
      {icon}
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <label
        htmlFor={id}
        className="relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer
                   bg-gray-300 peer-checked:bg-black dark:bg-gray-700 dark:peer-checked:bg-white"
      >
        <span className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition
                          translate-x-1 peer-checked:translate-x-4" />
      </label>
    </div>
  </div>
);

// URL state helpers
function parseNum(v: string | null, fallback: number | ""): number | "" {
  if (v === null || v === "") return fallback;
  const n = Number(v); return Number.isFinite(n) ? n : fallback;
}
function parseCSVParam(v: string | null): string[] { return v ? v.split(",").map(s => s.trim()).filter(Boolean) : []; }
function parseCSVParamNum(v: string | null): number[] { return parseCSVParam(v).map(x => Number(x)).filter(Number.isFinite as any); }
function setURLParams(params: { q?: string; start?: number | ""; end?: number | ""; cycles?: string[]; waves?: number[]; view?: ViewMode; }) {
  const u = new URL(window.location.href);
  const { q, start, end, cycles, waves, view } = params;
  ["q","start","end","cycles","waves","view"].forEach(k => u.searchParams.delete(k));
  if (q) u.searchParams.set("q", q);
  if (start !== "" && start !== undefined) u.searchParams.set("start", String(start));
  if (end !== "" && end !== undefined) u.searchParams.set("end", String(end));
  if (cycles && cycles.length) u.searchParams.set("cycles", cycles.join(","));
  if (waves && waves.length) u.searchParams.set("waves", waves.join(","));
  if (view) u.searchParams.set("view", view);
  window.history.replaceState(null, "", u.toString());
}

// Section shell
function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="sticky top-12 bg-white/70 dark:bg-gray-900/70 backdrop-blur border-l-4 border-black dark:border-white px-3 py-1 inline-block rounded-r">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

// Debounce helper (for counts)
function useDebounced<T>(value: T, ms = 150) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ───────────────────────────────────────────────────────────────────────────────
// Main
export default function HistoryTimelineApp(props: HistoryTimelineAppProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [{ reference, events, aspects, waves }, setData] =
    useState<{ reference: Reference | null; events: EventRow[]; aspects: AspectRow[]; waves: WaveTagRow[] }>({
      reference: null, events: [], aspects: [], waves: []
    });

  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const initQ = url ? (url.searchParams.get("q") ?? "") : "";
  const initStart = url ? parseNum(url.searchParams.get("start"), 1900) : 1900;
  const initEnd = url ? parseNum(url.searchParams.get("end"), 2025) : 2025;
  const initCyclesRaw = url ? parseCSVParam(url.searchParams.get("cycles")) : [];
  const initCycles = initCyclesRaw.map(canonicalizeCycleKey);
  const initWaves = url ? parseCSVParamNum(url.searchParams.get("waves")) : [];
  const initView: ViewMode = (url?.searchParams.get("view") as ViewMode) || "decade";

  // Options
  const [dark, setDark] = useState<boolean>(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem("opt_dark") : null;
    if (s != null) return s === "1";
    if (typeof window !== "undefined") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const [compact, setCompact] = useState<boolean>(() => (localStorage.getItem("opt_compact") === "1"));
  const [wide, setWide] = useState<boolean>(() => (localStorage.getItem("opt_wide") === "1"));
  useEffect(() => { localStorage.setItem("opt_wide", wide ? "1" : "0"); }, [wide]);
  const containerW = wide ? "max-w-[1400px]" : "max-w-6xl";

  // Filters (controlled-friendly)
  const [q, setQ] = useState(initQ);
  const [startLocal, setStartLocal] = useState<number | "">(initStart);
  const [endLocal, setEndLocal] = useState<number | "">(initEnd);

  // reflect parent props into locals (controlled mode)
  useEffect(() => { if (props.yearStart !== undefined) setStartLocal(props.yearStart); }, [props.yearStart]);
  useEffect(() => { if (props.yearEnd !== undefined) setEndLocal(props.yearEnd); }, [props.yearEnd]);

  // unified getters/setters used by rest of component
  const start = props.yearStart !== undefined ? props.yearStart : startLocal;
  const end   = props.yearEnd   !== undefined ? props.yearEnd   : endLocal;

  const setStart = (v: number | "") => { if (props.onSetYearRange) props.onSetYearRange(v, end); else setStartLocal(v); };
  const setEnd   = (v: number | "") => { if (props.onSetYearRange) props.onSetYearRange(start, v); else setEndLocal(v); };

  const [selectedCycles, setSelectedCycles] = useState<string[]>(initCycles);
  const [selectedWaves, setSelectedWaves] = useState<number[]>(initWaves);
  const [view, setView] = useState<ViewMode>(initView);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    let meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", dark ? "dark" : "light");
    localStorage.setItem("opt_dark", dark ? "1" : "0");
  }, [dark]);

  // Persist compact
  useEffect(() => { localStorage.setItem("opt_compact", compact ? "1" : "0"); }, [compact]);

  // Load data
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

  // Sync URL
  useEffect(() => { setURLParams({ q, start, end, cycles: selectedCycles, waves: selectedWaves, view }); }, [q, start, end, selectedCycles, selectedWaves, view]);

  // Dev sanity
  useEffect(() => {
    if (!events.length || !import.meta.env.DEV) return;
    const ids = new Set(events.map(e => e.event_id));
    const orphanAspects = aspects.filter(a => !ids.has(a.event_id));
    const orphanWaves = waves.filter(w => !ids.has(w.event_id));
    const badYear = events.filter(e => !Number.isFinite(yearOf(e.date)));
    if (orphanAspects.length) console.warn("[data] Orphan aspects:", orphanAspects.map(a => a.aspect_id));
    if (orphanWaves.length) console.warn("[data] Orphan waves:", orphanWaves.map(w => w.wave_tag_id));
    if (badYear.length) console.warn("[timeline] Events with invalid year:", badYear.map(b => b.event_id));
  }, [events, aspects, waves]);

  // Canonical cycles for ordering/labels
  const cyclesRefRaw = reference?.cycles ?? [];
  const cyclesRef = useMemo(() => cyclesRefRaw.map(canonicalizeCycleKey), [cyclesRefRaw]);

  // Join
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

  // Build per-event indexes for meta chips (cycles + waves)  ← this was missing before
  const { cycles: eventCycles, waves: eventWaves } = useMemo(
    () =>
      buildEventIndexes(
        (aspects ?? []).map(a => ({ event_id: a.event_id, cycle_key: a.cycle_key ?? "" })),
        (waves ?? []).map(w => ({ event_id: w.event_id, wave_id: w.wave_id }))
      ),
    [aspects, waves]
  );

  // Base set for counts (search + year range only)
  const qDeb = useDebounced(q, 150);
  const baseFiltered = useMemo(() => {
    return eventsEnriched.filter(e => {
      const y = e._year;
      if (!Number.isFinite(y)) return false;
      if (start !== "" && y < (start as number)) return false;
      if (end !== "" && y > (end as number)) return false;
      const hay = `${e.title} ${e.summary ?? ""} ${e.tags ?? ""}`.toLowerCase();
      return qDeb ? hay.includes(qDeb.toLowerCase()) : true;
    });
  }, [eventsEnriched, start, end, qDeb]);

  // Counts for chips
  const { centuryCounts, cycleCounts, waveCounts } = useMemo(() => {
    const cc = new Map<number, number>();
    const cy = new Map<string, number>();
    const ww = new Map<number, number>();

    for (const e of baseFiltered) {
      const cent = Math.floor(e._year / 100) * 100;
      cc.set(cent, (cc.get(cent) ?? 0) + 1);

      const cset = new Set(
        e._aspects.map(a => a.cycle_key ? canonicalizeCycleKey(a.cycle_key) : "").filter(Boolean)
      );
      for (const k of cset) cy.set(k, (cy.get(k) ?? 0) + 1);

      const wset = new Set(
        e._waves.map(w => Number(w.wave_id)).filter(n => Number.isFinite(n))
      ) as Set<number>;
      for (const wid of wset) ww.set(wid, (ww.get(wid) ?? 0) + 1);
    }
    return { centuryCounts: cc, cycleCounts: cy, waveCounts: ww };
  }, [baseFiltered]);

  // Full filtered (adds cycle/wave filters)
  const filtered = useMemo(() => {
    return eventsEnriched.filter(e => {
      const y = e._year;
      if (!Number.isFinite(y)) return false;
      if (start !== "" && y < (start as number)) return false;
      if (end !== "" && y > (end as number)) return false;

      const hay = `${e.title} ${e.summary ?? ""} ${e.tags ?? ""}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;

      if (selectedCycles.length) {
        const ok = e._aspects.some(a => {
          const k = a.cycle_key ? canonicalizeCycleKey(a.cycle_key) : "";
          return k && selectedCycles.includes(k);
        });
        if (!ok) return false;
      }
      if (selectedWaves.length) {
        const ok = e._waves.some(w => selectedWaves.includes(Number(w.wave_id)));
        if (!ok) return false;
      }
      return true;
    });
  }, [eventsEnriched, q, start, end, selectedCycles, selectedWaves]);

  // Groupings
  const decadeGroups = useMemo(() => {
    const g = new Map<number, typeof filtered>();
    filtered.forEach(ev => {
      const d = decadeOf(ev._year);
      if (!g.has(d)) g.set(d, [] as any);
      g.get(d)!.push(ev);
    });
    return Array.from(g.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([decade, list]) => ({ key: `${decade}s`, list: list.sort((a,b)=>a._year - b._year) }));
  }, [filtered]);

  const cycleGroups = useMemo(() => {
    const present = new Map<string, EventRow[]>();
    filtered.forEach(ev => {
      const keys = Array.from(
        new Set(
          ev._aspects.map(a => a.cycle_key ? canonicalizeCycleKey(a.cycle_key) : "").filter(Boolean)
        )
      ) as string[];
      keys.forEach(k => {
        if (!present.has(k)) present.set(k, []);
        present.get(k)!.push(ev);
      });
    });
    const orderedKeys = [
      ...cyclesRef.filter(c => present.has(c)),
      ...Array.from(present.keys()).filter(k => !cyclesRef.includes(k)).sort()
    ];
    return orderedKeys.map(k => ({ key: k, list: (present.get(k) ?? []).sort((a,b)=>a._year - b._year) }));
  }, [filtered, cyclesRef]);

  const waveGroups = useMemo(() => {
    const present = new Map<number, EventRow[]>();
    filtered.forEach(ev => {
      const ids = Array.from(new Set(ev._waves.map(w => Number(w.wave_id)).filter(n => Number.isFinite(n)))) as number[];
      ids.forEach(id => {
        if (!present.has(id)) present.set(id, []);
        present.get(id)!.push(ev);
      });
    });
    const ordered = Array.from({ length: 10 }, (_, i) => i + 1).filter(id => present.has(id));
    return ordered.map(id => ({ key: `Wave ${id}`, list: (present.get(id) ?? []).sort((a,b)=>a._year - b._year) }));
  }, [filtered]);

  // Dataset span (for clearing chips)
  const [datasetStart, datasetEnd] = useMemo(() => {
    const ys = (events ?? []).map(e => Number(e.date?.slice(0,4))).filter(Number.isFinite) as number[];
    if (!ys.length) return [1900, 2029];
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return [minY, maxY];
  }, [events]);

  // CENTURY chips
  const availableCenturies = useMemo(() => {
    const years = (events ?? [])
      .map(e => Number(e.date?.slice(0, 4)))
      .filter(Number.isFinite) as number[];

    const minY = years.length ? Math.min(...years) : CENTURY_MIN_OVERRIDE;
    const maxY = years.length ? Math.max(...years) : CENTURY_MIN_OVERRIDE;

    const minCentury = Math.floor(Math.min(CENTURY_MIN_OVERRIDE, minY) / 100) * 100;
    const maxCentury = Math.floor(Math.max(CENTURY_MAX_OVERRIDE, maxY) / 100) * 100;

    const out: number[] = [];
    for (let c = minCentury; c <= maxCentury; c += 100) out.push(c);
    return out;
  }, [events]);

  // Which centuries have results under current query+range (for muted style)
  const centuriesWithResults = useMemo(() => {
    const set = new Set<number>();
    for (const e of baseFiltered) {
      const y = Number(e._year);
      if (Number.isFinite(y)) set.add(Math.floor(y / 100) * 100);
    }
    return set;
  }, [baseFiltered]);

  const activeCentury =
    typeof start === "number" && typeof end === "number" && end === (start as number) + 99
      ? (start as number)
      : null;

  const toggleCentury = (c: number) => {
    if (activeCentury === c) {
      setStart(datasetStart);
      setEnd(datasetEnd);
    } else {
      setStart(c);
      setEnd(c + 99);
      setView("decade");
    }
  };

  const resetFilters = () => {
    setQ(""); setStart(datasetStart); setEnd(datasetEnd);
    setSelectedCycles([]); setSelectedWaves([]);
  };

  if (loading) return <div className="p-6 dark:text-gray-100">Loading…</div>;
  if (error)   return <div className="p-6 text-red-600 dark:text-red-400">{error}</div>;

  const viewSubtitle =
    view === "decade" ? "By decades" :
    view === "cycle"  ? "Grouped by synodic cycle" :
                        "Grouped by harmonic wave";

  const toggleCycle = (c: string) => {
    setSelectedCycles(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);
  };
  const toggleWave = (w: number) => {
    setSelectedWaves(s => s.includes(w) ? s.filter(x => x !== w) : [...s, w].sort((a,b)=>a-b));
  };

  const EventCard: React.FC<{ e: any; idx: number }> = ({ e, idx }) => (
    <motion.div
      key={e.event_id}
      initial={{opacity:0, y:6}}
      animate={{opacity:1, y:0}}
      transition={{duration:0.2, delay: idx * 0.02}}
      className={`rounded-2xl shadow-sm border card
                  bg-white border-gray-200 text-gray-900
                  dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100
                  ${compact ? "px-3 py-2" : "p-4"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-500 dark:text-gray-400 subtle">{e.date}</div>
        <div className={`flex gap-2 ${compact ? "text-[11px]" : ""}`}>
          {e.category && <Badge title="Category">{e.category}</Badge>}
          {e.region && <Badge title="Region">{e.region}</Badge>}
        </div>
      </div>
      <h3 className={`mt-1 font-semibold ${compact ? "text-sm" : "text-base"}`}>{e.title}</h3>
      {!compact && e.summary && (
        <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{e.summary}</p>
      )}

      <EventMetaChips
        eventId={e.event_id}
        cycleMap={eventCycles}
        waveMap={eventWaves}
        activeCycles={new Set(selectedCycles)}
        activeWaves={new Set(selectedWaves)}
        onToggleCycle={toggleCycle}
        onToggleWave={toggleWave}
      />

      {e.source_url && (
        <a href={e.source_url} target="_blank" rel="noreferrer" className={`mt-3 inline-block text-sm underline ${compact ? "hidden" : ""}`}>
          Source ↗
        </a>
      )}
    </motion.div>
  );

  // Decide groups per view
  const groups =
    view === "decade" ? decadeGroups :
    view === "cycle"  ? cycleGroups  :
                        waveGroups;

  return (
    <ErrorCatcher>
      <div
        id="app-root"
        className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 dark:from-gray-900 dark:to-gray-950 dark:text-gray-100"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 header-surface">
          <div className={`mx-auto ${containerW} px-4 py-3 flex items-center gap-3`}>
            <Activity className="w-5 h-5"/>
            <h1 className="text-lg font-semibold">Harmonic History Timeline</h1>
            <span className="text-sm text-gray-500 dark:text-gray-400 subtle">{viewSubtitle}</span>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 subtle">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {/* View Switcher (hidden) + Options */}
        <div className={`mx-auto ${containerW} px-4 pt-4 flex items-center gap-3`}>
          {SHOW_VIEW_SWITCHER && (
            <div className="inline-flex items-center gap-1 rounded-2xl border bg-white shadow-sm p-1 dark:bg-gray-900 dark:border-gray-800 surface">
              <button
                className={`px-3 py-1.5 rounded-2xl text-sm ${view === "decade" ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                onClick={() => setView("decade")}
                title="Chronological by decades"
              >Decade</button>
              <div className="pl-2 pr-3 text-gray-400"><LayoutGrid className="w-4 h-4" /></div>
            </div>
          )}

          {/* Options dropdown */}
          <details className="relative inline-block ml-1">
            <summary className="list-none inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border bg-white shadow-sm cursor-pointer select-none dark:bg-gray-900 dark:border-gray-800 surface">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm">Options</span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </summary>
            <div className="absolute mt-2 min-w-[240px] rounded-xl border bg-white p-3 shadow-lg z-20
                            dark:bg-gray-900 dark:border-gray-800 surface">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 subtle">Display</div>
              <OptSwitch
                id="opt-dark"
                checked={dark}
                onChange={setDark}
                label="Dark mode"
                icon={dark ? <Moon className="w-4 h-4 opacity-70"/> : <Sun className="w-4 h-4 opacity-70"/>}
              />
              <OptSwitch
                id="opt-compact"
                checked={compact}
                onChange={setCompact}
                label="Compact cards (hide summaries)"
              />
              <OptSwitch
                id="opt-wide"
                checked={wide}
                onChange={setWide}
                label="Wide layout"
              />
            </div>
          </details>
        </div>

        {/* Controls */}
        <div className={`mx-auto ${containerW} px-4 py-4 grid grid-cols-1 lg:grid-cols-4 gap-4`}>
          {/* Search */}
          <div className="lg:col-span-2 flex items-center gap-2 border rounded-2xl px-3 py-2 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800 surface">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
            <input
              id="search-input"
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search titles, summaries, tags…"
              className="w-full outline-none bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Year range inputs */}
          <div className="flex items-center gap-2 border rounded-2xl px-3 py-2 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800 surface">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
            <input type="number" value={start} onChange={e=>setStart(e.target.value ? Number(e.target.value) : "")} className="w-20 outline-none bg-transparent"/>
            <span>—</span>
            <input type="number" value={end} onChange={e=>setEnd(e.target.value ? Number(e.target.value) : "")} className="w-20 outline-none bg-transparent"/>
          </div>

          {/* Reset */}
          <div className="flex items-center justify-end">
            <button
              onClick={resetFilters}
              className="border rounded-2xl px-3 py-2 bg-white shadow-sm hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-800 surface"
              title="Reset all filters"
            >
              Reset
            </button>
          </div>

          {/* Filters panel */}
          <details className="lg:col-span-4 border rounded-2xl px-3 py-2 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800 surface">
            <summary className="flex items-center gap-2 cursor-pointer select-none">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400"/>Filters <ChevronDown className="w-4 h-4 ml-auto"/>
            </summary>
            <div className="pt-3 space-y-3">
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 subtle">
                  Legend (click to filter)
                </div>

                {/* Century chips */}
                <div className="mb-2 flex flex-wrap gap-2">
                  {availableCenturies.map((c) => (
                    <CenturyChip
                      key={c}
                      centuryStart={c}
                      active={activeCentury === c}
                      muted={!centuriesWithResults.has(c)}
                      count={centuryCounts.get(c) ?? 0}
                      onClick={() => toggleCentury(c)}
                    />
                  ))}
                </div>

                {/* Cycle legend */}
                <CycleLegend
                  cycles={cyclesRef}
                  activeSet={new Set(selectedCycles)}
                  countByCycle={cycleCounts}
                  onToggle={(c) => {
                    setSelectedCycles(s => s.includes(c) ? s.filter(x=>x!==c) : [...s, c]);
                    setView("cycle");
                  }}
                />

                {/* Wave chips */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((w) => (
                    <WaveChip
                      key={w}
                      waveId={w}
                      name={reference?.waves?.[String(w)]?.name}
                      active={selectedWaves.includes(w)}
                      count={waveCounts.get(w) ?? 0}
                      onClick={() => {
                        setSelectedWaves(s => s.includes(w) ? s.filter(x=>x!==w) : [...s, w].sort((a,b)=>a-b));
                        setView("wave");
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Groups */}
        <div className={`mx-auto ${containerW} px-4 pb-16`}>
          {groups.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 subtle">No events match the current filters.</div>
          )}
          {groups.map(({ key, list }) => (
            <SectionShell key={key} title={key}>
              {list.map((e: any, idx: number) => (
                <EventCard key={e.event_id + ":" + key} e={e} idx={idx} />
              ))}
            </SectionShell>
          ))}
        </div>
      </div>
    </ErrorCatcher>
  );
}
