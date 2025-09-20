import React from "react";
import { CycleBadge } from "./badges/CycleBadge";
import { WaveChip } from "./badges/WaveChip";

type Props = {
  eventId: string;
  cycleMap: Map<string, Set<string>>;
  waveMap: Map<string, Set<number>>;
  activeCycles: Set<string>;
  activeWaves: Set<number>;
  onToggleCycle: (c: string) => void;
  onToggleWave: (w: number) => void;
};

export function EventMetaChips({
  eventId,
  cycleMap,
  waveMap,
  activeCycles,
  activeWaves,
  onToggleCycle,
  onToggleWave,
}: Props) {
  const cycles = Array.from(cycleMap.get(eventId) ?? []);
  const waves = Array.from(waveMap.get(eventId) ?? []);

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
      {cycles.map((c) => (
        <CycleBadge
          key={c}
          label={c}
          active={activeCycles.has(c)}
          onClick={() => onToggleCycle(c)}
        />
      ))}
      {waves.map((w) => {
        const wid = Number(w);
        return (
          <WaveChip
            key={`w${wid}`}
            waveId={wid}
            active={activeWaves.has(wid)}
            onClick={() => onToggleWave(wid)}
          />
        );
      })}
    </div>
  );
}
