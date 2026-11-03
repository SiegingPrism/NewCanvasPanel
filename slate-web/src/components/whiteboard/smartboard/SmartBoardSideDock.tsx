import React, { useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { getSmartBoardProfile } from "@/lib/whiteboard/smartBoardProfiles";
import {
  Pen,
  Highlighter,
  Eraser,
  MousePointer2,
  Shapes,
  MoreHorizontal,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpToLine,
  SlidersHorizontal,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SmartBoardSideDockProps {
  side: "left" | "right";
  onOpenMore?: () => void;
  onOpenWidgets?: () => void;
}

const BOARD_COLORS = [
  { name: "Black", value: "#111827", bgClass: "bg-gray-900 border-white/20" },
  { name: "Blue", value: "#2563eb", bgClass: "bg-blue-600 border-blue-400" },
  { name: "Red", value: "#dc2626", bgClass: "bg-red-600 border-red-400" },
  { name: "Green", value: "#16a34a", bgClass: "bg-green-600 border-green-400" },
  { name: "Orange", value: "#ea580c", bgClass: "bg-orange-600 border-orange-400" },
  { name: "Purple", value: "#9333ea", bgClass: "bg-purple-600 border-purple-400" },
  { name: "White", value: "#ffffff", bgClass: "bg-white border-gray-400" },
];

const BOARD_SIZES = [
  { label: "Fine", value: 3, lineH: "h-1" },
  { label: "Medium", value: 7, lineH: "h-2" },
  { label: "Broad", value: 14, lineH: "h-3.5" },
];

export function SmartBoardSideDock({ side, onOpenMore, onOpenWidgets }: SmartBoardSideDockProps) {
  const {
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    panelSize,
    lockBoard,
    setLockBoard,
    reachabilityOffset,
    setReachabilityOffset,
  } = useWhiteboard();

  const profile = getSmartBoardProfile(panelSize);
  const [verticalAlign, setVerticalAlign] = useState<"mid" | "top" | "bottom">("mid");
  const [penPopoverOpen, setPenPopoverOpen] = useState(false);
  const [shapePopoverOpen, setShapePopoverOpen] = useState(false);

  const targetSizePx = Math.max(64, profile.minTouchTargetPx);

  const handleToolClick = (selectedTool: "pen" | "highlighter" | "eraser-object" | "select" | "shape") => {
    if (selectedTool === "pen") {
      if (tool === "pen") {
        setPenPopoverOpen((prev) => !prev);
      } else {
        setTool("pen");
      }
    } else if (selectedTool === "shape") {
      if (tool === "shape") {
        setShapePopoverOpen((prev) => !prev);
      } else {
        setTool("shape");
      }
    } else {
      setTool(selectedTool);
    }
  };

  const toggleReachability = () => {
    if (reachabilityOffset > 0) {
      setReachabilityOffset(0);
    } else {
      setReachabilityOffset(profile.recommendedPullDownOffset || 0.25);
    }
  };

  const isLeft = side === "left";

  return (
    <aside
      aria-label={`${side} Smart Board Dock`}
      className={cn(
        "pointer-events-auto select-none absolute z-40 flex flex-col items-center gap-2 rounded-2xl bg-card/95 p-2 shadow-2xl backdrop-blur-md border border-border/80 transition-all duration-300",
        isLeft ? "left-3" : "right-3",
        verticalAlign === "mid" && "top-1/2 -translate-y-1/2",
        verticalAlign === "top" && "top-16",
        verticalAlign === "bottom" && "bottom-24"
      )}
      style={{
        width: `${targetSizePx + 16}px`,
      }}
    >
      {/* Dock Vertical Height Shifter for Teacher Height Adaptability */}
      <div className="flex w-full items-center justify-between px-1 text-muted-foreground/60 text-[10px]">
        <button
          onClick={() => setVerticalAlign((prev) => (prev === "bottom" ? "mid" : "top"))}
          title="Move dock higher"
          className="rounded p-1 hover:bg-accent hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="font-semibold uppercase tracking-wider">{side[0]}</span>
        <button
          onClick={() => setVerticalAlign((prev) => (prev === "top" ? "mid" : "bottom"))}
          title="Move dock lower"
          className="rounded p-1 hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="h-px w-full bg-border" />

      {/* 1. Pen Tool with Quick Flyout */}
      <Popover open={penPopoverOpen} onOpenChange={setPenPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("pen")}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "pen"
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Pen (tap again for colors & stroke thickness)"
          >
            <Pen className="h-7 w-7" />
            <span className="text-[11px] font-semibold mt-0.5">Pen</span>
            {/* Active Color Pip */}
            <span
              className="absolute bottom-1.5 right-1.5 h-3 w-3 rounded-full border border-white/50 shadow-sm"
              style={{ backgroundColor: color }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          className="w-80 rounded-2xl p-4 shadow-2xl bg-card border border-border"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pen Color</p>
              <div className="grid grid-cols-4 gap-2.5">
                {BOARD_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      setColor(c.value);
                      setTool("pen");
                    }}
                    className={cn(
                      "flex h-12 w-full items-center justify-center rounded-xl border-2 transition-transform active:scale-90",
                      c.bgClass,
                      color === c.value ? "ring-4 ring-primary ring-offset-2 scale-105" : "border-border"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pen Size</p>
              <div className="grid grid-cols-3 gap-2">
                {BOARD_SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setSize(s.value);
                      setTool("pen");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all",
                      size === s.value ? "border-primary bg-primary/10 text-primary font-bold" : "border-border hover:bg-muted"
                    )}
                  >
                    <div className={cn("w-10 rounded-full bg-foreground", s.lineH)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 2. Highlighter Tool */}
      <button
        onClick={() => handleToolClick("highlighter")}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
          tool === "highlighter"
            ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50"
            : "bg-muted/40 text-foreground hover:bg-muted"
        )}
        style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
        title="Highlighter"
      >
        <Highlighter className="h-7 w-7" />
        <span className="text-[11px] font-semibold mt-0.5">Highlighter</span>
      </button>

      {/* 3. Eraser Tool */}
      <button
        onClick={() => handleToolClick("eraser-object")}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
          tool === "eraser-object" || tool === "eraser-pixel"
            ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50"
            : "bg-muted/40 text-foreground hover:bg-muted"
        )}
        style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
        title="Eraser (or wipe canvas with palm / fist)"
      >
        <Eraser className="h-7 w-7" />
        <span className="text-[11px] font-semibold mt-0.5">Eraser</span>
      </button>

      {/* 4. Select / Move Tool */}
      <button
        onClick={() => handleToolClick("select")}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
          tool === "select"
            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
            : "bg-muted/40 text-foreground hover:bg-muted"
        )}
        style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
        title="Select / Move"
      >
        <MousePointer2 className="h-7 w-7" />
        <span className="text-[11px] font-semibold mt-0.5">Select</span>
      </button>

      {/* 5. Shapes Tool */}
      <button
        onClick={() => handleToolClick("shape")}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
          tool === "shape"
            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
            : "bg-muted/40 text-foreground hover:bg-muted"
        )}
        style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
        title="Shapes"
      >
        <Shapes className="h-7 w-7" />
        <span className="text-[11px] font-semibold mt-0.5">Shapes</span>
      </button>

      <div className="h-px w-full bg-border my-1" />

      {/* Reachability Pull-Down Mode (for tall 75", 86", 98", 110" panels) */}
      <button
        onClick={toggleReachability}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl transition-all active:scale-95",
          reachabilityOffset > 0
            ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-400"
            : "bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        style={{ width: `${targetSizePx}px`, height: `${Math.round(targetSizePx * 0.85)}px` }}
        title="Reachability Pull-down (lowers the top canvas for shorter teachers/students)"
      >
        {reachabilityOffset > 0 ? (
          <ArrowUpToLine className="h-5 w-5" />
        ) : (
          <ArrowDownToLine className="h-5 w-5" />
        )}
        <span className="text-[10px] font-medium mt-0.5">
          {reachabilityOffset > 0 ? "Reset" : "Lower"}
        </span>
      </button>

      {/* Lock Board (Freezes Pan & Zoom for classroom stability) */}
      <button
        onClick={() => setLockBoard(!lockBoard)}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl transition-all active:scale-95",
          lockBoard
            ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-400"
            : "bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        style={{ width: `${targetSizePx}px`, height: `${Math.round(targetSizePx * 0.85)}px` }}
        title={lockBoard ? "Board is Locked (Pan & Zoom disabled)" : "Lock Board (prevent accidental pans/zooms)"}
      >
        {lockBoard ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
        <span className="text-[10px] font-medium mt-0.5">{lockBoard ? "Locked" : "Lock"}</span>
      </button>

      {/* "More" Drawer Button */}
      <button
        onClick={() => {
          if (onOpenWidgets) onOpenWidgets();
          else if (onOpenMore) onOpenMore();
        }}
        className="flex flex-col items-center justify-center rounded-xl bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
        style={{ width: `${targetSizePx}px`, height: `${Math.round(targetSizePx * 0.85)}px` }}
        title="More Tools & Classroom Widgets"
      >
        <MoreHorizontal className="h-6 w-6" />
        <span className="text-[10px] font-medium mt-0.5">More</span>
      </button>
    </aside>
  );
}

