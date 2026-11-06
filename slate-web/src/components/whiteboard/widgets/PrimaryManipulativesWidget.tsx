import React, { useState } from "react";
import { Clock, Divide, MoveHorizontal, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { cn } from "@/lib/utils";

const FRACTIONS = [
  { label: "1 Whole", den: 1, color: "#f87171" },
  { label: "1/2", den: 2, color: "#fb923c" },
  { label: "1/3", den: 3, color: "#fbbf24" },
  { label: "1/4", den: 4, color: "#4ade80" },
  { label: "1/5", den: 5, color: "#2dd4bf" },
  { label: "1/6", den: 6, color: "#38bdf8" },
  { label: "1/8", den: 8, color: "#818cf8" },
  { label: "1/10", den: 10, color: "#c084fc" },
  { label: "1/12", den: 12, color: "#f472b6" },
];

export function PrimaryManipulativesWidget() {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [tab, setTab] = useState<"clock" | "fractions" | "numberline">("clock");

  // Clock state
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(15);
  const [showDigital, setShowDigital] = useState(true);

  // Number line state
  const [nlMin, setNlMin] = useState(0);
  const [nlMax, setNlMax] = useState(10);
  const [nlStep, setNlStep] = useState(1);

  const placeClockOnBoard = () => {
    const sx = -camera.x / camera.zoom + 200;
    const sy = -camera.y / camera.zoom + 180;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    // Place Clock circle + text
    addObject({
      id: Math.random().toString(36).slice(2, 10),
      kind: "shape",
      shape: "circle",
      x: sx,
      y: sy,
      w: 220,
      h: 220,
      color: "#0284c7",
      size: 3,
    });
    addObject({
      id: Math.random().toString(36).slice(2, 10),
      kind: "text",
      x: sx + 60,
      y: sy + 90,
      w: 120,
      h: 40,
      text: timeStr,
      color: "#0f172a",
      fontSize: 28,
    });
    pushHistory();
  };

  const placeFractionBarOnBoard = (item: (typeof FRACTIONS)[0]) => {
    const sx = -camera.x / camera.zoom + 160;
    const sy = -camera.y / camera.zoom + 200;
    const totalW = 480;
    const unitW = totalW / item.den;

    for (let i = 0; i < item.den; i++) {
      addObject({
        id: Math.random().toString(36).slice(2, 10),
        kind: "shape",
        shape: "rect",
        x: sx + i * unitW,
        y: sy,
        w: unitW,
        h: 46,
        color: item.color,
        size: 2,
      });
      addObject({
        id: Math.random().toString(36).slice(2, 10),
        kind: "text",
        x: sx + i * unitW + unitW / 2 - 18,
        y: sy + 10,
        w: 40,
        h: 24,
        text: item.den === 1 ? "1" : `1/${item.den}`,
        color: "#0f172a",
        fontSize: 16,
      });
    }
    pushHistory();
  };

  const placeNumberLineOnBoard = () => {
    const sx = -camera.x / camera.zoom + 100;
    const sy = -camera.y / camera.zoom + 240;
    const totalWidth = 600;
    const count = Math.round((nlMax - nlMin) / nlStep);
    const spacing = totalWidth / count;

    // Baseline
    addObject({
      id: Math.random().toString(36).slice(2, 10),
      kind: "shape",
      shape: "double-arrow",
      x: sx,
      y: sy,
      w: totalWidth,
      h: 10,
      color: "#1e293b",
      size: 3,
    });

    // Ticks & Labels
    for (let i = 0; i <= count; i++) {
      const val = nlMin + i * nlStep;
      const tx = sx + i * spacing;
      addObject({
        id: Math.random().toString(36).slice(2, 10),
        kind: "shape",
        shape: "line",
        x: tx,
        y: sy - 15,
        w: 1,
        h: 30,
        color: "#1e293b",
        size: 2,
      });
      addObject({
        id: Math.random().toString(36).slice(2, 10),
        kind: "text",
        x: tx - 12,
        y: sy + 20,
        w: 24,
        h: 24,
        text: String(val),
        color: "#0f172a",
        fontSize: 16,
      });
    }
    pushHistory();
  };

  return (
    <div className="w-80 select-none space-y-3 p-1">
      {/* Tabs */}
      <div className="flex rounded-xl bg-muted/60 p-1">
        <button
          onClick={() => setTab("clock")}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "clock"
              ? "bg-card text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="h-3.5 w-3.5 inline mr-1" />
          Clock
        </button>
        <button
          onClick={() => setTab("fractions")}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "fractions"
              ? "bg-card text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Divide className="h-3.5 w-3.5 inline mr-1" />
          Fractions
        </button>
        <button
          onClick={() => setTab("numberline")}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "numberline"
              ? "bg-card text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MoveHorizontal className="h-3.5 w-3.5 inline mr-1" />
          Number Line
        </button>
      </div>

      {/* Tab 1: Clock */}
      {tab === "clock" && (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 border border-border p-3">
            {/* Clock Face SVG */}
            <svg className="h-36 w-36" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="white" stroke="#0f172a" strokeWidth="3" />
              {/* Hour numbers */}
              {[12, 3, 6, 9].map((num) => {
                const a = ((num - 3) * 30 * Math.PI) / 180;
                return (
                  <text
                    key={num}
                    x={50 + Math.cos(a) * 34}
                    y={50 + Math.sin(a) * 34 + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#334155"
                  >
                    {num}
                  </text>
                );
              })}
              {/* Hour Hand */}
              <line
                x1="50"
                y1="50"
                x2={50 + Math.sin(((hours % 12) * 30 + minutes * 0.5) * (Math.PI / 180)) * 24}
                y2={50 - Math.cos(((hours % 12) * 30 + minutes * 0.5) * (Math.PI / 180)) * 24}
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Minute Hand */}
              <line
                x1="50"
                y1="50"
                x2={50 + Math.sin(minutes * 6 * (Math.PI / 180)) * 34}
                y2={50 - Math.cos(minutes * 6 * (Math.PI / 180)) * 34}
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="3" fill="#ef4444" />
            </svg>

            {showDigital && (
              <span className="mt-2 text-xl font-black font-mono tracking-widest text-foreground">
                {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
              </span>
            )}
          </div>

          {/* Hand Time Adjusters */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-2">
              <span className="text-xs font-bold text-muted-foreground">Hour:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setHours((h) => (h === 1 ? 12 : h - 1))}
                  className="rounded p-1 hover:bg-muted"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <span className="font-bold text-sm w-5 text-center">{hours}</span>
                <button
                  onClick={() => setHours((h) => (h === 12 ? 1 : h + 1))}
                  className="rounded p-1 hover:bg-muted"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-2">
              <span className="text-xs font-bold text-muted-foreground">Min:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMinutes((m) => (m === 0 ? 55 : m - 5))}
                  className="rounded p-1 hover:bg-muted"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <span className="font-bold text-sm w-6 text-center">{minutes}</span>
                <button
                  onClick={() => setMinutes((m) => (m === 55 ? 0 : m + 5))}
                  className="rounded p-1 hover:bg-muted"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={placeClockOnBoard}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Place Teaching Clock on Board
          </button>
        </div>
      )}

      {/* Tab 2: Fraction Bars */}
      {tab === "fractions" && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Tap any fraction strip to place on the board:
          </p>
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {FRACTIONS.map((f) => (
              <button
                key={f.label}
                onClick={() => placeFractionBarOnBoard(f)}
                className="flex w-full items-center justify-between rounded-xl border border-border/80 p-2 hover:bg-muted transition-all active:scale-95"
              >
                <span className="text-xs font-bold text-foreground">{f.label}</span>
                <div
                  className="h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm"
                  style={{ width: `${Math.max(60, 200 / f.den)}px`, backgroundColor: f.color }}
                >
                  {f.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Number Line */}
      {tab === "numberline" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Min Value:</span>
              <input
                type="number"
                value={nlMin}
                onChange={(e) => setNlMin(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background p-2 text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Max Value:</span>
              <input
                type="number"
                value={nlMax}
                onChange={(e) => setNlMax(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background p-2 text-xs font-bold"
              />
            </div>
          </div>

          <button
            onClick={placeNumberLineOnBoard}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Place Number Line on Board
          </button>
        </div>
      )}
    </div>
  );
}
