import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Grid,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { cn } from "@/lib/utils";

interface PageSorterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageSorterDialog({ open, onOpenChange }: PageSorterDialogProps) {
  const {
    pages,
    activePageId,
    setActivePage,
    addPage,
    removePage,
    setObjects,
    pushHistory,
  } = useWhiteboard();

  const handleDuplicatePage = (pageId: string) => {
    const srcPage = pages.find((p) => p.id === pageId);
    if (!srcPage) return;
    const newId = Math.random().toString(36).slice(2, 10);
    const newObjects = srcPage.objects.map((o) => ({
      ...o,
      id: Math.random().toString(36).slice(2, 10),
    }));

    useWhiteboard.setState((prev) => {
      const idx = prev.pages.findIndex((p) => p.id === pageId);
      const newPages = [...prev.pages];
      newPages.splice(idx + 1, 0, {
        id: newId,
        background: srcPage.background,
        objects: newObjects,
      });
      return {
        ...prev,
        pages: newPages,
        activePageId: newId,
      };
    });
    pushHistory();
  };

  const handleMovePage = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    useWhiteboard.setState((prev) => {
      const newPages = [...prev.pages];
      const [moved] = newPages.splice(index, 1);
      newPages.splice(targetIdx, 0, moved);
      return {
        ...prev,
        pages: newPages,
      };
    });
    pushHistory();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] rounded-3xl bg-card p-6 shadow-2xl border border-border flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Layers className="h-6 w-6" />
              <DialogTitle className="text-xl font-extrabold text-foreground">
                Lesson Page Sorter & Slide Grid
              </DialogTitle>
            </div>
            <button
              onClick={() => addPage()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Blank Page
            </button>
          </div>
        </DialogHeader>

        {/* Thumbnail Grid */}
        <div className="flex-1 overflow-y-auto py-4 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pages.map((p, idx) => {
              const isActive = p.id === activePageId;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border-2 p-2.5 transition-all bg-muted/20 select-none",
                    isActive
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30"
                      : "border-border/80 hover:border-primary/50 hover:bg-muted/40"
                  )}
                >
                  {/* Thumbnail Card */}
                  <div
                    onClick={() => {
                      setActivePage(p.id);
                      onOpenChange(false);
                    }}
                    className="relative flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl bg-background border border-border/60 shadow-inner overflow-hidden"
                  >
                    <span className="text-xs font-black text-foreground">
                      Slide {idx + 1}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {p.objects.length} items · {p.background}
                    </span>
                  </div>

                  {/* Page Controls Toolbar */}
                  <div className="mt-2 flex items-center justify-between px-1 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMovePage(idx, -1)}
                        disabled={idx === 0}
                        className="rounded p-1 hover:bg-muted hover:text-foreground disabled:opacity-30"
                        title="Move left / earlier"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMovePage(idx, 1)}
                        disabled={idx === pages.length - 1}
                        className="rounded p-1 hover:bg-muted hover:text-foreground disabled:opacity-30"
                        title="Move right / later"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicatePage(p.id)}
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                        title="Duplicate slide"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {pages.length > 1 && (
                        <button
                          onClick={() => removePage(p.id)}
                          className="rounded p-1 hover:bg-rose-500/10 hover:text-rose-500"
                          title="Delete slide"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

