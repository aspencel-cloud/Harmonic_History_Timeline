// Simple color helpers for badges/chips. All return Tailwind class strings.

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── Cycles ─────────────────────────────────────────────────────────────────────
const cyclePalettes = [
  "border-indigo-500/20 text-indigo-300 bg-indigo-500/10",
  "border-emerald-500/20 text-emerald-300 bg-emerald-500/10",
  "border-cyan-500/20 text-cyan-300 bg-cyan-500/10",
  "border-amber-500/20 text-amber-300 bg-amber-500/10",
  "border-fuchsia-500/20 text-fuchsia-300 bg-fuchsia-500/10",
  "border-purple-500/20 text-purple-300 bg-purple-500/10",
];

export function CYCLE_COLOR_CLASS(label: string): string {
  const i = hashStr(label) % cyclePalettes.length;
  return `border ${cyclePalettes[i]} dark:bg-white/5`;
}

// ── Waves (1–10) ──────────────────────────────────────────────────────────────
const wavePalettes = [
  "border-pink-500/20 text-pink-300 bg-pink-500/10",
  "border-rose-500/20 text-rose-300 bg-rose-500/10",
  "border-orange-500/20 text-orange-300 bg-orange-500/10",
  "border-amber-500/20 text-amber-300 bg-amber-500/10",
  "border-lime-500/20 text-lime-300 bg-lime-500/10",
  "border-emerald-500/20 text-emerald-300 bg-emerald-500/10",
  "border-teal-500/20 text-teal-300 bg-teal-500/10",
  "border-sky-500/20 text-sky-300 bg-sky-500/10",
  "border-indigo-500/20 text-indigo-300 bg-indigo-500/10",
  "border-violet-500/20 text-violet-300 bg-violet-500/10",
];

export function WAVE_COLOR_CLASS(waveId: number): string {
  const n = Number(waveId) || 1;
  const i = ((n - 1) % wavePalettes.length + wavePalettes.length) % wavePalettes.length;
  return `border ${wavePalettes[i]} dark:bg-white/5`;
}

// ── Decades/Centuries (for date chips) ─────────────────────────────────────────
const decadePalettes = [
  "border-sky-500/20 text-sky-300 bg-sky-500/10",
  "border-cyan-500/20 text-cyan-300 bg-cyan-500/10",
  "border-blue-500/20 text-blue-300 bg-blue-500/10",
  "border-indigo-500/20 text-indigo-300 bg-indigo-500/10",
  "border-violet-500/20 text-violet-300 bg-violet-500/10",
];

export function DECADE_COLOR_CLASS(decadeStart: number): string {
  const i = Math.abs(Math.floor(decadeStart / 100)) % decadePalettes.length;
  return `border ${decadePalettes[i]} dark:bg-white/5`;
}
