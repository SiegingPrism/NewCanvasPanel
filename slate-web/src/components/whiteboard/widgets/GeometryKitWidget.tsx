import React, { useState, useEffect } from "react";
import { Compass, Triangle, RotateCw, Plus, Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { cn } from "@/lib/utils";
import {
  registerGuideSegment,
  unregisterGuideSegment,
  registerGuideCircle,
  unregisterGuideCircle,
} from "@/lib/whiteboard/geometryGuides";

export function GeometryKitWidget() {
  const { addObject, pushHistory, color, size, camera } = useWhiteboard();
  const [tab, setTab] = useState<"compass" | "setsquare">("compass");

  // Compass state
  const [compassRadius, setCompassRadius] = useState(140);
  const [arcDegrees, setArcDegrees] = useState(360);

  // Set-square state
  const [squareType, setSquareType] = useState<"45" | "30-60">("30-60");
  const [squareScale, setSquareScale] = useState(180);
  const [squareAngle, setSquareAngle] = useState(0);

  // Register interactive snapping edges for ink drawing
  useEffect(() => {
    if (tab === "compass") {
      const cx = -camera.x / camera.zoom + 300;
      const cy = -camera.y / camera.zoom + 260;
      registerGuideCircle("compass", cx, cy, compassRadius);
      return () => {
        unregisterGuideCircle("compass");
      };
    } else {
      const sx = -camera.x / camera.zoom + 250;
      const sy = -camera.y / camera.zoom + 200;
      const w = squareScale;
      const h = squareType === "45" ? squareScale : Math.round(squareScale * 0.577);
      const rad = (squareAngle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const p1 = { x: sx, y: sy };
      const p2 = { x: sx + w * cos, y: sy + w * sin };
      const p3 = { x: sx - h * sin, y: sy + h * cos };
      registerGuideSegment("setsquare-leg1", p1.x, p1.y, p2.x, p2.y);
      registerGuideSegment("setsquare-leg2", p1.x, p1.y, p3.x, p3.y);
      registerGuideSegment("setsquare-hyp", p2.x, p2.y, p3.x, p3.y);
      return () => {
        unregisterGuideSegment("setsquare-leg1");
        unregisterGuideSegment("setsquare-leg2");
        unregisterGuideSegment("setsquare-hyp");
      };
    }
  }, [tab, compassRadius, squareScale, squareAngle, squareType, camera.x, camera.y, camera.zoom]);

  const drawCompassCircle = () => {
    const cx = -camera.x / camera.zoom + 300;
    const cy = -camera.y / camera.zoom + 260;

    if (arcDegrees >= 360) {
      addObject({
        id: Math.random().toString(36).slice(2, 10),
        kind: "shape",
        shape: "circle",
        x: cx - compassRadius,
        y: cy - compassRadius,
        w: compassRadius * 2,
        h: compassRadius * 2,
        color,
        size,
      });
    } else {
      // Build arc points
      const points = [];
      const steps = Math.max(12, Math.round(arcDegrees / 6));
      for (let i = 0; i <= steps; i++) {
        const rad = ((i / steps) * arcDegrees * Math.PI) / 180;
        points.push({
          x: cx + Math.cos(rad) * compassRadius,
          y: cy + Math.sin(rad) * compassRadius,
        });
      }
      addObject({
        id: Math.random().toString(36).slice(2, 10),
        kind: "pen",
        color,
        size,
        points,
      });
    }
    pushHistory();
  };

  const stampSetSquare = () => {
    const sx = -camera.x / camera.zoom + 250;
    const sy = -camera.y / camera.zoom + 200;

    const w = squareType === "45" ? squareScale : squareScale * 1.73;
    const h = squareScale;

    addObject({
      id: Math.random().toString(36).slice(2, 10),
      kind: "shape",
      shape: "right-triangle",
      x: sx,
      y: sy,
      w,
      h,
      color,
      size,
    });
    pushHistory();
  };

  return (
    <div className="w-80 select-none space-y-3 p-1">
      {/* Tabs */}
      <div className="flex rounded-xl bg-muted/60 p-1">
        <button
          onClick={() => setTab("compass")}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "compass" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Compass className="h-3.5 w-3.5 inline mr-1" />
          Compass (Arcs)
        </button>
        <button
          onClick={() => setTab("setsquare")}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "setsquare" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Triangle className="h-3.5 w-3.5 inline mr-1" />
          Set-Square
        </button>
      </div>

      {tab === "compass" ? (
        <div className="space-y-3">
          {/* Compass Graphic Preview */}
          <div className="flex h-36 w-full items-center justify-center rounded-xl bg-muted/30 border border-border relative overflow-hidden">
            <svg className="h-32 w-32" viewBox="0 0 100 100">
              {/* Compass Needle */}
              <line x1="50" y1="20" x2="35" y2="85" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
              {/* Compass Pencil Arm */}
              <line x1="50" y1="20" x2="65" y2="85" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              {/* Hinge */}
              <circle cx="50" cy="20" r="5" fill="#1e293b" />
              {/* Radius line */}
              <line x1="35" y1="85" x2="65" y2="85" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" />
              {/* Drawn Arc */}
              <path
                d="M 65 85 A 30 30 0 0 1 35 85"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </svg>
            <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold text-muted-foreground">
              R = {compassRadius}px · {arcDegrees}°
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Compass Radius:</span>
                <span className="font-bold">{compassRadius} px</span>
              </div>
              <Slider
                value={[compassRadius]}
                min={40}
                max={350}
                step={5}
                onValueChange={([v]) => setCompassRadius(v)}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Sweep Arc Angle:</span>
                <span className="font-bold">{arcDegrees}°</span>
              </div>
              <Slider
                value={[arcDegrees]}
                min={30}
                max={360}
                step={15}
                onValueChange={([v]) => setArcDegrees(v)}
              />
            </div>
          </div>

          <button
            onClick={drawCompassCircle}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Draw {arcDegrees >= 360 ? "Circle" : `${arcDegrees}° Arc`} on Board
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setSquareType("30-60")}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all",
                squareType === "30-60" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
              )}
            >
              30° - 60° - 90°
            </button>
            <button
              onClick={() => setSquareType("45")}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all",
                squareType === "45" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
              )}
            >
              45° - 45° - 90°
            </button>
          </div>

          <div className="flex h-36 w-full items-center justify-center rounded-xl bg-muted/30 border border-border relative">
            <svg className="h-28 w-44" viewBox="0 0 160 100">
              <polygon
                points={squareType === "45" ? "20,80 100,80 20,0" : "15,85 145,85 15,10"}
                fill="rgba(56, 189, 248, 0.15)"
                stroke="#0284c7"
                strokeWidth="2"
              />
              {/* Millimeter ticks */}
              {Array.from({ length: 10 }).map((_, i) => (
                <line key={i} x1={25 + i * 11} y1="80" x2={25 + i * 11} y2="74" stroke="#0369a1" strokeWidth="1" />
              ))}
            </svg>
            <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold text-muted-foreground">
              {squareType} Set-Square
            </span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Size Scale:</span>
              <span className="font-bold">{squareScale} px</span>
            </div>
            <Slider
              value={[squareScale]}
              min={100}
              max={350}
              step={10}
              onValueChange={([v]) => setSquareScale(v)}
            />
          </div>

          <button
            onClick={stampSetSquare}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Stamp Set-Square on Board
          </button>
        </div>
      )}
    </div>
  );
}

