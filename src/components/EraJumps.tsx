// src/components/EraJumps.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Info, ChevronDown } from "lucide-react";
import { ERAS, Era } from "../data/eras";

type Props = {
  yearStart: number;
  yearEnd: number;
  onSetRange: (start: number, end: number) => void;
  selectedEraId?: string | null;
  persistKey?: string;
};

const ERA_STORAGE_KEY_FALLBACK = "hht.lastEra";

export default function EraJumps({
  yearStart,
  yearEnd,
  onSetRange,
  selectedEraId = null,
  persistKey,
}: Props) {
  const storageKey = persistKey ?? ERA_STORAGE_KEY_FALLBACK;

  const [open, setOpen] = useState(false);
  const [hoverHint, setHoverHint] = useState<string | null>(null);

  const inferredEra = useMemo(() => {
    return (
      ERAS.find((e) => e.start === yearStart && e.end === yearEnd)?.id ??
      selectedEraId ??
      null
    );
  }, [yearStart, yearEnd, selectedEraId]);

  useEffect(() => {
    if (inferredEra) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const era = ERAS.find((e) => e.id === saved);
      if (era) onSetRange(era.start, era.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectEra = (era: Era) => {
    onSetRange(era.start, era.end);
    localStorage.setItem(storageKey, era.id);
    setOpen(false);
  };

  const isSelected = (id: string) => inferredEra === id;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 opacity-80" />
          <span className="font-medium">Era Quick-Jumps</span>
          {hoverHint && (
            <span className="text-xs opacity-70 hidden sm:inline">· {hoverHint}</span>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-2xl px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          aria-expanded={open}
        >
          More <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ERAS.slice(0, 6).map((era) => (
          <motion.button
            key={era.id}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => setHoverHint(era.hint ?? null)}
            onMouseLeave={() => setHoverHint(null)}
            onClick={() => selectEra(era)}
            className={[
              "px-3 py-1.5 rounded-2xl text-sm border transition-colors",
              isSelected(era.id)
                ? "bg-gray-900 text-white dark:bg-white dark:text-black border-transparent"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
            ].join(" ")}
            title={era.hint ?? ""}
          >
            {era.label}
          </motion.button>
        ))}
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 mt-1"
        >
          <div className="flex items-center gap-2 text-sm opacity-80 mb-2">
            <Info className="h-4 w-4" />
            <span>All eras</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ERAS.map((era) => (
              <button
                key={era.id}
                onClick={() => selectEra(era)}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm border text-left",
                  isSelected(era.id)
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black border-transparent"
                    : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
                title={era.hint ?? ""}
              >
                <div className="font-medium">{era.label}</div>
                <div className="text-xs opacity-70">
                  {era.start}–{era.end}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="text-xs opacity-70">
        Showing: <span className="font-mono">{yearStart}</span>–<span className="font-mono">{yearEnd}</span>
      </div>
    </div>
  );
}
