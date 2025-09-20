// Very small helpers to compute relationships for rendering chips on cards

export type AspectRow = {
  event_id: string;
  cycle_key: string; // already normalized in your data
};
export type WaveRow = {
  event_id: string;
  wave_id: string | number;
};

const EN_DASH = "–";
const DASH_RX = /[\u2012\u2013\u2014\u2212-]/g;
const normDash = (s: string) => (s ?? "").replace(DASH_RX, EN_DASH).trim();

export type EventCyclesMap = Map<string, Set<string>>;
export type EventWavesMap  = Map<string, Set<number>>;

export function buildEventIndexes(aspects: AspectRow[], waves: WaveRow[]) {
  const cycles: EventCyclesMap = new Map();
  const wavesMap: EventWavesMap = new Map();

  for (const a of aspects) {
    const key = normDash(a.cycle_key);
    if (!key) continue;
    const set = cycles.get(a.event_id) ?? new Set<string>();
    set.add(key);
    cycles.set(a.event_id, set);
  }

  for (const w of waves) {
    const wid = Number(w.wave_id);
    if (!Number.isFinite(wid)) continue;
    const set = wavesMap.get(w.event_id) ?? new Set<number>();
    set.add(wid);
    wavesMap.set(w.event_id, set);
  }

  return { cycles, waves: wavesMap };
}
