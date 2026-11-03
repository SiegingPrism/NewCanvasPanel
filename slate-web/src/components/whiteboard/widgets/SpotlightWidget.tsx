import React, { useState, useRef, useEffect } from "react";
import { Circle, Square, Sun, X, Eye, EyeOff, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function SpotlightWidget({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<"spotlight" | "shade">("spotlight");
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [radius, setRadius] = useState(180);
  const [opacity, setOpacity] = useState(0.8);
  const [shadeY, setShadeY] = useState(window.innerHeight * 0.4);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; origPos: { x: number; y: number } } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origPos: { ...pos },
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPos({
      x: Math.max(radius, Math.min(window.innerWidth - radius, dragStartRef.current.origPos.x + dx)),
      y: Math.max(radius, Math.min(window.innerHeight - radius, dragStartRef.current.origPos.y + dy)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden">
      {/* Dimmed Ambient Mask */}
      {mode === "spotlight" ? (
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          <defs>
            <mask id="spotlight-mask">
              {/* White background = show dim */}
              <rect width="100%" height="100%" fill="white" />
              {/* Black circle = cutout hole */}
              <circle cx={pos.x} cy={pos.y} r={radius} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="#090d16"
            fillOpacity={opacity}
            mask="url(#spotlight-mask)"
          />
          {/* Spotlight Rim Ring */}
          <circle
            cx={pos.x}
            cy={pos.y}
            r={radius}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeDasharray="6 4"
            className="animate-pulse opacity-70"
          />
        </svg>
      ) : (
        /* Screen Shade / Reveal Curtain Mode */
        <div className="absolute inset-0 pointer-events-none">
          {/* Top hidden section */}
          <div
            className="absolute inset-x-0 bottom-0 bg-[#090d16] transition-all"
            style={{
              top: `${shadeY}px`,
              opacity,
            }}
          />
          {/* Shade Drag Handle Bar */}
          <div
            onPointerDown={(e) => {
              const startY = e.clientY;
              const origY = shadeY;
              const onMove = (me: PointerEvent) => {
                setShadeY(Math.max(80, Math.min(window.innerHeight - 80, origY + (me.clientY - startY))));
              };
              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
            className="pointer-events-auto absolute inset-x-0 h-7 flex items-center justify-center bg-sky-600/90 hover:bg-sky-500 cursor-ns-resize shadow-lg transition-colors"
            style={{ top: `${shadeY - 14}px` }}
          >
            <div className="h-1.5 w-24 rounded-full bg-white/70" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider ml-3">
              Drag to reveal solutions
            </span>
          </div>
        </div>
      )}

      {/* Draggable Spotlight Lens Handle (allows moving the circle anywhere) */}
      {mode === "spotlight" && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="pointer-events-auto absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            left: `${pos.x - 30}px`,
            top: `${pos.y - 30}px`,
            width: "60px",
            height: "60px",
          }}
          title="Drag to move spotlight"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card/85 text-primary shadow-xl border border-border backdrop-blur-md opacity-40 hover:opacity-100 transition-opacity">
            <Sun className="h-5 w-5" />
          </div>
        </div>
      )}

      {/* Floating Control Hub */}
      <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-card/95 p-2.5 shadow-2xl border border-border backdrop-blur-md">
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => setMode("spotlight")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              mode === "spotlight" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Circle className="h-4 w-4" />
            Spotlight
          </button>
          <button
            onClick={() => setMode("shade")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              mode === "shade" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Square className="h-4 w-4" />
            Screen Shade
          </button>
        </div>

        {mode === "spotlight" && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Size:</span>
            <Slider
              value={[radius]}
              min={100}
              max={450}
              step={10}
              onValueChange={([v]) => setRadius(v)}
              className="w-24"
            />
          </div>
        )}

        <div className="flex items-center gap-2 px-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Dim:</span>
          <Slider
            value={[opacity * 100]}
            min={40}
            max={95}
            step={5}
            onValueChange={([v]) => setOpacity(v / 100)}
            className="w-20"
          />
        </div>

        <button
          onClick={() => {
            if (onClose) onClose();
            else window.dispatchEvent(new CustomEvent("slate:close-spotlight"));
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted hover:bg-destructive hover:text-white transition-colors"
          title="Exit Spotlight"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

