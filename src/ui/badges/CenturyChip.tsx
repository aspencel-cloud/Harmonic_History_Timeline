import { memo } from "react";
import { Calendar } from "lucide-react";
import { DECADE_COLOR_CLASS } from "../colors";

export const CenturyChip = memo(function CenturyChip({
  centuryStart,
  active = false,
  muted = false,
  count,
  onClick,
}: {
  centuryStart: number;        // e.g., 1500 for "1500s"
  active?: boolean;
  muted?: boolean;             // render softer if no events (still clickable)
  count?: number;              // show how many events in this century under current query+range
  onClick?: () => void;
}) {
  const cls = DECADE_COLOR_CLASS(centuryStart);
  const label = `${centuryStart}s`;              // "1500s"
  const title = `${centuryStart}–${centuryStart + 99}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${title}${typeof count === "number" ? ` • ${count} event${count === 1 ? "" : "s"}` : ""}`}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border border-transparent",
        "hover:shadow-sm transition",
        active ? "ring-2 ring-black/10 dark:ring-white/20" : "",
        muted ? "opacity-60 hover:opacity-80" : "",
        cls,
      ].join(" ")}
    >
      <Calendar className="h-3.5 w-3.5" />
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="ml-1 rounded px-1 text-[10px] bg-black/10 dark:bg-white/10">
          {count}
        </span>
      )}
    </button>
  );
});
