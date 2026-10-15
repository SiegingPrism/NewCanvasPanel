import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, RotateCcw, Palette, ArrowDown, ArrowRight } from "lucide-react";

const CURTAINS = [
  { id: "blue", name: "Blue Velvet", file: "/curtains/illus_curtain_blue.svg", color: "#2563eb" },
  { id: "red", name: "Crimson Red", file: "/curtains/illus_curtain_red.svg", color: "#dc2626" },
  { id: "green", name: "Emerald Green", file: "/curtains/illus_curtain_green.svg", color: "#16a34a" },
  { id: "plum", name: "Royal Plum", file: "/curtains/illus_curtain_plum.svg", color: "#9333ea" },
  { id: "turquoise", name: "Turquoise", file: "/curtains/illus_curtain_turquoise.svg", color: "#06b6d4" },
  { id: "rose", name: "Rose Velvet", file: "/curtains/illus_curtain_rose.svg", color: "#f43f5e" },
  { id: "grey", name: "Classic Grey", file: "/curtains/illus_curtain_grey.svg", color: "#4b5563" },
  { id: "white", name: "Silk White", file: "/curtains/illus_curtain_white.svg", color: "#94a3b8" },
];

export function CurtainWidget() {
  const [selectedCurtain, setSelectedCurtain] = useState(CURTAINS[0]);
  const [revealPercent, setRevealPercent] = useState(40); // 0 = completely closed, 100 = completely open
  const [direction, setDirection] = useState<"top-down" | "left-right">("top-down");
  const [opacity, setOpacity] = useState(95);

  const coveredPercent = 100 - revealPercent;

  return (
    <div className="flex flex-col gap-3 min-w-[280px] max-w-[340px]">
      {/* Curtain preview & interactive slider */}
      <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border bg-slate-950 flex flex-col items-center justify-center select-none shadow-inner">
        {/* Underneath 'Board' Mock Content */}
        <div className="absolute inset-0 p-4 flex flex-col justify-center items-center text-center opacity-80 pointer-events-none">
          <span className="text-xs font-mono font-bold text-amber-400">Classroom Problem #4</span>
          <p className="text-sm font-semibold text-white mt-1">Solve: 2x² + 5x - 12 = 0</p>
          <span className="text-xs text-emerald-400 font-mono mt-2 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
            Solution: x = 1.5 or x = -4
          </span>
        </div>

        {/* The Drape Layer */}
        {coveredPercent > 0 && (
          <div
            className="absolute top-0 left-0 transition-all duration-75 shadow-2xl overflow-hidden"
            style={{
              width: direction === "left-right" ? `${coveredPercent}%` : "100%",
              height: direction === "top-down" ? `${coveredPercent}%` : "100%",
              opacity: opacity / 100,
              backgroundImage: `url(${selectedCurtain.file})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: selectedCurtain.color,
            }}
          >
            {/* Cord Edge Border */}
            <div
              className={`absolute bg-amber-400/80 shadow-md ${
                direction === "top-down"
                  ? "bottom-0 left-0 right-0 h-2 cursor-ns-resize"
                  : "right-0 top-0 bottom-0 w-2 cursor-ew-resize"
              }`}
            />
          </div>
        )}

        {/* Percentage Badge */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/20">
          Cover: {coveredPercent}%
        </div>
      </div>

      {/* Reveal Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>Closed</span>
          <span className="font-semibold text-foreground">
            {coveredPercent === 0 ? "Fully Revealed" : `${coveredPercent}% Covered`}
          </span>
          <span>Open</span>
        </div>
        <Slider
          value={[revealPercent]}
          min={0}
          max={100}
          step={1}
          onValueChange={(val) => setRevealPercent(val[0])}
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between gap-1 pt-1">
        {/* Toggle Direction */}
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5 flex-1"
          onClick={() => setDirection(direction === "top-down" ? "left-right" : "top-down")}
        >
          {direction === "top-down" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          {direction === "top-down" ? "Top-Down" : "Left-Right"}
        </Button>

        {/* Full Open / Close */}
        <Button
          variant="secondary"
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={() => setRevealPercent(revealPercent === 100 ? 0 : 100)}
        >
          {revealPercent === 100 ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealPercent === 100 ? "Conceal" : "Reveal All"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8 px-2"
          onClick={() => setRevealPercent(50)}
          title="Reset to 50%"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Fabric Theme Palette */}
      <div className="space-y-1.5 pt-1 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Palette className="h-3.5 w-3.5" />
          <span>Curtain Color: {selectedCurtain.name}</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CURTAINS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCurtain(c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform active:scale-90 shrink-0 ${
                selectedCurtain.id === c.id ? "scale-110 border-foreground shadow" : "border-transparent opacity-80"
              }`}
              style={{ backgroundColor: c.color }}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
