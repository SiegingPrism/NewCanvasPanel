import React from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { cn } from "@/lib/utils";

export function SplitBoardDivider() {
  const { splitBoardZones } = useWhiteboard();

  if (splitBoardZones <= 1) return null;

  const zones = Array.from({ length: splitBoardZones }, (_, i) => i + 1);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex">
      {zones.map((zoneNumber, idx) => {
        const isLast = idx === zones.length - 1;
        return (
          <div
            key={zoneNumber}
            className={cn(
              "relative flex-1 h-full",
              !isLast && "border-r-2 border-dashed border-primary/30"
            )}
          >
            {/* Zone Header Badge */}
            <div className="absolute top-3 left-4 flex items-center gap-1.5 rounded-full bg-card/85 px-3 py-1 shadow-sm border border-border/80 text-[11px] font-bold text-muted-foreground backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>Zone {zoneNumber}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

