import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, RotateCcw, FastForward, Film, X } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { FreehandStroke, PageBackground } from "@/lib/whiteboard/types";
import { cn } from "@/lib/utils";

interface LessonReplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonReplayDialog({ open, onOpenChange }: LessonReplayDialogProps) {
  const { pages, activePageId } = useWhiteboard();
  const { t } = useTranslation();

  const activePage = pages.find((p) => p.id === activePageId);
  const strokes = (activePage?.objects.filter((o) => "points" in o && Array.isArray((o as any).points)) || []) as FreehandStroke[];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  // Total points across all strokes to calculate smooth playback steps
  const totalPoints = strokes.reduce((acc, s) => acc + (s.points?.length || 0), 0);

  // Redraw canvas up to current progress
  const renderFrame = (pct: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw page background
    drawBackground(ctx, w, h, activePage.background);

    if (strokes.length === 0 || totalPoints === 0) return;

    // Determine how many points to draw
    const targetPoints = Math.round((pct / 100) * totalPoints);
    let drawnPoints = 0;

    for (const stroke of strokes) {
      if (drawnPoints >= targetPoints) break;
      const pts = stroke.points || [];
      if (pts.length === 0) continue;

      const strokePointsLimit = Math.min(pts.length, targetPoints - drawnPoints);
      if (strokePointsLimit < 2) {
        drawnPoints += strokePointsLimit;
        continue;
      }

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.kind === "highlighter") {
        ctx.globalAlpha = 0.35;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < strokePointsLimit; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.restore();

      drawnPoints += strokePointsLimit;
    }
  };

  // Setup canvas resolution and initial frame
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = (rect.width || 800) * dpr;
    canvas.height = (rect.height || 500) * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    renderFrame(progress);
  }, [open]);

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying || !open) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      // Base step: advance through points (~60 points per sec at 1x)
      const pointsPerSec = 75 * speed;
      const pointsToAdd = (pointsPerSec * dt) / 1000;
      const pctStep = totalPoints > 0 ? (pointsToAdd / totalPoints) * 100 : 1;

      setProgress((prev) => {
        const next = Math.min(100, prev + pctStep);
        renderFrame(next);
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed, totalPoints, open]);

  function handleScrub(newPct: number) {
    setProgress(newPct);
    renderFrame(newPct);
  }

  function handleRestart() {
    setProgress(0);
    renderFrame(0);
    setIsPlaying(true);
  }

  function togglePlay() {
    if (progress >= 100) {
      handleRestart();
    } else {
      setIsPlaying((p) => !p);
    }
  }

  function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, bg: PageBackground) {
    if (bg === "blackboard") {
      ctx.fillStyle = "#1b382b";
      ctx.fillRect(0, 0, w, h);
    } else if (bg === "dark" || bg === "oled") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-4xl p-4 sm:p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-3"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex flex-row items-center justify-between pb-1 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Film className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">{t("lessonReplay")}</DialogTitle>
              <p className="text-xs text-muted-foreground">{t("lessonReplayDesc")}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Replay Viewport */}
        <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-inner">
          <canvas ref={canvasRef} className="h-full w-full object-contain" />
          {strokes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              No strokes drawn on this page yet.
            </div>
          )}
        </div>

        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={progress}
            onChange={(e) => handleScrub(parseFloat(e.target.value))}
            className="w-full accent-primary h-2 cursor-pointer rounded-lg bg-muted"
            aria-label="Replay timeline progress"
          />
          <span className="text-xs font-mono font-medium text-muted-foreground w-12 text-right">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Playback Controls Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition active:scale-95 shadow-sm"
              title={isPlaying ? t("pause") : t("play")}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  <span>{t("pause")}</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>{t("play")}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition active:scale-95"
              title={t("restart")}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">{t("speed")}:</span>
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95",
                  speed === s
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
