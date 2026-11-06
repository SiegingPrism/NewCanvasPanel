import React, { useEffect, useState } from "react";
import { BoardHelpOverlay } from "./BoardHelpOverlay";
import { BoardTourDialog } from "./BoardTourDialog";
import { DocumentImportDialog } from "./DocumentImportDialog";
import { NewPagePickerContent } from "./NewPagePickerContent";
import { useWhiteboard } from "@/lib/whiteboard/store";
import {
  getSmartBoardProfile,
  SMART_BOARD_PROFILES,
  PanelDiagonal,
} from "@/lib/whiteboard/smartBoardProfiles";
import type { PageBackground } from "@/lib/whiteboard/types";
import {
  Undo2,
  HelpCircle,
  Redo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  Unlock,
  ArrowDownToLine,
  ArrowUpToLine,
  Columns,
  Sparkles,
  KeyRound,
  Save,
  Presentation,
  FileText,
  Grid,
  AlignJustify,
  Music,
  MapPin,
  PenTool,
  Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportLessonFile } from "@/lib/whiteboard/lessonFiles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SmartBoardCornerControlsProps {
  onOpenSorter?: () => void;
}

function LaserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m5.6 5.6 2.1 2.1" />
      <path d="m16.3 16.3 2.1 2.1" />
      <path d="m5.6 18.4 2.1-2.1" />
      <path d="m16.3 7.7 2.1-2.1" />
    </svg>
  );
}

export function SmartBoardCornerControls({ onOpenSorter }: SmartBoardCornerControlsProps) {
  const {
    undo,
    redo,
    history,
    historyIndex,
    clearPage,
    pushHistory,
    pages,
    activePageId,
    nextPage,
    prevPage,
    addPage,
    panelSize,
    setPanelSize,
    boardMode,
    simpleMode,
    setSimpleMode,
    splitBoardZones,
    setSplitBoardZones,
    reachabilityOffset,
    setReachabilityOffset,
    lockBoard,
    setLockBoard,
    boardDockSide,
    setBoardDockSide,
    tool,
    setTool,
  } = useWhiteboard();

  const profile = getSmartBoardProfile(panelSize);
  const targetPx = Math.max(64, profile.minTouchTargetPx);
  const rawPageIndex = pages.findIndex((p) => p.id === activePageId);
  const activePageIndex = rawPageIndex >= 0 ? rawPageIndex : 0;
  const activePage = pages[activePageIndex] || pages[0];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const isDark =
    activePage?.background === "blackboard" ||
    activePage?.background === "oled" ||
    activePage?.background === "dark";

  const isLaserActive = tool === "laser";

  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [boardPopoverOpen, setBoardPopoverOpen] = useState(false);

  // Show the short board tour automatically the first time Board mode is used on this device.
  useEffect(() => {
    if (!boardMode) return;
    try {
      if (!localStorage.getItem("slate_board_tour_seen")) setTourOpen(true);
    } catch {
      /* storage unavailable: skip auto tour */
    }
  }, [boardMode]);

  useEffect(() => {
    const handleHelp = () => setHelpOpen(true);
    window.addEventListener("slate:open-help", handleHelp);
    return () => window.removeEventListener("slate:open-help", handleHelp);
  }, []);

  const handleTourChange = (open: boolean) => {
    setTourOpen(open);
    if (!open) {
      try {
        localStorage.setItem("slate_board_tour_seen", "1");
      } catch {
        /* ignore */
      }
    }
  };

  const handleClear = () => {
    if (!activePage || activePage.objects.length === 0) {
      toast("This page is already empty");
      return;
    }
    clearPage();
    pushHistory();
    toast("Page cleared", {
      description: "Tap Undo to bring it back.",
      action: {
        label: "Undo",
        onClick: () => undo(),
      },
      duration: 6000,
    });
  };

  const toggleReachability = () => {
    if (reachabilityOffset > 0) {
      setReachabilityOffset(0);
      toast("Board restored to standard height");
    } else {
      setReachabilityOffset(profile.recommendedPullDownOffset || 0.25);
      toast("Board lowered for easy reach");
    }
  };

  const cycleSplitZones = () => {
    const nextZones = splitBoardZones >= profile.maxSplitZones ? 1 : splitBoardZones + 1;
    setSplitBoardZones(nextZones);
    toast(nextZones === 1 ? "Full Board" : `Split Board: ${nextZones} Zones Active`, {
      description:
        nextZones === 1 ? "Single workspace" : `${nextZones} students can solve side-by-side`,
    });
  };

  const toggleLaser = () => {
    if (tool === "laser") {
      setTool("pen");
    } else {
      setTool("laser");
      toast("Laser pointer active", {
        description: "Point with finger or stylus to guide students.",
      });
    }
  };

  return (
    <>
      {/* --- BOTTOM-LEFT CORNER: Action Controls (Undo, Redo, Clear, Board settings, Help) --- */}
      <div
        className={cn(
          "pointer-events-auto select-none absolute bottom-4 left-4 z-40 flex items-center gap-2 rounded-2xl p-2 shadow-2xl backdrop-blur-md border transition-all duration-300",
          isDark
            ? "bg-slate-900/95 border-slate-700/80 text-slate-100"
            : "bg-card/95 border-border/80 text-foreground",
        )}
      >
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo last action"
          style={{ height: `${targetPx}px`, width: `${targetPx}px` }}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
            canUndo
              ? isDark
                ? "bg-slate-800/80 text-slate-100 hover:bg-slate-700"
                : "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground",
          )}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-7 w-7" />
          <span className="text-xs font-bold">Undo</span>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo action"
          style={{ height: `${targetPx}px`, width: `${targetPx}px` }}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
            canRedo
              ? isDark
                ? "bg-slate-800/80 text-slate-100 hover:bg-slate-700"
                : "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground",
          )}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-7 w-7" />
          <span className="text-xs font-bold">Redo</span>
        </button>

        <div className={cn("h-10 w-px mx-1", isDark ? "bg-slate-700/80" : "bg-border/80")} />

        {/* Clear Page with Undo Toast */}
        <button
          onClick={handleClear}
          aria-label="Clear page"
          style={{ height: `${targetPx}px`, minWidth: `${targetPx}px` }}
          className="flex px-3 flex-col items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-95 font-medium"
          title="Clear Board (single tap with instant undo)"
        >
          <Trash2 className="h-6 w-6" />
          <span className="text-xs font-bold">Clear</span>
        </button>

        {/* Help: labels every part of the screen in plain words */}
        <button
          onClick={() => setHelpOpen(true)}
          aria-label="Help: what each tool does"
          style={{ height: `${targetPx}px`, width: `${targetPx}px` }}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 font-medium",
            isDark
              ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
              : "bg-muted/40 text-foreground hover:bg-muted",
          )}
          title="Help: what does each button do? (?)"
        >
          <HelpCircle className="h-6 w-6" />
          <span className="text-xs font-bold">Help</span>
        </button>

        <div className={cn("h-10 w-px mx-1", isDark ? "bg-slate-700/80" : "bg-border/80")} />

        {/* Comprehensive Board Settings Popover */}
        <Popover open={boardPopoverOpen} onOpenChange={setBoardPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label="Board settings and controls"
              style={{ height: `${targetPx}px` }}
              className="flex items-center gap-2 rounded-xl bg-primary/10 px-3.5 text-primary hover:bg-primary/20 transition-all active:scale-95"
              title="Board Controls (Lower, Lock, Size, Split, Simple mode)"
            >
              <SlidersHorizontal className="h-6 w-6 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-black tracking-wide">Board</span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {panelSize}&quot; ·{" "}
                  {splitBoardZones > 1
                    ? `${splitBoardZones} zones`
                    : reachabilityOffset > 0
                      ? "Lowered"
                      : lockBoard
                        ? "Frozen"
                        : "Settings"}
                </span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            sideOffset={12}
            collisionPadding={24}
            className={cn(
              "w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-4 shadow-2xl border space-y-3 max-h-[min(78vh,520px)] overflow-y-auto",
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border",
            )}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Board Controls
              </p>
              <p className="text-[11px] text-muted-foreground">
                Reachability, gestures, and classroom settings.
              </p>
            </div>

            <div className="space-y-2">
              {/* Lower the Board Toggle */}
              <button
                type="button"
                onClick={toggleReachability}
                className={cn(
                  "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
                  reachabilityOffset > 0
                    ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold"
                    : "border-border hover:bg-muted text-foreground",
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
                      {reachabilityOffset > 0
                        ? "Lowered (tap to reset)"
                        : "Pulls down top half for easy reach"}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted">
                  {reachabilityOffset > 0 ? "ON" : "OFF"}
                </span>
              </button>

              {/* Freeze / Lock Board Toggle */}
              <button
                type="button"
                onClick={() => setLockBoard(!lockBoard)}
                className={cn(
                  "flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition active:scale-98",
                  lockBoard
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                    : "border-border hover:bg-muted text-foreground",
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

              {/* Dock Side Preference: Both, Left, Right */}
              <div className="pt-2 border-t border-border space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Dock Side (Handedness)
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setBoardDockSide("both")}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-semibold text-center transition",
                      boardDockSide === "both"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border hover:bg-muted text-foreground",
                    )}
                  >
                    Both sides
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardDockSide("left")}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-semibold text-center transition",
                      boardDockSide === "left"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border hover:bg-muted text-foreground",
                    )}
                  >
                    Left only
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardDockSide("right")}
                    className={cn(
                      "p-2 rounded-xl border text-xs font-semibold text-center transition",
                      boardDockSide === "right"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border hover:bg-muted text-foreground",
                    )}
                  >
                    Right only
                  </button>
                </div>
              </div>

              {/* Panel Size Selection */}
              <div className="pt-2 border-t border-border space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Smart Board Size (16:9 4K)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["55", "65", "75", "86", "98", "110"] as PanelDiagonal[]).map((sizeKey) => {
                    const p = SMART_BOARD_PROFILES[sizeKey];
                    const active = panelSize === sizeKey;
                    return (
                      <button
                        key={sizeKey}
                        type="button"
                        onClick={() => {
                          setPanelSize(sizeKey);
                          toast(`Panel set to ${sizeKey}" (${p.widthCm} × ${p.heightCm} cm)`, {
                            description: `Touch targets calibrated to ${p.minTouchTargetPx}px`,
                          });
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl p-2 text-xs font-bold transition-all border",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/60 hover:bg-muted text-foreground",
                        )}
                      >
                        <span>{sizeKey}&quot;</span>
                        <span className="text-[10px] font-normal opacity-80">
                          {Math.round(p.widthInches)}in
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Split Screen Zones */}
              <button
                type="button"
                onClick={cycleSplitZones}
                className="flex w-full items-center justify-between p-2.5 rounded-xl border border-border hover:bg-muted text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Columns className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Split Board</span>
                </div>
                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">
                  {splitBoardZones === 1 ? "Off" : `${splitBoardZones} Zones`}
                </span>
              </button>

              {/* Simple Teacher Mode */}
              <button
                type="button"
                onClick={() => {
                  setSimpleMode(!simpleMode);
                  toast(simpleMode ? "Advanced Mode Enabled" : "Simple Teacher Mode Enabled", {
                    description: simpleMode
                      ? "All widgets & 3D tools visible"
                      : "Clean, distraction-free writing interface",
                  });
                }}
                className="flex w-full items-center justify-between p-2.5 rounded-xl border border-border hover:bg-muted text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium">Simple Teacher Mode</span>
                </div>
                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">
                  {simpleMode ? "On" : "Off"}
                </span>
              </button>

              <div className="h-px bg-border my-1" />

              {/* Teacher Sign In */}
              <button
                type="button"
                onClick={() => {
                  setBoardPopoverOpen(false);
                  window.dispatchEvent(new CustomEvent("slate:open-teacher-login"));
                }}
                className="flex w-full items-center justify-between p-2.5 rounded-xl border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium text-left transition"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  <span className="text-xs">Teacher Sign-In & Sync</span>
                </div>
              </button>

              {/* Save Lesson File */}
              <button
                type="button"
                onClick={() => {
                  setBoardPopoverOpen(false);
                  exportLessonFile("Classroom Lesson", pages);
                }}
                className="flex w-full items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <span className="text-xs">Save Lesson (.slate)</span>
                </div>
              </button>

              {/* Import PPTX or PDF */}
              <button
                type="button"
                onClick={() => {
                  setBoardPopoverOpen(false);
                  setDocImportOpen(true);
                }}
                className="flex w-full items-center justify-between p-2.5 rounded-xl border border-orange-500/30 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Presentation className="h-4 w-4" />
                  <span className="text-xs">Import PowerPoint / PDF</span>
                </div>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* --- BOTTOM-RIGHT CORNER: Laser Pointer, Zoom Group & Page Navigation --- */}
      <div
        className={cn(
          "pointer-events-auto select-none absolute bottom-4 right-4 z-40 flex items-center gap-2 rounded-2xl p-2 shadow-2xl backdrop-blur-md border transition-all duration-300",
          isDark
            ? "bg-slate-900/95 border-slate-700/80 text-slate-100"
            : "bg-card/95 border-border/80 text-foreground",
        )}
      >
        {/* Laser Pointer Button (usable anytime) */}
        <button
          onClick={toggleLaser}
          aria-label="Laser pointer"
          aria-pressed={isLaserActive}
          style={{ height: `${targetPx}px`, width: `${targetPx}px` }}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
            isLaserActive
              ? "bg-rose-600 text-white shadow-lg ring-2 ring-rose-400 ring-offset-2 ring-offset-background animate-pulse"
              : isDark
                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                : "bg-muted/40 text-foreground hover:bg-muted",
          )}
          title="Laser Pointer (L) — Tap to highlight and guide attention"
        >
          <LaserIcon className="h-6 w-6" />
          <span className="text-xs font-bold">Laser</span>
          {isLaserActive && (
            <span className="absolute top-1.5 right-1.5 flex h-3 w-3 rounded-full bg-white shadow-xs" />
          )}
        </button>

        <div className={cn("h-10 w-px mx-0.5", isDark ? "bg-slate-700/80" : "bg-border/80")} />

        {/* Zoom Group: Zoom Out (-), Zoom In (+), Fit (F), 100% (0) */}
        <div
          className={cn(
            "flex items-center gap-1 rounded-xl p-1",
            isDark ? "bg-slate-800/60" : "bg-muted/30",
          )}
        >
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("slate:zoom-out"))}
            aria-label="Zoom out"
            style={{
              height: `${Math.round(targetPx * 0.78)}px`,
              width: `${Math.round(targetPx * 0.78)}px`,
            }}
            className="flex items-center justify-center rounded-lg hover:bg-muted text-foreground transition active:scale-90"
            title="Zoom out (-)"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("slate:zoom-in"))}
            aria-label="Zoom in"
            style={{
              height: `${Math.round(targetPx * 0.78)}px`,
              width: `${Math.round(targetPx * 0.78)}px`,
            }}
            className="flex items-center justify-center rounded-lg hover:bg-muted text-foreground transition active:scale-90"
            title="Zoom in (+)"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("slate:fit-to-content"))}
            aria-label="Fit all content to view"
            style={{
              height: `${Math.round(targetPx * 0.78)}px`,
              width: `${Math.round(targetPx * 0.78)}px`,
            }}
            className="flex items-center justify-center rounded-lg hover:bg-muted text-foreground transition active:scale-90"
            title="Fit content to view (F)"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("slate:zoom-reset"))}
            aria-label="Reset zoom to 100%"
            style={{
              height: `${Math.round(targetPx * 0.78)}px`,
              minWidth: `${Math.round(targetPx * 0.78)}px`,
            }}
            className="flex px-1.5 items-center justify-center rounded-lg hover:bg-muted text-foreground text-xs font-bold transition active:scale-90"
            title="Reset to 100% (0)"
          >
            100%
          </button>
        </div>

        <div className={cn("h-10 w-px mx-0.5", isDark ? "bg-slate-700/80" : "bg-border/80")} />

        {/* Previous Page */}
        <button
          onClick={prevPage}
          disabled={activePageIndex <= 0}
          aria-label="Previous page"
          style={{ height: `${targetPx}px`, width: `${Math.round(targetPx * 0.88)}px` }}
          className={cn(
            "flex items-center justify-center rounded-xl transition-all active:scale-95",
            activePageIndex > 0
              ? isDark
                ? "bg-slate-800/80 text-slate-100 hover:bg-slate-700"
                : "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground",
          )}
          title="Previous Page (Page Up)"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>

        {/* Page Counter Indicator (Large font readable across classroom) */}
        <button
          onClick={() => {
            if (onOpenSorter) onOpenSorter();
          }}
          aria-label="Page sorter: see all slides"
          style={{ height: `${targetPx}px`, minWidth: `${targetPx}px` }}
          className={cn(
            "flex px-3 flex-col items-center justify-center rounded-xl transition-all",
            isDark ? "bg-slate-800/60 hover:bg-slate-700" : "bg-muted/40 hover:bg-muted",
          )}
          title="Page Sorter / Slide Grid"
        >
          <span className="text-xs font-extrabold text-foreground tracking-wider">
            {activePageIndex + 1} / {pages.length}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">Pages</span>
        </button>

        {/* Next Page */}
        <button
          onClick={nextPage}
          disabled={activePageIndex >= pages.length - 1}
          aria-label="Next page"
          style={{ height: `${targetPx}px`, width: `${Math.round(targetPx * 0.88)}px` }}
          className={cn(
            "flex items-center justify-center rounded-xl transition-all active:scale-95",
            activePageIndex < pages.length - 1
              ? isDark
                ? "bg-slate-800/80 text-slate-100 hover:bg-slate-700"
                : "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground",
          )}
          title="Next Page (Page Down)"
        >
          <ChevronRight className="h-7 w-7" />
        </button>

        {/* Add Page with New-Page Template Picker */}
        <Popover open={newPageOpen} onOpenChange={setNewPageOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label="Add new page"
              style={{ height: `${targetPx}px`, width: `${targetPx}px` }}
              className="flex flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95"
              title="Add New Page (N) — tap to choose style"
            >
              <Plus className="h-6 w-6" />
              <span className="text-xs font-bold">New</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            sideOffset={12}
            collisionPadding={24}
            className={cn(
              "w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-3.5 shadow-2xl space-y-2.5 border max-h-[min(78vh,520px)] overflow-y-auto",
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-card border-border",
            )}
          >
            <NewPagePickerContent
              onClose={() => setNewPageOpen(false)}
              onOpenDocImport={() => setDocImportOpen(true)}
              isDark={isDark}
            />
          </PopoverContent>
        </Popover>
      </div>

      <BoardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <BoardTourDialog open={tourOpen} onOpenChange={handleTourChange} />
      <DocumentImportDialog open={docImportOpen} onOpenChange={setDocImportOpen} />
    </>
  );
}
