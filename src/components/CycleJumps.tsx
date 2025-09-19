import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Orbit, Info, ChevronDown } from "lucide-react";

type Props = {
  /** Display labels for cycles (e.g., "Saturn–Neptune"). */
  cycles: string[];
  /** Currently selected cycle keys (canonicalized). */
  selectedCycles: string[];
  /** Called when a user wants to jump to a single cycle (replaces selection). */
  onJumpCycle: (cycleKey: string) => void;
  /** Switch the main view to "cycle" when jumping. */
  onSetView: (view: "cycle") => void;
};

export default function CycleJumps({
  cycles,
  selectedCycles,
  onJumpCycle,
  onSetView,
}: Props) {
  const [open, setOpen] = useState(false);

  const top = useMemo(() => cycles.slice(0, 6), [cycles]);
  const isSelected = (c: string) => selectedCycles.includes(c);

  const jump = (c: string) => {
    onSetView("cycle");
    onJumpCycle(c);
    setOpen(false);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Orbit className="h-5 w-5 opacity-80" />
          <span className="font-medium">Cycle Quick-Jumps</span>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1 rounded-2xl px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          More <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {top.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.98 }}
            onClick={() => jump(c)}
            className={[
              "px-3 py-1.5 rounded-2xl text-sm border transition-colors",
              isSelected(c)
                ? "bg-gray-900 text-white dark:bg-white dark:text-black border-transparent"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
            ].join(" ")}
            title={c}
          >
            {c}
          </motion.button>
        ))}
      </div>

      {open && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 mt-1">
          <div className="flex items-center gap-2 text-sm opacity-80 mb-2">
            <Info className="h-4 w-4" />
            <span>All cycles</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {cycles.map((c) => (
              <button
                key={c}
                onClick={() => jump(c)}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm border text-left",
                  isSelected(c)
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black border-transparent"
                    : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
                title={c}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
