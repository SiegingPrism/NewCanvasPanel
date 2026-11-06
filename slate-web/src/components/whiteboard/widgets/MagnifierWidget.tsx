import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, X, Crosshair, Move } from "lucide-react";
import { cn } from "@/lib/utils";

export function MagnifierWidget({ onClose }: { onClose?: () => void }) {
  const [lensPos, setLensPos] = useState({ x: 300, y: 300 });
  const [zoomLevel, setZoomLevel] = useState<2 | 3 | 4>(2);
  const [showCrosshairs, setShowCrosshairs] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Update magnified slice from the main whiteboard canvas
  useEffect(() => {
    let animId: number;
    const updateMagnifier = () => {
      const targetCanvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      const lensCanvas = canvasRef.current;
      if (targetCanvas && lensCanvas) {
        const ctx = lensCanvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const size = 240;
          lensCanvas.width = size * dpr;
          lensCanvas.height = size * dpr;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.imageSmoothingEnabled = false;

          const rect = targetCanvas.getBoundingClientRect();
          const sourceX = (lensPos.x - rect.left) * dpr;
          const sourceY = (lensPos.y - rect.top) * dpr;
          const sampleSize = (size / zoomLevel) * dpr;

          ctx.clearRect(0, 0, size, size);
          try {
            ctx.drawImage(
              targetCanvas,
              sourceX - sampleSize / 2,
              sourceY - sampleSize / 2,
              sampleSize,
              sampleSize,
              0,
              0,
              size,
              size,
            );
          } catch {}

          if (showCrosshairs) {
            ctx.strokeStyle = "rgba(14, 165, 233, 0.6)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(size / 2, 0);
            ctx.lineTo(size / 2, size);
            ctx.moveTo(0, size / 2);
            ctx.lineTo(size, size / 2);
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(updateMagnifier);
    };
    animId = requestAnimationFrame(updateMagnifier);
    return () => cancelAnimationFrame(animId);
  }, [lensPos, zoomLevel, showCrosshairs]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - lensPos.x,
      y: e.clientY - lensPos.y,
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    setLensPos({
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y,
    });
  };

  const onPointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className="pointer-events-auto absolute z-40 flex flex-col items-center select-none"
      style={{
        left: `${lensPos.x - 120}px`,
        top: `${lensPos.y - 120}px`,
      }}
    >
      {/* Magnifier Lens Body */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative h-60 w-60 rounded-full border-4 border-sky-500 bg-background/90 shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing backdrop-blur-md ring-4 ring-sky-500/20"
      >
        <canvas ref={canvasRef} className="h-full w-full rounded-full" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-sky-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          {zoomLevel}x Magnifier
        </div>
      </div>

      {/* Control Strip */}
      <div className="mt-2 flex items-center gap-1.5 rounded-full bg-card/95 p-1.5 shadow-xl border border-border backdrop-blur-md">
        <button
          onClick={() => setZoomLevel(2)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold transition-all",
            zoomLevel === 2
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          2x
        </button>
        <button
          onClick={() => setZoomLevel(3)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold transition-all",
            zoomLevel === 3
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          3x
        </button>
        <button
          onClick={() => setZoomLevel(4)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold transition-all",
            zoomLevel === 4
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          4x
        </button>
        <button
          onClick={() => setShowCrosshairs(!showCrosshairs)}
          className={cn(
            "rounded-full p-1.5 transition-all",
            showCrosshairs ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted",
          )}
          title="Toggle crosshairs"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive hover:text-white transition-all"
            title="Close magnifier"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
