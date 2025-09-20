import { memo } from "react";
import { WAVE_COLOR_CLASS } from "../colors";

export const WaveChip = memo(function WaveChip({
  waveId,
  name,
  active,
  count,
  onClick,
}: {
  waveId: number | string | undefined;
  name?: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  // Defensive normalize so we never throw here
  const widNum = Number(waveId);
  const valid = Number.isFinite(widNum) && widNum >= 1 && widNum <= 10;
  const wid = valid ? widNum : 0;

  const cls = valid ? WAVE_COLOR_CLASS(wid) : "border border-gray-500/20 text-gray-300 bg-gray-500/10 dark:bg-white/5";

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        valid
          ? `Wave ${wid}${name ? ` — ${name}` : ""}${typeof count === "number" ? ` • ${count}` : ""}`
          : `Unknown wave${typeof count === "number" ? ` • ${count}` : ""}`
      }
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border border-transparent",
        "hover:shadow-sm transition",
        active ? "ring-2 ring-black/10 dark:ring-white/20" : "",
        cls,
      ].join(" ")}
    >
      <span className="leading-none">〰</span>
      <span>{valid ? `W${wid}` : "W?"}</span>
      {typeof count === "number" && (
        <span className="ml-1 rounded px-1 text-[10px] bg-black/10 dark:bg-white/10">{count}</span>
      )}
    </button>
  );
});
