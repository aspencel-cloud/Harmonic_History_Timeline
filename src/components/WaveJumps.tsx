import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Waves, Info, ChevronDown } from "lucide-react";

type WaveMeta = { id: number; label: string };

type Props = {
  /** Waves to display (e.g., {id: 9, label: "Wave 9 — Harvesters"}) */
  waves: WaveMeta[];
  /** Currently selected wave ids. */
  selectedWaves: number[];
  /** Called when a user wants to jump to a single wave (replaces selection). */
  onJumpWave: (waveId: number) => void;
  /** Switch the main view to "wave" when jumping. */
  onSetView: (view: "wave") => void;
};

export default function WaveJumps({
  waves,
  selectedWaves,
  onJumpWave,
  onSetView,
}: Props) {
  const [open, setOpen] = useState(false);
  const top = useMemo(() => waves.slice(0, 6), [waves]);
  const isSelected = (id: number) => selectedWaves.includes(id);

  const jump = (id: number) => {
    onSetView("wave");
    onJumpWave(id);
    setOpen(false);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 opacity-80" />
          <span className="font-medium">Wave Quick-Jumps</span>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1 rounded-2xl px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          More <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {top.map((w) => (
          <motion.button
            key={w.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => jump(w.id)}
            className={[
              "px-3 py-1.5 rounded-2xl text-sm border transition-colors",
              isSelected(w.id)
                ? "bg-gray-900 text-white dark:bg-white dark:text-black border-transparent"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
            ].join(" ")}
            title={w.label}
          >
            {w.label}
          </motion.button>
        ))}
      </div>

      {open && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 mt-1">
          <div className="flex items-center gap-2 text-sm opacity-80 mb-2">
            <Info className="h-4 w-4" />
            <span>All waves</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {waves.map((w) => (
              <button
                key={w.id}
                onClick={() => jump(w.id)}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm border text-left",
                  isSelected(w.id)
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black border-transparent"
                    : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
                title={w.label}
              >
                <div className="font-medium">{w.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
