import React from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { cn } from "@/lib/utils";
import { Pen, Highlighter, Eraser, Undo2, Trash2 } from "lucide-react";
import type { ToolId, CanvasObject } from "@/lib/whiteboard/types";
import { toast } from "sonner";

const ZONE_COLORS = [
  { name: "Black", value: "#111827" },
  { name: "Blue", value: "#2563eb" },
  { name: "Red", value: "#dc2626" },
  { name: "Green", value: "#16a34a" },
];

export function SplitBoardDivider() {
  const {
    splitBoardZones,
    zoneSettings,
    setZoneTool,
    setZoneColor,
    camera,
    pages,
    activePageId,
    pushHistory,
  } = useWhiteboard();

  if (splitBoardZones <= 1) return null;

  const zones = Array.from({ length: splitBoardZones }, (_, i) => i);
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  // Helper to determine if an object belongs to a specific zone
  const isObjectInZone = (obj: CanvasObject, zoneIdx: number) => {
    if (typeof window === "undefined") return false;
    const screenW = window.innerWidth;
    const zoneW = screenW / splitBoardZones;
    const xMinWorld = (zoneIdx * zoneW - camera.x) / camera.zoom;
    const xMaxWorld = ((zoneIdx + 1) * zoneW - camera.x) / camera.zoom;

    if ("points" in obj && Array.isArray((obj as any).points) && (obj as any).points.length > 0) {
      const pts = (obj as any).points as { x: number; y: number }[];
      const avgX = pts.reduce((sum: number, pt: { x: number }) => sum + pt.x, 0) / pts.length;
      return avgX >= xMinWorld && avgX <= xMaxWorld;
    }

    const objX = (obj as any).x ?? 0;
    const objW = (obj as any).w ?? 0;
    const centerX = objX + objW / 2;
    return centerX >= xMinWorld && centerX <= xMaxWorld;
  };

  const handleZoneUndo = (zoneIdx: number) => {
    if (!activePage || !activePage.objects.length) return;

    // Find the last object belonging to this zone
    let targetIndex = -1;
    for (let i = activePage.objects.length - 1; i >= 0; i--) {
      if (isObjectInZone(activePage.objects[i], zoneIdx)) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      toast.info(`Nothing to undo in Zone ${zoneIdx + 1}`);
      return;
    }

    useWhiteboard.setState((state) => {
      const nextPages = state.pages.map((p) => {
        if (p.id !== state.activePageId) return p;
        const newObjs = [...p.objects];
        newObjs.splice(targetIndex, 1);
        return { ...p, objects: newObjs };
      });
      return { ...state, pages: nextPages };
    });

    pushHistory();
    toast.info(`Undid last stroke in Zone ${zoneIdx + 1}`);
  };

  const handleZoneClear = (zoneIdx: number) => {
    if (!activePage || !activePage.objects.length) return;

    useWhiteboard.setState((state) => {
      const nextPages = state.pages.map((p) => {
        if (p.id !== state.activePageId) return p;
        return {
          ...p,
          objects: p.objects.filter((obj) => !isObjectInZone(obj, zoneIdx)),
        };
      });
      return { ...state, pages: nextPages };
    });

    pushHistory();
    toast.info(`Cleared all strokes in Zone ${zoneIdx + 1}`);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex">
      {zones.map((zoneIdx, idx) => {
        const isLast = idx === zones.length - 1;
        const currentSetting = zoneSettings?.[zoneIdx] || {
          tool: "pen",
          color: ZONE_COLORS[zoneIdx % ZONE_COLORS.length].value,
          size: 3,
        };

        return (
          <div
            key={zoneIdx}
            className={cn(
              "relative flex-1 h-full",
              !isLast && "border-r-2 border-dashed border-primary/30"
            )}
          >
            {/* Zone Control Pill */}
            <div className="pointer-events-auto absolute top-20 left-4 sm:left-6 flex items-center gap-1.5 rounded-2xl bg-card/95 px-3 py-1.5 shadow-md border border-border text-xs font-semibold backdrop-blur-md">
              <span className="font-bold text-foreground">Zone {zoneIdx + 1}</span>
              <div className="h-4 w-px bg-border/60 mx-0.5" />

              {/* Tool toggle: Pen, Highlighter, Eraser */}
              <div className="flex items-center gap-1">
                {(["pen", "highlighter", "eraser-object"] as ToolId[]).map((t) => {
                  const isActive = currentSetting.tool === t;
                  const Icon = t === "pen" ? Pen : t === "highlighter" ? Highlighter : Eraser;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setZoneTool(zoneIdx, t)}
                      className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title={`Zone ${zoneIdx + 1}: ${t}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
              <div className="h-4 w-px bg-border/60 mx-0.5" />

              {/* Color choices */}
              <div className="flex items-center gap-1">
                {ZONE_COLORS.map((c) => {
                  const isActive = currentSetting.color.toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setZoneColor(zoneIdx, c.value)}
                      className={cn(
                        "h-5 w-5 rounded-full transition-transform active:scale-90 border cursor-pointer",
                        isActive ? "scale-110 ring-2 ring-primary ring-offset-1" : "opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={`Zone ${zoneIdx + 1}: ${c.name}`}
                    />
                  );
                })}
              </div>

              <div className="h-4 w-px bg-border/60 mx-0.5" />

              {/* Dedicated Zone Undo & Clear */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleZoneUndo(zoneIdx)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition active:scale-95 cursor-pointer"
                  title={`Undo last action in Zone ${zoneIdx + 1}`}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoneClear(zoneIdx)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition active:scale-95 cursor-pointer"
                  title={`Clear only Zone ${zoneIdx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

