import React, { useState } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { getSmartBoardProfile } from "@/lib/whiteboard/smartBoardProfiles";
import {
  Hand,
  Pen,
  Highlighter,
  Eraser,
  MousePointer2,
  Type,
  Shapes,
  MoreHorizontal,
  Check,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SHAPES_2D, DIAGRAMS_3D, PEN_STYLES, COLOR_CATEGORIES } from "@/components/whiteboard/Toolbar";
import { HandwritingSettings } from "@/components/whiteboard/HandwritingSettings";
import type { ShapeType, ToolId, TextObject } from "@/lib/whiteboard/types";
import { useInk, findLanguage } from "@/lib/ink/recognizer";
import { toast } from "sonner";

interface SmartBoardSideDockProps {
  side: "left" | "right";
  onOpenMore?: () => void;
  onOpenWidgets?: () => void;
}

const HIGHLIGHTER_COLORS = [
  { name: "Yellow", value: "#fef08a", bg: "bg-yellow-200" },
  { name: "Green", value: "#86efac", bg: "bg-green-200" },
  { name: "Cyan", value: "#67e8f9", bg: "bg-cyan-200" },
  { name: "Pink", value: "#f472b6", bg: "bg-pink-300" },
  { name: "Orange", value: "#fed7aa", bg: "bg-orange-200" },
  { name: "Purple", value: "#e9d5ff", bg: "bg-purple-200" },
];

const PEN_SIZE_PRESETS = [
  { label: "Fine", value: 3, lineH: "h-1" },
  { label: "Medium", value: 7, lineH: "h-2" },
  { label: "Bold", value: 14, lineH: "h-3.5" },
  { label: "Extra bold", value: 24, lineH: "h-5" },
];

const HIGHLIGHTER_SIZE_PRESETS = [
  { label: "Fine", value: 12 },
  { label: "Medium", value: 24 },
  { label: "Broad", value: 36 },
];

const TEXT_SIZE_PRESETS = [
  { label: "Body", value: 18 },
  { label: "Medium", value: 24 },
  { label: "Large", value: 32 },
  { label: "Title", value: 48 },
  { label: "Banner", value: 64 },
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
    camera,
    addObject,
    pushHistory,
    clearPage,
    eraseStrokes,
    undo,
    pages,
    activePageId,
    autoSnapEnabled,
    setAutoSnapEnabled,
  } = useWhiteboard();

  const { language, setLangPickerOpen } = useInk();

  const activePage = pages.find((p) => p.id === activePageId);
  const isDark =
    activePage?.background === "blackboard" ||
    activePage?.background === "oled" ||
    activePage?.background === "dark";

  const profile = getSmartBoardProfile(panelSize);
  const targetSizePx = Math.max(64, profile.minTouchTargetPx);

  const [verticalAlign, setVerticalAlign] = useState<"mid" | "top" | "bottom">("mid");
  const [movePopoverOpen, setMovePopoverOpen] = useState(false);
  const [penPopoverOpen, setPenPopoverOpen] = useState(false);
  const [highlightPopoverOpen, setHighlightPopoverOpen] = useState(false);
  const [eraserPopoverOpen, setEraserPopoverOpen] = useState(false);
  const [selectPopoverOpen, setSelectPopoverOpen] = useState(false);
  const [textPopoverOpen, setTextPopoverOpen] = useState(false);
  const [shapePopoverOpen, setShapePopoverOpen] = useState(false);

  // Sub-palette selection for Pen Colour tab
  const [colorPaletteTab, setColorPaletteTab] = useState<"bright" | "soft" | "chalk">("bright");
  const [shapeTab, setShapeTab] = useState<"common" | "2d" | "3d">("common");

  // Pen tool family check
  const isPenFamily =
    tool === "pen" ||
    tool === "fountain" ||
    tool === "brush" ||
    tool === "marker" ||
    tool === "pencil" ||
    tool === "neon" ||
    tool === "crayon" ||
    tool === "glitter" ||
    tool === "rainbow" ||
    tool === "dashed" ||
    tool === "dotted" ||
    tool === "parallel";

  const handleToolClick = (
    targetTool: "pan" | "pen" | "highlighter" | "eraser" | "select" | "text" | "shape"
  ) => {
    if (targetTool === "pan") {
      if (tool === "pan") setMovePopoverOpen((prev) => !prev);
      else setTool("pan");
    } else if (targetTool === "pen") {
      if (isPenFamily) setPenPopoverOpen((prev) => !prev);
      else setTool("pen");
    } else if (targetTool === "highlighter") {
      if (tool === "highlighter") setHighlightPopoverOpen((prev) => !prev);
      else setTool("highlighter");
    } else if (targetTool === "eraser") {
      if (tool === "eraser-object" || tool === "eraser-pixel") {
        setEraserPopoverOpen((prev) => !prev);
      } else {
        setTool("eraser-object");
      }
    } else if (targetTool === "select") {
      if (tool === "select" || tool === "lasso") {
        setSelectPopoverOpen((prev) => !prev);
      } else {
        setTool("select");
      }
    } else if (targetTool === "text") {
      if (tool === "text") setTextPopoverOpen((prev) => !prev);
      else setTool("text");
    } else if (targetTool === "shape") {
      if (tool === "shape") setShapePopoverOpen((prev) => !prev);
      else setTool("shape");
    }
  };

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

  const insertTextBox = (fontSize: number = 24, bg?: string) => {
    const cx = (-camera.x + window.innerWidth / 2) / camera.zoom;
    const cy = (-camera.y + window.innerHeight / 2) / camera.zoom;
    const t: TextObject = {
      id: Math.random().toString(36).slice(2, 10),
      kind: "text",
      x: Math.round(cx - 140),
      y: Math.round(cy - 40),
      w: 280,
      h: 80,
      text: "Type text here",
      color: isDark && color === "#111827" ? "#ffffff" : color,
      fontSize,
      bg,
    };
    addObject(t);
    pushHistory();
    setTextPopoverOpen(false);
    toast.success("Text box added to board");
  };

  const handleClearPage = () => {
    if (!activePage || activePage.objects.length === 0) {
      toast("This page is already empty");
      return;
    }
    clearPage();
    pushHistory();
    setEraserPopoverOpen(false);
    toast("Page cleared", {
      description: "Tap Undo to bring it back.",
      action: {
        label: "Undo",
        onClick: () => undo(),
      },
      duration: 6000,
    });
  };

  const handleEraseInkOnly = () => {
    if (!activePage || activePage.objects.length === 0) return;
    eraseStrokes();
    pushHistory();
    setEraserPopoverOpen(false);
    toast("Erased ink drawings & handwriting", {
      description: "Text boxes, sticky notes and images were kept.",
      action: {
        label: "Undo",
        onClick: () => undo(),
      },
      duration: 5000,
    });
  };

  const cycleDockPosition = () => {
    setVerticalAlign((prev) => {
      if (prev === "mid") return "top";
      if (prev === "top") return "bottom";
      return "mid";
    });
  };

  const isLeft = side === "left";

  return (
    <aside
      aria-label={`${side} Smart Board Dock`}
      className={cn(
        "pointer-events-auto select-none absolute z-40 flex flex-col items-center gap-2 rounded-2xl p-2 shadow-2xl backdrop-blur-md transition-all duration-300 motion-reduce:transition-none",
        isDark
          ? "bg-slate-900/95 border border-slate-700/80 text-slate-100"
          : "bg-card/95 border border-border/80 text-foreground",
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
      {/* Position Shift Handle */}
      <button
        onClick={cycleDockPosition}
        type="button"
        aria-label={`Dock position: ${verticalAlign}. Tap to shift.`}
        className="group flex flex-col items-center justify-center py-1.5 px-3 w-full rounded-lg hover:bg-muted/60 transition cursor-pointer"
        title={`Dock Position: ${verticalAlign.toUpperCase()} (tap to shift position)`}
      >
        <div className="h-1.5 w-8 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-all group-active:scale-95" />
      </button>

      <div className={cn("h-px w-full", isDark ? "bg-slate-700/60" : "bg-border/60")} />

      {/* 1. MOVE / PAN TOOL */}
      <Popover open={movePopoverOpen} onOpenChange={setMovePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("pan")}
            aria-label="Move around board (pan)"
            aria-pressed={tool === "pan"}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "pan"
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background"
                : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Move (pan around board, or tap again for fit/zoom)"
          >
            <Hand className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Move</span>
            {tool === "pan" && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-primary">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          align="start"
          collisionPadding={24}
          className={cn(
            "w-72 max-w-[calc(100vw-2rem)] max-h-[min(80vh,500px)] overflow-y-auto rounded-2xl p-4 shadow-2xl border space-y-3",
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border"
          )}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Move Around Board
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setTool("pan");
                setMovePopoverOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between p-3 rounded-xl border text-left transition active:scale-98",
                tool === "pan"
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border hover:bg-muted text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Hand className="h-5 w-5" />
                <span className="text-xs font-semibold">1-Finger Drag</span>
              </div>
              {tool === "pan" && <Check className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("slate:fit-to-content"));
                setMovePopoverOpen(false);
              }}
              className="flex w-full items-center gap-2.5 p-3 rounded-xl border border-border hover:bg-muted text-foreground text-left transition active:scale-98"
            >
              <Maximize2 className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Fit to Content</span>
                <span className="text-[11px] text-muted-foreground">Zoom to see all work</span>
              </div>
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("slate:zoom-reset"));
                setMovePopoverOpen(false);
              }}
              className="flex w-full items-center gap-2.5 p-3 rounded-xl border border-border hover:bg-muted text-foreground text-left transition active:scale-98"
            >
              <RotateCcw className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold">100% Zoom</span>
                <span className="text-[11px] text-muted-foreground">Reset canvas view</span>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 2. PEN TOOL (Flyout with 4 Tabs: Colour, Size, Style, Writing) */}
      <Popover open={penPopoverOpen} onOpenChange={setPenPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("pen")}
            aria-label="Pen and writing tools"
            aria-pressed={isPenFamily}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              isPenFamily
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background"
                : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Pen (tap again for colour, size, style, writing)"
          >
            <Pen className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Pen</span>
            {/* Active Color Pip with border */}
            <span
              className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ring-1 ring-black/20"
              style={{ backgroundColor: color }}
            />
            {isPenFamily && (
              <span className="absolute top-1.5 left-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-foreground text-primary">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          align="center"
          collisionPadding={24}
          className={cn(
            "w-84 max-w-[calc(100vw-2rem)] max-h-[min(80vh,540px)] overflow-y-auto rounded-2xl p-3 shadow-2xl border",
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border"
          )}
        >
          <Tabs defaultValue="colour" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-3">
              <TabsTrigger value="colour" className="text-xs">Colour</TabsTrigger>
              <TabsTrigger value="size" className="text-xs">Size</TabsTrigger>
              <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
              <TabsTrigger value="writing" className="text-xs">Writing</TabsTrigger>
            </TabsList>

            {/* TAB 1: COLOUR */}
            <TabsContent value="colour" className="space-y-3">
              <div className="flex gap-1 p-0.5 bg-muted rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setColorPaletteTab("bright")}
                  className={cn(
                    "flex-1 py-1 rounded-md transition",
                    colorPaletteTab === "bright" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Bright
                </button>
                <button
                  type="button"
                  onClick={() => setColorPaletteTab("soft")}
                  className={cn(
                    "flex-1 py-1 rounded-md transition",
                    colorPaletteTab === "soft" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Soft
                </button>
                <button
                  type="button"
                  onClick={() => setColorPaletteTab("chalk")}
                  className={cn(
                    "flex-1 py-1 rounded-md transition",
                    colorPaletteTab === "chalk" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Chalk
                </button>
              </div>

              {/* Color Swatches Grid (Each >= 36px for easy touch hit) */}
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                {(colorPaletteTab === "bright"
                  ? COLOR_CATEGORIES.vivid
                  : colorPaletteTab === "soft"
                  ? COLOR_CATEGORIES.pastel
                  : COLOR_CATEGORIES.chalk
                ).map((c) => {
                  const isSelected = color.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        if (!isPenFamily) setTool("pen");
                      }}
                      aria-label={`Color ${c}`}
                      className={cn(
                        "h-10 w-full rounded-xl border flex items-center justify-center transition-transform active:scale-90",
                        isSelected
                          ? "ring-4 ring-primary ring-offset-2 scale-105 border-primary shadow-sm"
                          : "border-black/10 dark:border-white/10 hover:scale-102"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {isSelected && (
                        <Check
                          className={cn(
                            "h-4 w-4 drop-shadow stroke-[3]",
                            c === "#ffffff" || c.startsWith("#fee") || c.startsWith("#fef") || c.startsWith("#dcf") || c.startsWith("#e0f")
                              ? "text-black"
                              : "text-white"
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Colour Picker Input */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground">Custom colour</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      if (!isPenFamily) setTool("pen");
                    }}
                    className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0"
                    title="Choose custom colour"
                  />
                  <span className="text-xs font-mono text-muted-foreground uppercase">{color}</span>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: SIZE */}
            <TabsContent value="size" className="space-y-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Presets</p>
                <div className="grid grid-cols-4 gap-2">
                  {PEN_SIZE_PRESETS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setSize(s.value);
                        if (!isPenFamily) setTool("pen");
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all active:scale-95",
                        size === s.value
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <div className={cn("w-8 rounded-full bg-foreground", s.lineH)} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fine-tune Thickness</span>
                  <span className="text-xs font-bold font-mono">{size} px</span>
                </div>
                <Slider
                  value={[size]}
                  min={1}
                  max={36}
                  step={1}
                  onValueChange={(val) => setSize(val[0])}
                />
              </div>
            </TabsContent>

            {/* TAB 3: STYLE */}
            <TabsContent value="style" className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pen Styles</p>
              <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                {PEN_STYLES.filter((p) => p.id !== "tape" && p.id !== "frame").map((style) => {
                  const Icon = style.icon;
                  const isCurrent = tool === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setTool(style.id);
                        setPenPopoverOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition active:scale-95",
                        isCurrent
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-2 ring-primary/40"
                          : "border-border hover:bg-muted text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] text-center font-medium leading-tight">{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 4: WRITING & HANDWRITING */}
            <TabsContent value="writing" className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold">Auto-straighten shapes</div>
                  <div className="text-[11px] text-muted-foreground">Draw a rough shape & hold to straighten</div>
                </div>
                <Switch
                  checked={autoSnapEnabled}
                  onCheckedChange={(checked) => setAutoSnapEnabled(checked)}
                  aria-label="Auto-straighten shapes"
                />
              </div>

              {/* Complete Handwriting Settings Panel (Live text preview on/off, auto-type, translate, fonts & language) */}
              <div className="rounded-xl border border-border p-2 bg-card">
                <HandwritingSettings className="p-0 border-0 bg-transparent dark:bg-transparent" />
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      {/* 3. HIGHLIGHTER TOOL */}
      <Popover open={highlightPopoverOpen} onOpenChange={setHighlightPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("highlighter")}
            aria-label="Highlighter"
            aria-pressed={tool === "highlighter"}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "highlighter"
                ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-400 ring-offset-2 ring-offset-background"
                : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Highlighter (tap again for colors & thickness)"
          >
            <Highlighter className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Highlight</span>
            {tool === "highlighter" && (
              <span className="absolute top-1.5 left-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-amber-600">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          align="center"
          collisionPadding={24}
          className={cn(
            "w-72 max-w-[calc(100vw-2rem)] max-h-[min(80vh,480px)] overflow-y-auto rounded-2xl p-4 shadow-2xl border space-y-3",
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border"
          )}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Highlighter Colour</p>
            <div className="grid grid-cols-6 gap-2">
              {HIGHLIGHTER_COLORS.map((hc) => (
                <button
                  key={hc.value}
                  type="button"
                  onClick={() => {
                    setColor(hc.value);
                    setTool("highlighter");
                  }}
                  className={cn(
                    "h-10 w-full rounded-xl border flex items-center justify-center transition active:scale-90",
                    hc.bg,
                    color === hc.value ? "ring-2 ring-primary ring-offset-1 border-primary" : "border-black/10"
                  )}
                  title={hc.name}
                >
                  {color === hc.value && <Check className="h-4 w-4 text-black" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Highlighter Size</p>
            <div className="grid grid-cols-3 gap-2">
              {HIGHLIGHTER_SIZE_PRESETS.map((hs) => (
                <button
                  key={hs.value}
                  type="button"
                  onClick={() => {
                    setSize(hs.value);
                    setTool("highlighter");
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition active:scale-95",
                    size === hs.value ? "border-amber-500 bg-amber-500/10 text-amber-600 font-bold" : "border-border hover:bg-muted"
                  )}
                >
                  {hs.label}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 4. ERASER TOOL (Options: Part, Whole, Ink only, Clear page) */}
      <Popover open={eraserPopoverOpen} onOpenChange={setEraserPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("eraser")}
            aria-label="Eraser"
            aria-pressed={tool === "eraser-object" || tool === "eraser-pixel"}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "eraser-object" || tool === "eraser-pixel"
                ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-400 ring-offset-2 ring-offset-background"
                : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Eraser (or wipe canvas with palm / fist)"
          >
            <Eraser className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Eraser</span>
            {(tool === "eraser-object" || tool === "eraser-pixel") && (
              <span className="absolute top-1.5 left-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-rose-600">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          align="center"
          collisionPadding={24}
          className={cn(
            "w-72 max-w-[calc(100vw-2rem)] max-h-[min(80vh,480px)] overflow-y-auto rounded-2xl p-4 shadow-2xl border space-y-2",
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border"
          )}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Eraser Options</p>

          <button
            onClick={() => {
              setTool("eraser-pixel");
              setEraserPopoverOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
              tool === "eraser-pixel"
                ? "border-rose-500 bg-rose-500/10 text-rose-600 font-bold"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold">Part of a line</span>
              <span className="text-[11px] text-muted-foreground">Rub out small mistakes precision-style</span>
            </div>
            {tool === "eraser-pixel" && <Check className="h-4 w-4 text-rose-600" />}
          </button>

          <button
            onClick={() => {
              setTool("eraser-object");
              setEraserPopoverOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
              tool === "eraser-object"
                ? "border-rose-500 bg-rose-500/10 text-rose-600 font-bold"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold">Whole stroke</span>
              <span className="text-[11px] text-muted-foreground">One tap wipes entire stroke</span>
            </div>
            {tool === "eraser-object" && <Check className="h-4 w-4 text-rose-600" />}
          </button>

          <div className="h-px bg-border my-1" />

          <button
            onClick={handleEraseInkOnly}
            className="flex w-full items-center justify-between p-2.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-left transition active:scale-98"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Ink only</span>
              <span className="text-[11px] text-muted-foreground">Keep text boxes, stickies & images</span>
            </div>
          </button>

          <button
            onClick={handleClearPage}
            className="flex w-full items-center justify-between p-2.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/10 text-left transition active:scale-98"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-rose-600">Clear page</span>
              <span className="text-[11px] text-muted-foreground">Empty board with instant Undo</span>
            </div>
          </button>
        </PopoverContent>
      </Popover>

      {/* 5. SELECT TOOL (Options: Tap to select, Lasso) */}
      <Popover open={selectPopoverOpen} onOpenChange={setSelectPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("select")}
            aria-label="Select tool"
            aria-pressed={tool === "select" || tool === "lasso"}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "select" || tool === "lasso"
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background"
                : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Select (tap again for Lasso / Tap mode)"
          >
            <MousePointer2 className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Select</span>
            {(tool === "select" || tool === "lasso") && (
              <span className="absolute top-1.5 left-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-foreground text-primary">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          align="center"
          collisionPadding={24}
          className={cn(
            "w-64 max-w-[calc(100vw-2rem)] max-h-[min(80vh,480px)] overflow-y-auto rounded-2xl p-4 shadow-2xl border space-y-2",
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border"
          )}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Selection Mode</p>
          <button
            onClick={() => {
              setTool("select");
              setSelectPopoverOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
              tool === "select"
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold">Tap to Select</span>
              <span className="text-[11px] text-muted-foreground">Tap an object or drag box</span>
            </div>
            {tool === "select" && <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              setTool("lasso");
              setSelectPopoverOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
              tool === "lasso"
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold">Lasso Select</span>
              <span className="text-[11px] text-muted-foreground">Draw a loop around items</span>
            </div>
            {tool === "lasso" && <Check className="h-4 w-4" />}
          </button>
        </PopoverContent>
      </Popover>

      {/* 6. TEXT TOOL (Font size, Colour, Background) */}
      <Popover open={textPopoverOpen} onOpenChange={setTextPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("text")}
            aria-label="Text box tool"
            aria-pressed={tool === "text"}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "text"
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background"
                : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Text (tap board to type, or tap again for font size & cards)"
          >
            <Type className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Text</span>
            {tool === "text" && (
              <span className="absolute top-1.5 left-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-foreground text-primary">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          align="end"
          collisionPadding={24}
          className={cn(
            "w-76 max-w-[calc(100vw-2rem)] max-h-[min(80vh,500px)] overflow-y-auto rounded-2xl p-4 shadow-2xl border space-y-3",
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border"
          )}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Text Size & Style</p>

          <div className="grid grid-cols-5 gap-1.5">
            {TEXT_SIZE_PRESETS.map((ts) => (
              <button
                key={ts.value}
                onClick={() => insertTextBox(ts.value)}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-border hover:bg-muted text-foreground transition active:scale-95"
              >
                <span className="text-xs font-bold">{ts.value}</span>
                <span className="text-[10px] text-muted-foreground">{ts.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5 pt-1 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Card Background</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => insertTextBox(24, undefined)}
                className="p-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-center transition"
              >
                Transparent
              </button>
              <button
                onClick={() => insertTextBox(24, "#fef08a")}
                className="p-2 rounded-xl border border-yellow-300 bg-yellow-100 text-yellow-900 text-xs font-semibold text-center transition"
              >
                Yellow Card
              </button>
              <button
                onClick={() => insertTextBox(24, "#ffffff")}
                className="p-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold text-center transition"
              >
                White Card
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Or tap anywhere directly on the board to start writing.
          </p>
        </PopoverContent>
      </Popover>

      {/* 7. SHAPES TOOL (Common Shapes + Full Grid + Auto-straighten) */}
      <Popover open={shapePopoverOpen} onOpenChange={setShapePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => handleToolClick("shape")}
            aria-label="Shapes and lines"
            aria-pressed={tool === "shape"}
            className={cn(
              "group relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
              tool === "shape"
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background"
                : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted"
            )}
            style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
            title="Shapes (draw rough shape or tap again to choose)"
          >
            <Shapes className="h-7 w-7" />
            <span className="text-xs font-semibold mt-0.5">Shapes</span>
            {tool === "shape" && (
              <span className="absolute top-1.5 left-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-foreground text-primary">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={isLeft ? "right" : "left"}
          sideOffset={16}
          align="end"
          collisionPadding={24}
          className={cn(
            "w-[26rem] max-w-[calc(100vw-2rem)] max-h-[min(76vh,500px)] flex flex-col rounded-2xl p-3.5 shadow-2xl border space-y-2.5 overflow-hidden",
            isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border"
          )}
        >
          {/* Smart Hold-to-Snap auto-straighten switch */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/50 border border-border shrink-0">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold">Auto-straighten rough shapes</div>
              <div className="text-[10px] text-muted-foreground">Draw and pause to straighten circles, triangles, etc.</div>
            </div>
            <Switch
              checked={autoSnapEnabled}
              onCheckedChange={(checked) => setAutoSnapEnabled(checked)}
            />
          </div>

          {/* Radix Tabs for Categories */}
          <Tabs defaultValue="common" className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 mb-2 shrink-0">
              <TabsTrigger value="common" className="text-xs font-bold">
                Common (12)
              </TabsTrigger>
              <TabsTrigger value="2d" className="text-xs font-bold">
                All 2D ({SHAPES_2D.length})
              </TabsTrigger>
              <TabsTrigger value="3d" className="text-xs font-bold">
                3D Solids ({DIAGRAMS_3D.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: COMMON SHAPES */}
            <TabsContent value="common" className="flex-1 min-h-0 overflow-y-auto mt-0 pr-1 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Tap a shape to insert into center of board:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SHAPES_2D.slice(0, 12).map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => insertShape(s.id as ShapeType)}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border/70 hover:bg-muted active:scale-95 transition"
                    >
                      <Icon className="h-5 w-5 text-foreground" />
                      <span className="text-[10px] font-medium truncate w-full px-1 text-center">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 2: ALL 2D SHAPES */}
            <TabsContent value="2d" className="flex-1 min-h-0 overflow-y-auto mt-0 pr-1 space-y-1.5 pb-2">
              <p className="text-[11px] text-muted-foreground">
                All 30 2D geometric shapes & lines:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SHAPES_2D.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => insertShape(s.id as ShapeType)}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border/70 hover:bg-muted active:scale-95 transition"
                    >
                      <Icon className="h-5 w-5 text-foreground" />
                      <span className="text-[10px] font-medium truncate w-full px-1 text-center">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 3: ALL 3D SOLIDS */}
            <TabsContent value="3d" className="flex-1 min-h-0 overflow-y-auto mt-0 pr-1 space-y-1.5 pb-2">
              <p className="text-[11px] text-muted-foreground">
                All 21 3D geometric solids & wireframes:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {DIAGRAMS_3D.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => insertShape(s.id as ShapeType)}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border/70 hover:bg-muted active:scale-95 transition"
                    >
                      <Icon className="h-5 w-5 text-foreground" />
                      <span className="text-[10px] font-medium truncate w-full px-1 text-center">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      <div className={cn("h-px w-full my-0.5", isDark ? "bg-slate-700/60" : "bg-border/60")} />

      {/* 8. MORE DRAWER BUTTON */}
      <button
        onClick={() => {
          if (onOpenWidgets) onOpenWidgets();
          else if (onOpenMore) onOpenMore();
        }}
        aria-label="More classroom widgets and tools"
        className={cn(
          "flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 font-semibold",
          isDark
            ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
            : "bg-muted/40 text-foreground hover:bg-muted"
        )}
        style={{ width: `${targetSizePx}px`, height: `${targetSizePx}px` }}
        title="More Tools & Classroom Widgets"
      >
        <MoreHorizontal className="h-7 w-7" />
        <span className="text-xs font-semibold mt-0.5">More</span>
      </button>
    </aside>
  );
}
