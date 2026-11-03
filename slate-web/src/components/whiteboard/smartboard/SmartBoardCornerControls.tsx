import React from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { getSmartBoardProfile, SMART_BOARD_PROFILES, PanelDiagonal } from "@/lib/whiteboard/smartBoardProfiles";
import {
  Undo2,
  Redo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Tv,
  Monitor,
  Sparkles,
  Columns,
  KeyRound,
  Save,
  FolderOpen,
} from "lucide-react";
import { exportLessonFile } from "@/lib/whiteboard/lessonFiles";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SmartBoardCornerControlsProps {
  onOpenSorter?: () => void;
}

export function SmartBoardCornerControls({ onOpenSorter }: SmartBoardCornerControlsProps) {
  const {
    undo,
    redo,
    history,
    historyIndex,
    clearPage,
    pages,
    activePageId,
    nextPage,
    prevPage,
    addPage,
    panelSize,
    setPanelSize,
    boardMode,
    setBoardMode,
    simpleMode,
    setSimpleMode,
    splitBoardZones,
    setSplitBoardZones,
  } = useWhiteboard();

  const profile = getSmartBoardProfile(panelSize);
  const activePageIndex = pages.findIndex((p) => p.id === activePageId);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleClear = () => {
    clearPage();
    toast("Board Cleared", {
      description: "Tapped Clear. You can restore your writing anytime.",
      action: {
        label: "Undo",
        onClick: () => undo(),
      },
      duration: 6000,
    });
  };

  const cycleSplitZones = () => {
    const nextZones = splitBoardZones >= profile.maxSplitZones ? 1 : splitBoardZones + 1;
    setSplitBoardZones(nextZones);
    toast(nextZones === 1 ? "Full Board" : `Split Board: ${nextZones} Zones Active`, {
      description: nextZones === 1 ? "Single workspace" : `${nextZones} students can solve side-by-side`,
    });
  };

  return (
    <>
      {/* --- BOTTOM-LEFT CORNER: Action Controls (Undo, Redo, Clear, Panel Selector) --- */}
      <div className="pointer-events-auto select-none absolute bottom-4 left-4 z-40 flex items-center gap-2 rounded-2xl bg-card/95 p-2 shadow-2xl backdrop-blur-md border border-border/80">
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={cn(
            "flex h-14 w-14 flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
            canUndo
              ? "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground"
          )}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-7 w-7" />
          <span className="text-[10px] font-bold">Undo</span>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className={cn(
            "flex h-14 w-14 flex-col items-center justify-center rounded-xl font-medium transition-all active:scale-95",
            canRedo
              ? "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground"
          )}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-7 w-7" />
          <span className="text-[10px] font-bold">Redo</span>
        </button>

        <div className="h-10 w-px bg-border/80 mx-1" />

        {/* Clear Page with Undo Toast */}
        <button
          onClick={handleClear}
          className="flex h-14 px-3 flex-col items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-95"
          title="Clear Board (single tap with instant undo)"
        >
          <Trash2 className="h-6 w-6" />
          <span className="text-[10px] font-bold">Clear</span>
        </button>

        <div className="h-10 w-px bg-border/80 mx-1" />

        {/* Panel Dimension Selector & Mode Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-14 items-center gap-2 rounded-xl bg-primary/10 px-3 text-primary hover:bg-primary/20 transition-all active:scale-95"
              title="Panel Size and Smart Board Settings"
            >
              <Tv className="h-6 w-6" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-black tracking-wide">{panelSize}&quot; Board</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {splitBoardZones > 1 ? `${splitBoardZones} Zones` : "Full View"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-72 rounded-2xl p-2 bg-card border border-border shadow-2xl">
            <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Smart Board Size (16:9 4K)
            </DropdownMenuLabel>
            <div className="grid grid-cols-3 gap-1.5 p-1">
              {(["55", "65", "75", "86", "98", "110"] as PanelDiagonal[]).map((sizeKey) => {
                const p = SMART_BOARD_PROFILES[sizeKey];
                const active = panelSize === sizeKey;
                return (
                  <button
                    key={sizeKey}
                    onClick={() => {
                      setPanelSize(sizeKey);
                      toast(`Panel set to ${sizeKey}" (${p.widthCm} × ${p.heightCm} cm)`, {
                        description: `Touch targets calibrated to ${p.minTouchTargetPx}px`,
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold transition-all border",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/60 hover:bg-muted"
                    )}
                  >
                    <span>{sizeKey}&quot;</span>
                    <span className="text-[9px] font-normal opacity-80">{Math.round(p.widthInches)}in</span>
                  </button>
                );
              })}
            </div>

            <DropdownMenuSeparator className="my-2" />

            {/* Split Screen Zones */}
            <DropdownMenuItem
              onClick={cycleSplitZones}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Columns className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Split Board</span>
              </div>
              <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">
                {splitBoardZones === 1 ? "Off" : `${splitBoardZones} Zones`}
              </span>
            </DropdownMenuItem>

            {/* Simple vs Advanced Mode */}
            <DropdownMenuItem
              onClick={() => {
                setSimpleMode(!simpleMode);
                toast(simpleMode ? "Advanced Mode Enabled" : "Simple Teacher Mode Enabled", {
                  description: simpleMode ? "All widgets & 3D tools visible" : "Clean, distraction-free writing interface",
                });
              }}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium">Simple Teacher Mode</span>
              </div>
              <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">
                {simpleMode ? "On" : "Off"}
              </span>
            </DropdownMenuItem>

            {/* Toggle Board Mode */}
            <DropdownMenuItem
              onClick={() => {
                setBoardMode(!boardMode);
              }}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-foreground" />
                <span className="text-xs font-medium">Board UI Layout</span>
              </div>
              <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">
                {boardMode ? "Active" : "Standard"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1.5" />

            {/* Teacher Fast QR Login */}
            <DropdownMenuItem
              onClick={() => {
                window.dispatchEvent(new CustomEvent("slate:open-teacher-login"));
              }}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-indigo-600 dark:text-indigo-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                <span className="text-xs">Teacher Fast QR Login</span>
              </div>
            </DropdownMenuItem>

            {/* Save Lesson File */}
            <DropdownMenuItem
              onClick={() => {
                exportLessonFile("Classroom Lesson", pages);
              }}
              className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium">Save Lesson (.slate)</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* --- BOTTOM-RIGHT CORNER: Page Navigation & Classroom Sorter --- */}
      <div className="pointer-events-auto select-none absolute bottom-4 right-4 z-40 flex items-center gap-2 rounded-2xl bg-card/95 p-2 shadow-2xl backdrop-blur-md border border-border/80">
        {/* Previous Page */}
        <button
          onClick={prevPage}
          disabled={activePageIndex <= 0}
          className={cn(
            "flex h-14 w-12 items-center justify-center rounded-xl transition-all active:scale-95",
            activePageIndex > 0
              ? "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground"
          )}
          title="Previous Page"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>

        {/* Page Counter Indicator (Large font readable across classroom) */}
        <button
          onClick={() => {
            if (onOpenSorter) onOpenSorter();
          }}
          className="flex h-14 px-3 flex-col items-center justify-center rounded-xl bg-muted/40 hover:bg-muted transition-all"
          title="Page Sorter / Slide Grid"
        >
          <span className="text-xs font-extrabold text-foreground tracking-wider">
            {activePageIndex + 1} / {pages.length}
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold">Pages</span>
        </button>

        {/* Next Page */}
        <button
          onClick={nextPage}
          disabled={activePageIndex >= pages.length - 1}
          className={cn(
            "flex h-14 w-12 items-center justify-center rounded-xl transition-all active:scale-95",
            activePageIndex < pages.length - 1
              ? "bg-muted/70 text-foreground hover:bg-muted"
              : "opacity-40 cursor-not-allowed text-muted-foreground"
          )}
          title="Next Page"
        >
          <ChevronRight className="h-7 w-7" />
        </button>

        {/* Add Page */}
        <button
          onClick={addPage}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95"
          title="Add New Blank Page"
        >
          <Plus className="h-6 w-6" />
          <span className="text-[9px] font-bold">New</span>
        </button>
      </div>
    </>
  );
}

