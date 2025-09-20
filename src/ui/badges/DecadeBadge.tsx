import { memo } from "react";
import { Calendar } from "lucide-react";
import { DECADE_COLOR_CLASS } from "../colors";

export const DecadeChip = memo(function DecadeChip({
  decade,
  active = false,
  onClick,
}: {
  decade: number; // e.g., 1980
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = DECADE_COLOR_CLASS(decade);
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border border-transparent",
        "hover:shadow-sm transition", active ? "ring-2 ring-black/10 dark:ring-white/20" : "", cls,
      ].join(" ")}
      title={`${decade}s`}
    >
      <Calendar className="h-3.5 w-3.5" />
      {decade}s
    </button>
  );
});
