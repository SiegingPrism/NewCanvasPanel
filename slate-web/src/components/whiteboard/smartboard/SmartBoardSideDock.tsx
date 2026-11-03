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
  SlidersHorizontal,
  Lock,
  Unlock,
  ArrowDownToLine,
  ArrowUpToLine,
  GripHorizontal,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SHAPES_2D, DIAGRAMS_3D } from "@/components/whiteboard/Toolbar";
import type { ShapeType } from "@/lib/whiteboard/types";

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
    camera,
    addObject,
    pushHistory,
    simpleMode,
  } = useWhiteboard();

  // Insert a ready-made shape in the middle of what the teacher is looking at.
  const insertShape = (shapeType: ShapeType) => {
    const isLineLike = ["line", "arrow", "double-arrow", "curved-arrow"].includes(shapeType);
    const w = isLineLike ? 240 : 200;
    const h = isLineLike ? 80 : 200;
    const cx = (-camera.x + window.innerWidth / 2) / camera.zoom;
    const cy = (-camera.y + window.innerHeight / 2) / camera.zoom;
    addObject({
      id: Math.random().toString(36).slice(2, 10),
      kind: "shape",
      shape: shapeType,
      color,
      size: Math.max(3, size),
      x: Math.round(cx - w / 2),
      y: Math.round(cy - h / 2),
      w,
      h,
    });
    pushHistory();
    setShapePopoverOpen(false);
  };

  const profile = getSmartBoardProfile(panelSize);
  const [verticalAlign, setVerticalAlign] = useState<"mid" | "top" | "bottom">("mid");
  const [penPopoverOpen, setPenPopoverOpen] = useState(false);
  const [shapePopoverOpen, setShapePopoverOpen] = useState(false);
  const [boardPopoverOpen, setBoardPopoverOpen] = useState(false);

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

  const cycleDockPosition = () => {
    setVerticalAlign((prev) => {
      if (prev === "mid") return "top";
      if (prev === "top") return "bottom";
      return "mid";
    });
  };

  const isLeft = side === "left";
  const isBoardAdjusted = reachabilityOffset > 0 || lockBoard;

  return (
    <aside
      aria-label={`${side} Smart Board Dock`}
      className={cn(
        "pointer-events-auto select-none absolute z-40 flex flex-col items-center gap-2 rounded-2xl bg-card/95 p-2 shadow-2xl backdrop-blur-md border border-border/80 transition-all duration-300",
        isLeft ? "left-3" : "right-3",
        verticalAlign === "mid" && "top-1/2 -translate-y-1/2",
        verticalAlign === "top" && "top-16",
        verticalAlign === "bottom" && "bottom-32",
        "max-h-[calc(100vh-140px)] overflow-visible"
      )}
      style={{
        width: `${targetSizePx + 16}px`,
      }}
    >
      {/* Sleek Drag Handle Pill Indicator replacing bulky ^ L v header */}
      <button
        onClick={cycleDockPosition}
        type="button"
        className="group flex flex-col items-center justify-center py-1 px-3 w-full rounded-lg hover:bg-muted/60 transition cursor-pointer"
        title={`Dock Position: ${verticalAlign.toUpperCase()} (tap to shift position)`}
      >
        <div className="h-1.5 w-8 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-all group-active:scale-95" />
      </button>

      <div className="h-px w-full bg-border/60" />

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
            <span className="text-xs font-semibold mt-0.5">Pen</span>
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
        <span className="text-xs font-semibold mt-0.5">Highlight</span>
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
        <span className="text-xs font-semibold mt-0.5">Eraser</span>
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
        <span className="text-xs font-semibold mt-0.5">Select</span>
      </button>

      {/* 5. Shapes Tool */}
      <Popover open={shapePopoverOpen} onOpenChange={setShapePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("shape")}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "shape"
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Shapes (draw a rough shape, or tap again to pick one)"
          >
            <Shapes className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Shapes</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          className="w-[26rem] max-w-[calc(100vw-2rem)] rounded-2xl p-4 shadow-2xl bg-card border border-border"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Draw a rough shape and it gets straightened, or tap one below to add it.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SHAPES_2D.slice(0, 12).map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => insertShape(s.id as ShapeType)}
                  className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-border/60 hover:bg-muted active:scale-95 transition"
                >
                  <Icon className="h-7 w-7" />
                  <span className="text-xs font-medium truncate w-full px-1 text-center">{s.label}</span>
                </button>
              );
            })}
          </div>
          {!simpleMode && (
            <>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4 mb-2">3D shapes</p>
              <div className="grid grid-cols-4 gap-2">
                {DIAGRAMS_3D.slice(0, 8).map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => insertShape(s.id as ShapeType)}
                      className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-border/60 hover:bg-muted active:scale-95 transition"
                    >
                      <Icon className="h-7 w-7" />
                      <span className="text-xs font-medium truncate w-full px-1 text-center">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      <div className="h-px w-full bg-border/60 my-0.5" />

      {/* Merged "Board" Button (combines Reachability Lower & Lock into one prominent button) */}
      <Popover open={boardPopoverOpen} onOpenChange={setBoardPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 font-semibold",
              isBoardAdjusted
                ? "bg-primary/15 text-primary border border-primary/30 shadow-xs"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${Math.round(targetSizePx * 0.88)}px` }}
            title="Board Controls (Lower canvas reachability & Lock pan/zoom)"
          >
            {lockBoard ? (
              <Lock className="h-6 w-6 text-amber-500" />
            ) : reachabilityOffset > 0 ? (
              <ArrowDownToLine className="h-6 w-6 text-sky-500" />
            ) : (
              <SlidersHorizontal className="h-6 w-6" />
            )}
            <span className="text-xs font-semibold mt-0.5">Board</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          className="w-72 rounded-2xl p-3 shadow-2xl bg-card border border-border space-y-2.5"
        >
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Smart Board Controls
            </h4>
            <p className="text-xs text-muted-foreground">
              Adjust canvas height and lock gesture movement during class.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {/* Lower / Reachability Toggle */}
            <button
              onClick={() => {
                toggleReachability();
              }}
              className={cn(
                "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
                reachabilityOffset > 0
                  ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold"
                  : "border-border hover:bg-muted text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                {reachabilityOffset > 0 ? (
                  <ArrowUpToLine className="h-5 w-5 text-sky-500 shrink-0" />
                ) : (
                  <ArrowDownToLine className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Lower the board</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {reachabilityOffset > 0 ? "Lowered (tap to reset)" : "Pulls down the top half for easy reach"}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted">
                {reachabilityOffset > 0 ? "ON" : "OFF"}
              </span>
            </button>

            {/* Lock / Freeze Board Toggle */}
            <button
              onClick={() => setLockBoard(!lockBoard)}
              className={cn(
                "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
                lockBoard
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                  : "border-border hover:bg-muted text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                {lockBoard ? (
                  <Lock className="h-5 w-5 text-amber-500 shrink-0" />
                ) : (
                  <Unlock className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Freeze Board</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {lockBoard ? "Pan & Zoom locked" : "Prevent accidental movement"}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted">
                {lockBoard ? "LOCKED" : "FREE"}
              </span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* "More" Drawer Button (Prominent styling matching tools) */}
      <button
        onClick={() => {
          if (onOpenWidgets) onOpenWidgets();
          else if (onOpenMore) onOpenMore();
        }}
        className="flex flex-col items-center justify-center rounded-xl bg-muted/40 text-foreground hover:bg-muted transition-all active:scale-95 font-semibold"
        style={{ width: `${targetSizePx}px`, height: `${Math.round(targetSizePx * 0.88)}px` }}
        title="More Tools & Classroom Widgets"
      >
        <MoreHorizontal className="h-6 w-6" />
        <span className="text-xs font-semibold mt-0.5">More</span>
      </button>
    </aside>
  );
}

