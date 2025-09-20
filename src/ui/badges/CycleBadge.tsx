import { memo } from "react";
import { CYCLE_COLOR_CLASS } from "../colors";

export const CycleBadge = memo(function CycleBadge({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = CYCLE_COLOR_CLASS(label);
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border border-transparent",
        "hover:shadow-sm transition",
        active ? "ring-2 ring-black/10 dark:ring-white/20" : "",
        cls,
      ].join(" ")}
      title={label}
    >
      <span className="leading-none">◌</span>
      <span>{label}</span>
    </button>
  );
});

export function CycleLegend({
  cycles,
  activeSet,
  countByCycle,
  onToggle,
}: {
  cycles: string[];
  activeSet: Set<string>;
  countByCycle?: Map<string, number>;
  onToggle: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {cycles.map((c) => {
        const isActive = activeSet.has(c);
        const count = countByCycle?.get(c);
        return (
          <div key={c} className="inline-flex items-center gap-1">
            <CycleBadge label={c} active={isActive} onClick={() => onToggle(c)} />
            {typeof count === "number" && (
              <span className="rounded px-1 text-[10px] bg-black/10 dark:bg-white/10">
                {count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
